import logging
import numpy as np
import pandas as pd

logger = logging.getLogger("ml_platform.feature_pipeline")

class FeatureEngineeringPipeline:
    def __init__(self):
        pass

    def generate_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Dynamically generates advanced ML features from 1-min telemetry aggregates.
        """
        if df.empty:
            return df

        df = df.sort_values("time_bucket").copy()

        # Fill numeric NaNs forward/backward
        numeric_cols = [
            "temperature_ds18b20_avg",
            "temperature_dht11_avg",
            "temperature_tmp36_avg",
            "humidity_dht11_avg",
            "mq135_avg",
            "sample_count",
        ]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").ffill().bfill().fillna(0.0)

        # 1. LAG FEATURES (1m, 5m, 10m, 30m)
        lag_targets = ["temperature_ds18b20_avg", "humidity_dht11_avg", "mq135_avg"]
        lag_steps = [1, 5, 10, 30]

        for target in lag_targets:
            for step in lag_steps:
                df[f"{target}_lag_{step}m"] = df[target].shift(step)

        # 2. ROLLING FEATURES (5m, 15m, 60m windows)
        rolling_windows = [5, 15, 60]
        for target in lag_targets:
            for window in rolling_windows:
                roll = df[target].rolling(window=window, min_periods=1)
                df[f"{target}_roll_mean_{window}m"] = roll.mean()
                df[f"{target}_roll_min_{window}m"] = roll.min()
                df[f"{target}_roll_max_{window}m"] = roll.max()
                df[f"{target}_roll_std_{window}m"] = roll.std().fillna(0.0)
                df[f"{target}_roll_var_{window}m"] = roll.var().fillna(0.0)

        # 3. TREND FEATURES (Diffs, Slopes & % Change)
        for target in lag_targets:
            df[f"{target}_diff_1m"] = df[target] - df[f"{target}_lag_1m"]
            df[f"{target}_diff_5m"] = df[target] - df[f"{target}_lag_5m"]
            df[f"{target}_pct_change_5m"] = (
                (df[target] - df[f"{target}_lag_5m"]) / (df[f"{target}_lag_5m"] + 1e-5)
            ) * 100.0
            # Linear slope over 5 minutes
            df[f"{target}_slope_5m"] = (df[target] - df[f"{target}_lag_5m"]) / 5.0

        # 4. SENSOR CONSISTENCY & DISAGREEMENT FEATURES
        # DS18B20 vs DHT11 vs TMP36
        df["temp_disagreement_ds_dht"] = (
            df["temperature_ds18b20_avg"] - df["temperature_dht11_avg"]
        ).abs()
        df["temp_disagreement_ds_tmp"] = (
            df["temperature_ds18b20_avg"] - df["temperature_tmp36_avg"]
        ).abs()
        df["temp_sensors_mean"] = df[
            ["temperature_ds18b20_avg", "temperature_dht11_avg", "temperature_tmp36_avg"]
        ].mean(axis=1)
        df["temp_sensors_variance"] = df[
            ["temperature_ds18b20_avg", "temperature_dht11_avg", "temperature_tmp36_avg"]
        ].var(axis=1).fillna(0.0)

        # 5. CROSS-SENSOR RELATIONSHIP FEATURES
        df["humidity_gas_ratio"] = df["humidity_dht11_avg"] / (df["mq135_avg"] + 1e-5)
        df["temp_gas_ratio"] = df["temperature_ds18b20_avg"] / (df["mq135_avg"] + 1e-5)
        df["temp_humidity_product"] = df["temperature_ds18b20_avg"] * df["humidity_dht11_avg"]

        # 6. TIME FEATURES
        if "time_bucket" in df.columns:
            df["hour"] = df["time_bucket"].dt.hour
            df["minute"] = df["time_bucket"].dt.minute
            df["day_of_week"] = df["time_bucket"].dt.dayofweek
            df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
            df["month"] = df["time_bucket"].dt.month

        # 7. QUALITY & METADATA FEATURES
        if "data_quality" in df.columns:
            quality_map = {"good": 1.0, "partial": 0.5, "poor": 0.0}
            df["data_quality_numeric"] = df["data_quality"].map(quality_map).fillna(1.0)
        else:
            df["data_quality_numeric"] = 1.0

        # Replace infs and NaNs resulting from shifts
        df = df.replace([np.inf, -np.inf], np.nan).fillna(0.0)

        logger.info(f"Generated {len(df.columns)} ML features successfully.")
        return df

if __name__ == "__main__":
    from database.db_loader import DataLoader
    loader = DataLoader()
    raw = loader.load_historical_aggregates(limit=100)
    pipeline = FeatureEngineeringPipeline()
    feat_df = pipeline.generate_features(raw)
    print("Feature Columns Generated:", len(feat_df.columns))
