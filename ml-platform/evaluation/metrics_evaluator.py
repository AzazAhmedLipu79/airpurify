import logging
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

logger = logging.getLogger("ml_platform.evaluation")

class MetricsEvaluator:
    def __init__(self):
        pass

    def evaluate(self, y_true: pd.Series, y_pred: np.ndarray) -> dict:
        """
        Calculates MAE, RMSE, R², and MAPE metrics.
        """
        mae = float(mean_absolute_error(y_true, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
        r2 = float(r2_score(y_true, y_pred))

        # Handle division by zero for MAPE
        non_zero = y_true != 0
        if np.any(non_zero):
            mape = float(np.mean(np.abs((y_true[non_zero] - y_pred[non_zero]) / y_true[non_zero])) * 100.0)
        else:
            mape = 0.0

        return {
          "mae": round(mae, 4),
          "rmse": round(rmse, 4),
          "r2": round(r2, 4),
          "mape": round(mape, 4),
        }

    def rank_and_select_best(self, evaluation_results: dict, metric_key: str = "mae") -> tuple:
        """
        Ranks trained models by performance and returns (best_name, best_metrics, best_model).
        """
        sorted_models = sorted(evaluation_results.items(), key=lambda item: item[1]["metrics"][metric_key])
        best_name, best_data = sorted_models[0]
        logger.info(f"Selected Best Model: '{best_name}' with {metric_key.upper()} = {best_data['metrics'][metric_key]}")
        return best_name, best_data["metrics"], best_data["model"]
