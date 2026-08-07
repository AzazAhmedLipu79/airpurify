import logging
import pandas as pd
from sklearn.model_selection import RandomizedSearchCV
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from config.settings import PARAM_GRIDS

try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except Exception:
    HAS_XGBOOST = False

logger = logging.getLogger("ml_platform.hyperparameter_tuner")

class HyperparameterTuner:
    def __init__(self):
        pass

    def tune_random_forest(self, X_train: pd.DataFrame, y_train: pd.Series, n_iter: int = 5):
        logger.info("Tuning Random Forest Hyperparameters via RandomizedSearchCV...")
        rf = RandomForestRegressor(random_state=42)
        param_grid = PARAM_GRIDS["random_forest"]
        search = RandomizedSearchCV(
            rf, param_distributions=param_grid, n_iter=n_iter, cv=3, scoring="neg_mean_absolute_error", random_state=42, n_jobs=-1
        )
        search.fit(X_train, y_train)
        logger.info(f"Random Forest Best Params: {search.best_params_}")
        return search.best_estimator_, search.best_params_

    def tune_xgboost(self, X_train: pd.DataFrame, y_train: pd.Series, n_iter: int = 5):
        logger.info("Tuning Boosting Model Hyperparameters via RandomizedSearchCV...")
        if HAS_XGBOOST:
            xgb = XGBRegressor(random_state=42)
            param_grid = PARAM_GRIDS["xgboost"]
        else:
            xgb = GradientBoostingRegressor(random_state=42)
            param_grid = {
                "n_estimators": [50, 100],
                "max_depth": [3, 6],
                "learning_rate": [0.01, 0.05, 0.1],
            }

        search = RandomizedSearchCV(
            xgb, param_distributions=param_grid, n_iter=n_iter, cv=3, scoring="neg_mean_absolute_error", random_state=42, n_jobs=-1
        )
        search.fit(X_train, y_train)
        logger.info(f"Boosting Model Best Params: {search.best_params_}")
        return search.best_estimator_, search.best_params_
