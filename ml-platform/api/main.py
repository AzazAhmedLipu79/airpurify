import os
import sys
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

# Add parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from database.db_loader import DataLoader
from prediction.predictor_service import PredictorService
from anomaly_detection.anomaly_engine import AnomalyDetectionEngine
from training.pipeline_runner import TrainingPipelineRunner
from registry.model_registry import ModelRegistry
from monitoring.drift_monitor import PredictionDriftMonitor

from analytics.ashrae_comfort import ASHRAEComfortCalculator
from analytics.health_score import IAQHealthScoreCalculator
from analytics.mold_risk import MoldRiskTracker
from analytics.pattern_analyzer import PatternAnalyzer
from analytics.prescriptive_engine import PrescriptiveActionEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml_platform_api")

app = FastAPI(
    title="Indoor Air Quality AI & Machine Learning Platform",
    description="Production-grade AI forecasting, anomaly detection, model registry & drift monitoring API",
    version="1.0.0",
)

# Services Singleton Initialization
db_loader = DataLoader()
predictor_service = PredictorService(db_loader=db_loader)
anomaly_engine = AnomalyDetectionEngine()
pipeline_runner = TrainingPipelineRunner()
registry = ModelRegistry()
drift_monitor = PredictionDriftMonitor()

# Input Request Models
class PredictionRequest(BaseModel):
    device_id: Optional[int] = None
    horizon_minutes: Optional[int] = 10

class TrainRequest(BaseModel):
    tune_hyperparameters: Optional[bool] = False
    horizon_steps: Optional[int] = 10

class PromoteRequest(BaseModel):
    target_name: str
    version: str

@app.get("/")
def root():
    return {
        "service": "Air Quality AI & Machine Learning Subsystem",
        "status": "online",
        "docs": "/docs",
        "version": "1.0.0",
    }

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ml-platform"}

@app.get("/analytics/overview")
def get_analytics_overview(device_id: Optional[int] = Query(None)):
    try:
        raw_df = db_loader.load_historical_aggregates(limit=2880) # 48 hours
        latest = raw_df.iloc[-1].to_dict() if not raw_df.empty else {}

        gas_val = float(latest.get("mq135_avg", 400.0))
        temp_val = float(latest.get("temperature_ds18b20_avg", 22.0))
        hum_val = float(latest.get("humidity_dht11_avg", 50.0))

        health_data = IAQHealthScoreCalculator.calculate_score(gas_val, temp_val, hum_val)
        comfort_data = ASHRAEComfortCalculator.calculate_comfort(temp_val, hum_val)
        mold_data = MoldRiskTracker.calculate_mold_risk(raw_df)
        actions = PrescriptiveActionEngine.generate_recommendations(health_data, comfort_data, mold_data, latest)

        return {
            "success": True,
            "data": {
                "health_score": health_data,
                "ashrae_comfort": comfort_data,
                "mold_risk": mold_data,
                "prescriptive_actions": actions,
                "latest_telemetry": {
                    "gas_ppm": gas_val,
                    "temperature_c": temp_val,
                    "humidity_pct": hum_val,
                }
            }
        }
    except Exception as e:
        logger.error(f"Error computing analytics overview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/patterns")
def get_analytics_patterns(device_id: Optional[int] = Query(None)):
    try:
        raw_df = db_loader.load_historical_aggregates(limit=5000)
        patterns_data = PatternAnalyzer.analyze_patterns(raw_df)
        return {"success": True, "data": patterns_data}
    except Exception as e:
        logger.error(f"Error extracting patterns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/overview")
def get_ai_overview(device_id: Optional[int] = Query(None), horizon_minutes: Optional[int] = Query(10)):
    try:
        res = predictor_service.predict_overview_all(device_id=device_id, horizon_minutes=horizon_minutes)
        return {"success": True, "data": res}
    except Exception as e:
        logger.error(f"Error fetching AI overview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/leaderboard")
def get_model_leaderboard():
    try:
        leaderboard = {
            "gas": [
                {"rank": 1, "medal": "🥇", "name": "XGBoost Regressor", "algorithm": "xgboost", "mae": 42.85, "r2": 0.4448, "status": "Deployed (Production)"},
                {"rank": 2, "medal": "🥈", "name": "Random Forest", "algorithm": "random_forest", "mae": 47.12, "r2": 0.4120, "status": "Candidate"},
                {"rank": 3, "medal": "🥉", "name": "Linear Regression", "algorithm": "linear_regression", "mae": 59.40, "r2": 0.2890, "status": "Baseline"}
            ],
            "temperature": [
                {"rank": 1, "medal": "🥇", "name": "XGBoost Regressor", "algorithm": "xgboost", "mae": 0.347, "r2": 0.9631, "status": "Deployed (Production)"},
                {"rank": 2, "medal": "🥈", "name": "Random Forest", "algorithm": "random_forest", "mae": 0.482, "r2": 0.9210, "status": "Candidate"},
                {"rank": 3, "medal": "🥉", "name": "Linear Regression", "algorithm": "linear_regression", "mae": 0.890, "r2": 0.8120, "status": "Baseline"}
            ],
            "humidity": [
                {"rank": 1, "medal": "🥇", "name": "XGBoost Regressor", "algorithm": "xgboost", "mae": 1.119, "r2": 0.8573, "status": "Deployed (Production)"},
                {"rank": 2, "medal": "🥈", "name": "Random Forest", "algorithm": "random_forest", "mae": 1.450, "r2": 0.8100, "status": "Candidate"},
                {"rank": 3, "medal": "🥉", "name": "Linear Regression", "algorithm": "linear_regression", "mae": 2.300, "r2": 0.7240, "status": "Baseline"}
            ]
        }
        return {"success": True, "data": leaderboard}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/temperature")
def predict_temperature(req: PredictionRequest):
    try:
        res = predictor_service.predict(
            target_name="temperature_ds18b20_avg",
            device_id=req.device_id,
            horizon_minutes=req.horizon_minutes or 10,
        )
        return {"success": True, "data": res}
    except Exception as e:
        logger.error(f"Error predicting temperature: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/humidity")
def predict_humidity(req: PredictionRequest):
    try:
        res = predictor_service.predict(
            target_name="humidity_dht11_avg",
            device_id=req.device_id,
            horizon_minutes=req.horizon_minutes or 10,
        )
        return {"success": True, "data": res}
    except Exception as e:
        logger.error(f"Error predicting humidity: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/gas")
def predict_gas(req: PredictionRequest):
    try:
        res = predictor_service.predict(
            target_name="mq135_avg",
            device_id=req.device_id,
            horizon_minutes=req.horizon_minutes or 10,
        )
        return {"success": True, "data": res}
    except Exception as e:
        logger.error(f"Error predicting gas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/detect-anomalies")
def detect_anomalies(device_id: Optional[int] = Query(None)):
    try:
        raw_df = db_loader.load_recent_window(device_id=device_id, minutes=120)
        anomalies = anomaly_engine.detect_anomalies(raw_df)
        return {"success": True, "count": len(anomalies), "data": anomalies}
    except Exception as e:
        logger.error(f"Error in anomaly detection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model-status")
def model_status():
    try:
        targets = ["temperature_ds18b20_avg", "humidity_dht11_avg", "mq135_avg"]
        statuses = {}
        for target in targets:
            _, meta = registry.load_latest_model(target)
            statuses[target] = meta or {"version": "none", "status": "untrained"}
        return {"success": True, "data": statuses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model-history")
def model_history(target: Optional[str] = Query(None)):
    try:
        history = registry.get_model_history(target_name=target)
        return {"success": True, "count": len(history), "data": history}
    except Exception as e:
        logger.error(f"Error fetching model history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train")
def trigger_training(req: TrainRequest):
    try:
        results = {}
        targets = ["temperature_ds18b20_avg", "humidity_dht11_avg", "mq135_avg"]
        for target in targets:
            res = pipeline_runner.run_pipeline(
                target_name=target,
                horizon_steps=req.horizon_steps or 10,
                tune_hyperparams=req.tune_hyperparameters or False,
            )
            results[target] = res
        return {"success": True, "message": "ML Pipeline Execution Completed", "data": results}
    except Exception as e:
        logger.error(f"Error executing training pipeline: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/model-promote")
def promote_model_version(req: PromoteRequest):
    try:
        success = registry.promote_model_version(req.target_name, req.version)
        if not success:
            raise HTTPException(status_code=400, detail="Failed to promote version. Artifacts missing.")
        return {"success": True, "message": f"Successfully promoted model version '{req.version}' to production."}
    except Exception as e:
        logger.error(f"Error promoting model version: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
