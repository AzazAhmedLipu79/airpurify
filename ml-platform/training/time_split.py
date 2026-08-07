import logging
import pandas as pd
import numpy as np

logger = logging.getLogger("ml_platform.time_split")

class TimeSeriesSplitter:
    def __init__(self, train_ratio: float = 0.70, val_ratio: float = 0.15):
        self.train_ratio = train_ratio
        self.val_ratio = val_ratio

    def split(self, X: pd.DataFrame, y: pd.Series):
        """
        Performs a strictly chronological time-series split (Train / Val / Test)
        without random shuffling to prevent time-series data leakage.
        """
        n = len(X)
        train_end = int(n * self.train_ratio)
        val_end = int(n * (self.train_ratio + self.val_ratio))

        X_train, y_train = X.iloc[:train_end], y.iloc[:train_end]
        X_val, y_val = X.iloc[train_end:val_end], y.iloc[train_end:val_end]
        X_test, y_test = X.iloc[val_end:], y.iloc[val_end:]

        logger.info(
            f"Time-Series Split Completed — Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}"
        )
        return X_train, y_train, X_val, y_val, X_test, y_test
