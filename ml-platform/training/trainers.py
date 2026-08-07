import logging
import time
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except Exception:
    HAS_XGBOOST = False

logger = logging.getLogger("ml_platform.trainers")

class ModelTrainer:
    def __init__(self):
        pass

    def train_linear_regression(self, X_train: pd.DataFrame, y_train: pd.Series):
        """
        Baseline Model: Linear Regression
        """
        logger.info("Training Linear Regression Baseline Model...")
        start_time = time.time()
        model = LinearRegression()
        model.fit(X_train, y_train)
        duration = time.time() - start_time
        return model, duration

    def train_random_forest(self, X_train: pd.DataFrame, y_train: pd.Series, params: dict = None):
        """
        Ensemble Model: Random Forest Regressor
        """
        logger.info("Training Random Forest Regressor...")
        start_time = time.time()
        params = params or {"n_estimators": 100, "max_depth": 10, "random_state": 42}
        model = RandomForestRegressor(**params)
        model.fit(X_train, y_train)
        duration = time.time() - start_time
        return model, duration

    def train_xgboost(self, X_train: pd.DataFrame, y_train: pd.Series, params: dict = None):
        """
        Gradient Boosting Model: XGBoost Regressor (with GradientBoostingRegressor fallback)
        """
        start_time = time.time()
        if HAS_XGBOOST:
            logger.info("Training XGBoost Regressor...")
            params = params or {"n_estimators": 100, "max_depth": 6, "learning_rate": 0.05, "random_state": 42}
            model = XGBRegressor(**params)
            model.fit(X_train, y_train)
        else:
            logger.info("Training Scikit-Learn GradientBoostingRegressor (Fallback for XGBoost)...")
            gb_params = {
                "n_estimators": params.get("n_estimators", 100) if params else 100,
                "max_depth": params.get("max_depth", 6) if params else 6,
                "learning_rate": params.get("learning_rate", 0.05) if params else 0.05,
                "random_state": 42,
            }
            model = GradientBoostingRegressor(**gb_params)
            model.fit(X_train, y_train)

        duration = time.time() - start_time
        return model, duration
