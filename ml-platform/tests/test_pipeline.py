import sys
import pytest
import pandas as pd
import numpy as np
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from feature_engineering.feature_pipeline import FeatureEngineeringPipeline
from datasets.dataset_builder import SupervisedDatasetBuilder
from training.time_split import TimeSeriesSplitter
from training.trainers import ModelTrainer
from evaluation.metrics_evaluator import MetricsEvaluator
from registry.model_registry import ModelRegistry
from anomaly_detection.anomaly_engine import AnomalyDetectionEngine

@pytest.fixture
def sample_telemetry_df():
    timestamps = pd.date_range(end=pd.Timestamp.now(), periods=100, freq="1min")
    df = pd.DataFrame({
        "device_id": 1,
        "time_bucket": timestamps,
        "temperature_ds18b20_avg": 24.5 + np.sin(np.linspace(0, 10, 100)),
        "temperature_dht11_avg": 24.2 + np.sin(np.linspace(0, 10, 100)),
        "temperature_tmp36_avg": 24.0 + np.sin(np.linspace(0, 10, 100)),
        "humidity_dht11_avg": 55.0 + np.cos(np.linspace(0, 10, 100)),
        "mq135_avg": 140.0 + np.random.normal(0, 2, 100),
        "sample_count": 12,
        "data_quality": "good",
    })
    return df

def test_feature_engineering(sample_telemetry_df):
    pipeline = FeatureEngineeringPipeline()
    feat_df = pipeline.generate_features(sample_telemetry_df)
    assert not feat_df.empty
    assert "temperature_ds18b20_avg_lag_1m" in feat_df.columns
    assert "mq135_avg_roll_mean_5m" in feat_df.columns
    assert "temp_disagreement_ds_dht" in feat_df.columns

def test_dataset_builder(sample_telemetry_df):
    builder = SupervisedDatasetBuilder()
    X, y, cols = builder.build_dataset(sample_telemetry_df, target_col="mq135_avg", horizon_steps=5)
    assert not X.empty
    assert len(X) == len(y)

def test_time_series_split(sample_telemetry_df):
    builder = SupervisedDatasetBuilder()
    X, y, _ = builder.build_dataset(sample_telemetry_df, target_col="mq135_avg", horizon_steps=5)
    splitter = TimeSeriesSplitter(train_ratio=0.7, val_ratio=0.15)
    X_tr, y_tr, X_v, y_v, X_te, y_te = splitter.split(X, y)
    assert len(X_tr) + len(X_v) + len(X_te) == len(X)

def test_model_trainer_and_registry(sample_telemetry_df, tmp_path):
    builder = SupervisedDatasetBuilder()
    X, y, cols = builder.build_dataset(sample_telemetry_df, target_col="mq135_avg", horizon_steps=5)
    trainer = ModelTrainer()
    model, duration = trainer.train_linear_regression(X, y)
    
    evaluator = MetricsEvaluator()
    preds = model.predict(X)
    metrics = evaluator.evaluate(y, preds)
    assert "mae" in metrics
    assert "rmse" in metrics

    registry = ModelRegistry(models_dir=tmp_path)
    version = registry.save_model(model, "mq135_avg", 5, metrics, cols, {}, duration)
    assert version.startswith("v_")

    loaded_model, meta = registry.load_latest_model("mq135_avg")
    assert loaded_model is not None
    assert meta["target_name"] == "mq135_avg"

def test_anomaly_detection_engine(sample_telemetry_df):
    engine = AnomalyDetectionEngine()
    
    # Normal data check
    anomalies = engine.detect_anomalies(sample_telemetry_df)
    assert isinstance(anomalies, list)

    # Spike test case
    spiked_df = sample_telemetry_df.copy()
    spiked_df.loc[spiked_df.index[-1], "mq135_avg"] = 1200.0  # Hazardous
    spiked_anomalies = engine.detect_anomalies(spiked_df)
    assert len(spiked_anomalies) > 0
    assert any(a["rule"] == "Hazardous Gas Concentration (> 1000 ppm)" for a in spiked_anomalies)
