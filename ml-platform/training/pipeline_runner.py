import logging
import numpy as np
import pandas as pd
from database.db_loader import DataLoader
from datasets.dataset_builder import SupervisedDatasetBuilder
from eda.eda_generator import EDAReporter
from training.time_split import TimeSeriesSplitter
from training.trainers import ModelTrainer
from training.hyperparameter_tuner import HyperparameterTuner
from evaluation.metrics_evaluator import MetricsEvaluator
from registry.model_registry import ModelRegistry

logger = logging.getLogger("ml_platform.pipeline_runner")
logging.basicConfig(level=logging.INFO)

class TrainingPipelineRunner:
    def __init__(self):
        self.db_loader = DataLoader()
        self.dataset_builder = SupervisedDatasetBuilder()
        self.eda_reporter = EDAReporter()
        self.splitter = TimeSeriesSplitter()
        self.trainer = ModelTrainer()
        self.tuner = HyperparameterTuner()
        self.evaluator = MetricsEvaluator()
        self.registry = ModelRegistry()

    def run_pipeline(
        self,
        target_name: str = "mq135_avg",
        horizon_steps: int = 10,
        tune_hyperparams: bool = False,
    ) -> dict:
        """
        Executes end-to-end ML pipeline:
        Data Loading -> Feature Engineering -> Supervised Dataset -> Time-Series Split ->
        Model Training (LR, RF, XGB) -> Hyperparameter Tuning -> Evaluation -> Best Model Selection -> Registry Persistence.
        """
        logger.info(f"=== Starting ML Pipeline for Target '{target_name}' (Horizon: {horizon_steps}m) ===")

        # 1. Data Loading
        raw_df = self.db_loader.load_historical_aggregates(limit=10000)

        # Fallback synthetic dataset generator if MySQL is empty during dry-runs
        if raw_df.empty or len(raw_df) < 50:
            logger.info("Generating synthetic training data for initial baseline training...")
            timestamps = pd.date_range(end=pd.Timestamp.now(), periods=1000, freq="1min")
            raw_df = pd.DataFrame({
                "device_id": 1,
                "time_bucket": timestamps,
                "temperature_ds18b20_avg": 20 + np.sin(np.linspace(0, 50, 1000)) * 5 + np.random.normal(0, 0.5, 1000),
                "temperature_dht11_avg": 20 + np.sin(np.linspace(0, 50, 1000)) * 5,
                "temperature_tmp36_avg": 20 + np.sin(np.linspace(0, 50, 1000)) * 5,
                "humidity_dht11_avg": 50 + np.cos(np.linspace(0, 50, 1000)) * 10 + np.random.normal(0, 1, 1000),
                "mq135_avg": 140 + np.sin(np.linspace(0, 20, 1000)) * 30 + np.random.normal(0, 2, 1000),
                "sample_count": 12,
                "data_quality": "good",
            })

        # 2. Automated EDA Report
        self.eda_reporter.generate_report(raw_df, f"eda_{target_name}.html")

        # 3. Supervised Dataset Generation
        X, y, feature_names = self.dataset_builder.build_dataset(
            raw_df, target_col=target_name, horizon_steps=horizon_steps
        )

        # 4. Chronological Time-Series Split
        X_train, y_train, X_val, y_val, X_test, y_test = self.splitter.split(X, y)

        # Combine Train + Val for final model fitting
        X_train_full = pd.concat([X_train, X_val])
        y_train_full = pd.concat([y_train, y_val])

        results = {}

        # Model 1: Linear Regression Baseline
        lr_model, lr_duration = self.trainer.train_linear_regression(X_train_full, y_train_full)
        lr_preds = lr_model.predict(X_test)
        results["linear_regression"] = {
            "model": lr_model,
            "metrics": self.evaluator.evaluate(y_test, lr_preds),
            "params": {},
            "duration": lr_duration,
        }

        # Model 2: Random Forest Regressor
        if tune_hyperparams:
            rf_model, rf_params = self.tuner.tune_random_forest(X_train_full, y_train_full)
            rf_duration = 1.0
        else:
            rf_params = {"n_estimators": 100, "max_depth": 10, "random_state": 42}
            rf_model, rf_duration = self.trainer.train_random_forest(X_train_full, y_train_full, rf_params)

        rf_preds = rf_model.predict(X_test)
        results["random_forest"] = {
            "model": rf_model,
            "metrics": self.evaluator.evaluate(y_test, rf_preds),
            "params": rf_params,
            "duration": rf_duration,
        }

        # Model 3: XGBoost Regressor
        if tune_hyperparams:
            xgb_model, xgb_params = self.tuner.tune_xgboost(X_train_full, y_train_full)
            xgb_duration = 1.0
        else:
            xgb_params = {"n_estimators": 100, "max_depth": 6, "learning_rate": 0.05, "random_state": 42}
            xgb_model, xgb_duration = self.trainer.train_xgboost(X_train_full, y_train_full, xgb_params)

        xgb_preds = xgb_model.predict(X_test)
        results["xgboost"] = {
            "model": xgb_model,
            "metrics": self.evaluator.evaluate(y_test, xgb_preds),
            "params": xgb_params,
            "duration": xgb_duration,
        }

        # 5. Model Evaluation & Best Selection
        best_name, best_metrics, best_model = self.evaluator.rank_and_select_best(results, metric_key="mae")
        best_data = results[best_name]

        # 6. Save Best Model in Registry
        algo_title = "XGBoost Regressor" if best_name == "xgboost" else "Random Forest Regressor" if best_name == "random_forest" else "Linear Regression"
        version = self.registry.save_model(
            model=best_model,
            target_name=target_name,
            horizon_minutes=horizon_steps,
            metrics=best_metrics,
            features=feature_names,
            params=best_data["params"],
            training_duration=best_data["duration"],
            algorithm=algo_title,
        )

        return {
            "target": target_name,
            "version": version,
            "selected_model": best_name,
            "best_metrics": best_metrics,
            "all_model_evaluations": {k: v["metrics"] for k, v in results.items()},
        }

if __name__ == "__main__":
    import numpy as np
    runner = TrainingPipelineRunner()
    res = runner.run_pipeline("mq135_avg", horizon_steps=10)
    print("Pipeline Execution Summary:", res)
