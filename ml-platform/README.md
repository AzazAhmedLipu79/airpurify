# 🤖 Production AI & Machine Learning Platform (`ml-platform/`)

Production-grade Machine Learning Subsystem for the **Indoor Air Quality Monitoring Platform**.

---

## 🌟 Architectural Features

1. **Independent Multi-Target Forecasting**:
   - Separate prediction pipelines for **Temperature**, **Humidity**, and **MQ-135 Gas**.
   - Flexible prediction horizon (10m default, configurable up to 24h).
2. **Automated Feature Engineering Engine**:
   - Dynamically computes 30+ features (Lags, Rolling stats, Trend slopes, Sensor disagreement, Cross-sensor interaction terms, Time features) without mutating database tables.
3. **Multi-Model Training & Tuning**:
   - Baseline: **Linear Regression**
   - Ensemble: **Random Forest Regressor**
   - Boosting: **XGBoost Regressor**
   - Chronological time-series split (no data leakage).
4. **Model Registry & Versioning**:
   - Persists versioned `.joblib` model artifacts and JSON metadata (`version`, `target`, `horizon`, `metrics`, `feature_names`, `hyperparameters`). Never overwrites previous versions.
5. **4-Layer Anomaly Detection Engine**:
   - **Layer 1**: Safety Threshold Rules (Gas > 1000 ppm, Temp > 45°C, Negative values).
   - **Layer 2**: Statistical Z-Score ($|Z| > 3.0$) & Isolation Forest.
   - **Layer 3**: Multi-sensor thermal disagreement (DS18B20 vs DHT11 vs TMP36).
   - **Layer 4**: Trend & Rapid Slope Analysis with natural language explanations.
6. **FastAPI Microservice Interface**:
   - REST API serving real-time predictions, anomaly detection, model registry status, and training triggers.

---

## 📁 Directory Structure

```
ml-platform/
├── config/
│   └── settings.py                 # DB connection URI & hyperparameters
├── database/
│   └── db_loader.py                # MySQL historical & recent telemetry loader
├── feature_engineering/
│   └── feature_pipeline.py         # Dynamic 30+ ML feature generator
├── datasets/
│   └── dataset_builder.py          # Supervised dataset generator
├── eda/
│   └── eda_generator.py            # Automated EDA statistics & HTML reporter
├── training/
│   ├── time_split.py               # Chronological time-series split
│   ├── trainers.py                 # LR, RF, and XGBoost model trainers
│   ├── hyperparameter_tuner.py     # RandomizedSearchCV optimizer
│   └── pipeline_runner.py          # End-to-end training orchestrator
├── evaluation/
│   └── metrics_evaluator.py        # MAE, RMSE, R², MAPE evaluator
├── registry/
│   └── model_registry.py           # Joblib artifact & JSON metadata versioning
├── anomaly_detection/
│   └── anomaly_engine.py           # 4-Layer anomaly detector with explanations
├── monitoring/
│   └── drift_monitor.py            # Rolling MAE/RMSE prediction drift monitor
├── prediction/
│   └── predictor_service.py        # Inference engine & feature importance explanations
├── api/
│   └── main.py                     # FastAPI service endpoints
├── docker/
│   ├── Dockerfile                  # Container definition
│   └── docker-compose.yml          # Container orchestration
└── tests/
    └── test_pipeline.py            # Pytest test suite
```

---

## 🚀 Running the AI Microservice

### 1. Local Run
```bash
cd ml-platform
pip install -r requirements.txt
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```
FastAPI Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Execute Model Training
```bash
python training/pipeline_runner.py
```

### 3. Run Pytest Suite
```bash
pytest tests/
```

### 4. Docker Deployment
```bash
cd ml-platform/docker
docker-compose up --build -d
```
