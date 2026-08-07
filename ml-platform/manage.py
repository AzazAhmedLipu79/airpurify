import sys
import argparse
import json
from pathlib import Path

# Add parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent))

from training.pipeline_runner import TrainingPipelineRunner
from prediction.predictor_service import PredictorService
from anomaly_detection.anomaly_engine import AnomalyDetectionEngine
from registry.model_registry import ModelRegistry
from database.db_loader import DataLoader
from monitoring.drift_monitor import PredictionDriftMonitor

def train_cmd(args):
    print(f"🚀 Triggering model training pipeline (Horizon: {args.horizon}m)...")
    runner = TrainingPipelineRunner()
    targets = [args.target] if args.target else ["temperature_ds18b20_avg", "humidity_dht11_avg", "mq135_avg"]
    for target in targets:
        res = runner.run_pipeline(target_name=target, horizon_steps=args.horizon, tune_hyperparams=args.tune)
        print(f"\n✅ Target: {target}")
        print(f"   Selected Model: {res['selected_model']}")
        print(f"   Version Tag:    {res['version']}")
        print(f"   Evaluation MAE: {res['best_metrics']['mae']}")
        print(f"   Evaluation R²:  {res['best_metrics']['r2']}")

def predict_cmd(args):
    print(f"🔮 Executing real-time prediction for target '{args.target}'...")
    predictor = PredictorService()
    res = predictor.predict(target_name=args.target, device_id=args.device, horizon_minutes=args.horizon)
    print(json.dumps(res, indent=2))

def status_cmd(args):
    print("📊 Current Production Model Registry Status:")
    registry = ModelRegistry()
    targets = ["temperature_ds18b20_avg", "humidity_dht11_avg", "mq135_avg"]
    for target in targets:
        _, meta = registry.load_latest_model(target)
        if meta:
            print(f"\n• Target: {target}")
            print(f"  Version Tag: {meta['version']}")
            print(f"  MAE Metric:  {meta['metrics'].get('mae', 'N/A')}")
            print(f"  R² Metric:   {meta['metrics'].get('r2', 'N/A')}")
            print(f"  Features:    {len(meta['feature_names'])} features")
            print(f"  Created At:  {meta['created_at']}")
        else:
            print(f"\n• Target: {target} (Untrained)")

def anomalies_cmd(args):
    print("⚠️ Executing 4-Layer Anomaly Detection Engine...")
    loader = DataLoader()
    raw_df = loader.load_recent_window(device_id=args.device, minutes=120)
    engine = AnomalyDetectionEngine()
    detected = engine.detect_anomalies(raw_df)
    print(f"\nDetected {len(detected)} anomaly events:")
    for a in detected:
        print(f" [{a['severity']}] Layer: {a['layer']} | {a['explanation']}")

def main():
    parser = argparse.ArgumentParser(description="AI & Machine Learning Operational Management CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Train command
    train_parser = subparsers.add_parser("train", help="Train and register ML models")
    train_parser.add_argument("--target", type=str, help="Specific target (temperature_ds18b20_avg, humidity_dht11_avg, mq135_avg)")
    train_parser.add_argument("--horizon", type=int, default=10, help="Prediction horizon in minutes")
    train_parser.add_argument("--tune", action="store_true", help="Perform hyperparameter tuning")
    train_parser.set_defaults(func=train_cmd)

    # Predict command
    predict_parser = subparsers.add_parser("predict", help="Execute real-time prediction")
    predict_parser.add_argument("--target", type=str, default="mq135_avg", help="Target parameter")
    predict_parser.add_argument("--device", type=int, help="Device ID")
    predict_parser.add_argument("--horizon", type=int, default=10, help="Horizon minutes")
    predict_parser.set_defaults(func=predict_cmd)

    # Status command
    status_parser = subparsers.add_parser("status", help="Show registered model status")
    status_parser.set_defaults(func=status_cmd)

    # Anomalies command
    anomalies_parser = subparsers.add_parser("anomalies", help="Detect anomaly events")
    anomalies_parser.add_argument("--device", type=int, help="Device ID")
    anomalies_parser.set_defaults(func=anomalies_cmd)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()
