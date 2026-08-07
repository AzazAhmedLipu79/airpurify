import logging
import pandas as pd
from feature_engineering.feature_pipeline import FeatureEngineeringPipeline

logger = logging.getLogger("ml_platform.dataset_builder")

class SupervisedDatasetBuilder:
    def __init__(self, feature_pipeline: FeatureEngineeringPipeline = None):
        self.feature_pipeline = feature_pipeline or FeatureEngineeringPipeline()

    def build_dataset(
        self,
        raw_df: pd.DataFrame,
        target_col: str = "mq135_avg",
        horizon_steps: int = 10,  # 10 minutes ahead
    ):
        """
        Builds a supervised ML dataset with feature set X and future target y.
        """
        if raw_df.empty:
            return pd.DataFrame(), pd.Series()

        # 1. Feature Engineering
        df_feat = self.feature_pipeline.generate_features(raw_df)

        # 2. Shift Target Column into the Future by horizon_steps
        df_feat["target_y"] = df_feat[target_col].shift(-horizon_steps)

        # Drop rows where target is NaN (the last horizon_steps rows)
        df_clean = df_feat.dropna(subset=["target_y"]).copy()

        # Separate Features X and Target y
        exclude_cols = [
            "id",
            "device_id",
            "time_bucket",
            "created_at",
            "data_quality",
            "target_y",
        ]
        feature_cols = [c for c in df_clean.columns if c not in exclude_cols]

        X = df_clean[feature_cols]
        y = df_clean["target_y"]

        logger.info(
            f"Built supervised dataset for target '{target_col}' (horizon: {horizon_steps}m). Shape X: {X.shape}, y: {y.shape}"
        )
        return X, y, feature_cols

if __name__ == "__main__":
    from database.db_loader import DataLoader
    loader = DataLoader()
    raw = loader.load_historical_aggregates(limit=200)
    builder = SupervisedDatasetBuilder()
    X, y, cols = builder.build_dataset(raw, target_col="mq135_avg", horizon_steps=10)
    print("X shape:", X.shape, "y shape:", y.shape)
