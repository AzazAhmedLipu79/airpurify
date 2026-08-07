import logging
import pandas as pd
import numpy as np

logger = logging.getLogger("ml_platform.drift_monitor")

class PredictionDriftMonitor:
    def __init__(self):
        self.history = []

    def log_prediction(self, prediction_id: str, target_name: str, predicted_val: float, timestamp: str, model_version: str):
        """
        Logs a prediction for future evaluation against actual ground truth.
        """
        record = {
            "prediction_id": prediction_id,
            "target_name": target_name,
            "predicted_val": predicted_val,
            "actual_val": None,
            "timestamp": timestamp,
            "model_version": model_version,
            "evaluated": False,
        }
        self.history.append(record)
        return record

    def update_actual_value(self, prediction_id: str, actual_val: float):
        """
        Updates an existing prediction record with actual observed measurement.
        """
        for rec in self.history:
            if rec["prediction_id"] == prediction_id:
                rec["actual_val"] = actual_val
                rec["error"] = abs(predicted_val - actual_val) if (predicted_val := rec["predicted_val"]) is not None else 0.0
                rec["evaluated"] = True
                break

    def calculate_drift_metrics(self, target_name: str = None) -> dict:
        """
        Calculates rolling MAE, RMSE, and evaluates model performance degradation.
        """
        evaluated_records = [
            r for r in self.history
            if r["evaluated"] and r["actual_val"] is not None and (target_name is None or r["target_name"] == target_name)
        ]

        if not evaluated_records:
            return {
                "evaluated_count": 0,
                "rolling_mae": 0.0,
                "rolling_rmse": 0.0,
                "model_status": "Healthy (Insufficient Evaluation Logs)",
                "drift_detected": False,
            }

        preds = np.array([r["predicted_val"] for r in evaluated_records])
        actuals = np.array([r["actual_val"] for r in evaluated_records])

        mae = float(np.mean(np.abs(preds - actuals)))
        rmse = float(np.sqrt(np.mean((preds - actuals) ** 2)))

        drift_detected = mae > 50.0  # Threshold boundary for degradation alert

        return {
            "evaluated_count": len(evaluated_records),
            "rolling_mae": round(mae, 4),
            "rolling_rmse": round(rmse, 4),
            "model_status": "Degraded / Drift Detected" if drift_detected else "Healthy",
            "drift_detected": drift_detected,
        }

if __name__ == "__main__":
    monitor = PredictionDriftMonitor()
    monitor.log_prediction("pred_001", "mq135_avg", 145.0, "2026-08-06 12:00:00", "v_1")
    monitor.update_actual_value("pred_001", 148.2)
    metrics = monitor.calculate_drift_metrics("mq135_avg")
    print("Drift Metrics:", metrics)
