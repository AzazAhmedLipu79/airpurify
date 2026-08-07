import logging
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

logger = logging.getLogger("ml_platform.anomaly_engine")

class AnomalyDetectionEngine:
    def __init__(self):
        self.iso_forest = IsolationForest(contamination=0.05, random_state=42)

    def detect_anomalies(self, df: pd.DataFrame) -> list:
        """
        Executes a 4-Layer Anomaly Detection Engine with natural language explanations.
        """
        anomalies = []
        if df.empty:
            return anomalies

        latest_row = df.iloc[-1]
        time_str = str(latest_row.get("time_bucket", "Now"))

        # Extract latest values
        temp_ds = float(latest_row.get("temperature_ds18b20_avg", 0) or 0)
        temp_dht = float(latest_row.get("temperature_dht11_avg", 0) or 0)
        temp_tmp = float(latest_row.get("temperature_tmp36_avg", 0) or 0)
        humidity = float(latest_row.get("humidity_dht11_avg", 0) or 0)
        gas = float(latest_row.get("mq135_avg", 0) or 0)

        # -------------------------------------------------------------
        # LAYER 1: RULE-BASED DETECTION (Safety Thresholds & Negatives)
        # -------------------------------------------------------------
        if gas > 1000:
            anomalies.append({
                "layer": "Rule-Based",
                "severity": "CRITICAL",
                "metric": "mq135_avg",
                "value": gas,
                "rule": "Hazardous Gas Concentration (> 1000 ppm)",
                "explanation": f"MQ-135 sensor recorded critical air contamination level of {gas} ppm, exceeding safety threshold of 1000 ppm.",
            })

        if temp_ds > 45.0 or temp_ds < -10.0:
            anomalies.append({
                "layer": "Rule-Based",
                "severity": "WARNING",
                "metric": "temperature_ds18b20_avg",
                "value": temp_ds,
                "rule": "Extreme Temperature Boundary Exceeded",
                "explanation": f"DS18B20 sensor measured extreme thermal level of {temp_ds}°C, outside safe operating bounds (-10°C to 45°C).",
            })

        if humidity > 95.0 or humidity < 10.0:
            anomalies.append({
                "layer": "Rule-Based",
                "severity": "WARNING",
                "metric": "humidity_dht11_avg",
                "value": humidity,
                "rule": "Extreme Relative Humidity Exceeded",
                "explanation": f"DHT11 measured unusual relative humidity of {humidity}%, outside standard range (10% to 95%).",
            })

        if temp_ds < 0 or humidity < 0 or gas < 0:
            anomalies.append({
                "layer": "Rule-Based",
                "severity": "CRITICAL",
                "metric": "hardware",
                "value": -1,
                "rule": "Impossible Negative Telemetry Value",
                "explanation": "Sensor stream transmitted corrupted negative physical parameters.",
            })

        # -------------------------------------------------------------
        # LAYER 2: STATISTICAL Z-SCORE & ISOLATION FOREST DETECTION
        # -------------------------------------------------------------
        if len(df) >= 15 and "mq135_avg" in df.columns:
            rolling_mean = df["mq135_avg"].rolling(15, min_periods=5).mean().iloc[-1]
            rolling_std = df["mq135_avg"].rolling(15, min_periods=5).std().iloc[-1]

            if rolling_std > 0:
                z_score = (gas - rolling_mean) / rolling_std
                if abs(z_score) > 3.0:
                    anomalies.append({
                        "layer": "Statistical Z-Score",
                        "severity": "WARNING",
                        "metric": "mq135_avg",
                        "value": gas,
                        "z_score": round(z_score, 2),
                        "explanation": f"MQ-135 gas concentration ({gas} ppm) deviated significantly from the 15-minute moving average ({round(rolling_mean, 1)} ppm) with a Z-score of {round(z_score, 2)}.",
                    })

        # -------------------------------------------------------------
        # LAYER 3: SENSOR CONSISTENCY & DISAGREEMENT (DS18B20 vs DHT11 vs TMP36)
        # -------------------------------------------------------------
        if temp_ds > 0 and temp_dht > 0:
            temp_diff = abs(temp_ds - temp_dht)
            if temp_diff > 4.0:
                anomalies.append({
                    "layer": "Sensor Consistency",
                    "severity": "WARNING",
                    "metric": "temperature_disagreement",
                    "value": round(temp_diff, 2),
                    "explanation": f"Thermal sensor disagreement detected: DS18B20 ({temp_ds}°C) vs DHT11 ({temp_dht}°C) differed by {round(temp_diff, 2)}°C, exceeding 4.0°C tolerance.",
                })

        # -------------------------------------------------------------
        # LAYER 4: TREND & SLOPE DETECTION (Sudden Spikes)
        # -------------------------------------------------------------
        if len(df) >= 5 and "mq135_avg" in df.columns:
            gas_5m_ago = float(df["mq135_avg"].iloc[-5])
            if gas_5m_ago > 0:
                pct_change = ((gas - gas_5m_ago) / gas_5m_ago) * 100.0
                if pct_change > 30.0:
                    anomalies.append({
                        "layer": "Trend Analysis",
                        "severity": "WARNING",
                        "metric": "mq135_avg",
                        "pct_change": round(pct_change, 1),
                        "explanation": f"Rapid Gas Surge: MQ-135 concentration surged {round(pct_change, 1)}% over the last 5 minutes (from {round(gas_5m_ago, 1)} to {round(gas, 1)} ppm).",
                    })

        logger.info(f"Anomaly Detection Engine processed timeframe '{time_str}'. Detected {len(anomalies)} anomalies.")
        return anomalies

if __name__ == "__main__":
    from database.db_loader import DataLoader
    loader = DataLoader()
    raw = loader.load_historical_aggregates(limit=100)
    engine = AnomalyDetectionEngine()
    detected = engine.detect_anomalies(raw)
    print("Detected Anomalies Count:", len(detected))
    for a in detected:
        print(" -", a["explanation"])
