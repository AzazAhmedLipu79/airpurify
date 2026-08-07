# 🤖 AI & Machine Learning Subsystem Documentation

Complete technical specification and operational guide for the **Production Machine Learning Platform (`ml-platform/`)** supporting the Indoor Air Quality Monitoring System.

---

## 📐 1. System Architecture & Pipeline Flow

The AI pipeline starts from `telemetry_1min` (pre-aggregated 1-minute telemetry) and executes dynamic feature engineering, time-series forecasting, multi-layer anomaly detection, and continuous drift monitoring.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 AI PIPELINE ARCHITECTURE                               │
└────────────────────────────────────────────────────────────────────────────────────────┘

 [ IoT ESP32 Telemetry ]
            │
            ▼
    [ telemetry_1min ] ───▶ [ Dynamic Feature Pipeline ] ───▶ [ Supervised Dataset Builder ]
                               (30+ Features In-Memory)           (Multi-Horizon X, y)
                                                                            │
                                                                            ▼
 [ Web Dashboard UI ] ◀── [ Node.js Gateway Proxy ] ◀── [ FastAPI Service ] ◀── [ Model Registry ]
  • AI Overview           (/api/v1/ai/*)                 (Port 8000)             (joblib + JSON)
  • Model Performance
  • Model Registry
```

---

## ⚡ 2. Dynamic Feature Engineering Engine

### Zero Database Mutation Policy
 Engineered features are calculated dynamically in memory during training and inference pipelines. They are **never permanently stored** inside production telemetry tables, avoiding table clutter and schema bloat.

### Computed Feature List (30+ Features)
1. **Lags**:
   - 1-minute, 5-minute, 10-minute, 30-minute historical values for Temperature, Humidity, and MQ-135 Gas.
2. **Rolling Statistics**:
   - 5-minute, 15-minute, and 60-minute sliding windows (Rolling Mean, Min, Max, Standard Deviation, Variance).
3. **Trend Slopes & Derivatives**:
   - 1-minute and 5-minute first derivatives ($\Delta = \text{val}_t - \text{val}_{t-k}$).
   - 5-minute slope estimations ($\text{Slope} = \frac{\Delta y}{\Delta t}$).
   - Percentage rate of change ($\% = \frac{v_t - v_{t-5}}{v_{t-5}} \times 100$).
4. **Multi-Sensor Thermal Consistency & Disagreement**:
   - Absolute thermal delta: $|\text{DS18B20} - \text{DHT11}|$.
   - Secondary delta: $|\text{DS18B20} - \text{TMP36}|$.
   - Multi-sensor variance across all 3 temperature channels.
5. **Cross-Sensor Interaction Ratios**:
   - Humidity / Gas ratio ($\frac{\text{Humidity}}{\text{MQ135}}$).
   - Temperature / Gas ratio ($\frac{\text{Temperature}}{\text{MQ135}}$).
   - Temperature $\times$ Humidity product index.
6. **Temporal Encoding**:
   - Hour of Day ($0-23$), Minute of Hour ($0-59$), Day of Week ($0-6$), Is Weekend boolean, Month ($1-12$).

---

## 🎯 3. Forecasting Targets & Model Training

### Prediction Horizons
Independent models are trained for 3 core parameters:
- **Temperature Target**: `temperature_ds18b20_avg`
- **Humidity Target**: `humidity_dht11_avg`
- **Gas Concentration Target**: `mq135_avg`

The default prediction horizon is **10 minutes ahead** ($T+10$), with dynamic support for 30m, 1h, 6h, and 24h horizons.

### Candidate Algorithms & Model Tournament
For each target, the pipeline fits 3 candidate algorithms using a **Chronological Time-Series Split** (70% Train, 15% Validation, 15% Test without shuffling to prevent time-series data leakage):

1. **Baseline Model**: Linear Regression
2. **Ensemble Model**: Random Forest Regressor (`n_estimators=100`, `max_depth=10`)
3. **Gradient Boosting Model**: XGBoost Regressor (`n_estimators=100`, `learning_rate=0.05`, `max_depth=6`)

### Model Leaderboard & Evaluation Metrics
Models are evaluated on the out-of-sample Test set across 4 standard metrics:
- **MAE** (Mean Absolute Error): $\frac{1}{n} \sum |y_i - \hat{y}_i|$
- **RMSE** (Root Mean Squared Error): $\sqrt{\frac{1}{n} \sum (y_i - \hat{y}_i)^2}$
- **$R^2$ Score** (Coefficient of Determination): $1 - \frac{\sum (y_i - \hat{y}_i)^2}{\sum (y_i - \bar{y})^2}$
- **MAPE** (Mean Absolute Percentage Error): $\frac{100\%}{n} \sum \left|\frac{y_i - \hat{y}_i}{y_i}\right|$

The model with the lowest MAE is automatically declared **Champion**, assigned the `production` status, and persisted to the Model Registry.

---

## 🏛️ 4. Model Registry & Governance Versioning

Trained models are saved to `ml-platform/models/`. Historical model binaries and metadata are **never overwritten**.

### Saved Registry Files per Version
For version `v_20260806_132025`:
1. `temperature_ds18b20_avg_v_20260806_132025.joblib`: Serialized Python model binary.
2. `temperature_ds18b20_avg_v_20260806_132025.json`: Metadata manifest file containing:
   ```json
   {
     "version": "v_20260806_132025",
     "target_name": "temperature_ds18b20_avg",
     "horizon_minutes": 10,
     "metrics": { "mae": 0.347, "rmse": 0.482, "r2": 0.9631, "mape": 1.25 },
     "feature_names": ["temperature_ds18b20_avg_lag_1m", "..."],
     "hyperparameters": { "n_estimators": 100, "max_depth": 6 },
     "training_duration_seconds": 1.12,
     "created_at": "2026-08-06 13:20:25"
   }
   ```
3. `temperature_ds18b20_avg_latest.txt`: Text file storing pointer to active production version tag.

---

## ⚠️ 5. 4-Layer Anomaly Detection Engine

The anomaly detection engine evaluates incoming raw telemetry across 4 complementary analytical layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   4-LAYER ANOMALY SCANNING ENGINE                      │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 1: Rule-Based Safety Bounds  (Gas > 1000 ppm, Temp > 45°C)       │
│ Layer 2: Statistical Z-Score       (|Z| > 3.0 & Isolation Forest)      │
│ Layer 3: Thermal Sensor Health     (|DS18B20 - DHT11| > 4.0°C)         │
│ Layer 4: Rapid Slope Trend         (MQ135 > +30% surge in 5 mins)     │
└────────────────────────────────────────────────────────────────────────┘
```

### Layer Specifications & Human Explanations
1. **Layer 1 (Rule-Based Thresholds)**:
   - Gas $> 1000$ ppm $\rightarrow$ `CRITICAL`: *"MQ-135 sensor recorded critical air contamination level exceeding safety threshold of 1000 ppm."*
   - Temp $> 45^\circ\text{C}$ or $< -10^\circ\text{C}$ $\rightarrow$ `WARNING`: *"DS18B20 sensor measured extreme thermal level outside safe operating bounds."*
   - Negative parameters $\rightarrow$ `CRITICAL`: *"Sensor stream transmitted corrupted negative physical parameters."*
2. **Layer 2 (Statistical Z-Score & Isolation Forest)**:
   - Rolling Z-Score $|Z| > 3.0$ $\rightarrow$ `WARNING`: *"MQ-135 gas concentration deviated significantly from 15-minute moving average with Z-score of 3.4."*
3. **Layer 3 (Multi-Sensor Thermal Consistency)**:
   - $|\text{DS18B20} - \text{DHT11}| > 4.0^\circ\text{C}$ $\rightarrow$ `WARNING`: *"Thermal sensor disagreement detected: DS18B20 (24.2°C) vs DHT11 (28.6°C) differed by 4.4°C."*
4. **Layer 4 (Rapid Slope Trend Analysis)**:
   - 5-minute surge $> 30\%$ $\rightarrow$ `WARNING`: *"Rapid Gas Surge: MQ-135 concentration surged 34.2% over last 5 minutes."*

---

## 📊 6. Prediction Drift Monitoring & Retraining

1. **Prediction Logging**: Every real-time forecast is assigned a unique `prediction_id` and logged alongside target timestamp $T+10$.
2. **Ground Truth Pairing**: As actual sensor readings arrive 10 minutes later, the drift monitor ([ml-platform/monitoring/drift_monitor.py](file:///Users/darkmac/Desktop/air-quality-iot/ml-platform/monitoring/drift_monitor.py)) joins predictions with ground truth actuals.
3. **Rolling Error Evaluation**: Computes 24-hour rolling MAE/RMSE metrics.
4. **Degradation Alerting**: If rolling MAE degrades beyond acceptable threshold, status flags `Degraded / Drift Detected`, triggering an automated model retraining run.

---

## 🕹️ 7. Operational Interfaces & Execution Commands

### A. Command Line CLI (`manage.py`)
Run operational commands from the terminal:
```bash
# 1. Trigger Model Retraining Pipeline
./venv/bin/python ml-platform/manage.py train

# 2. Execute Real-Time Inference Prediction
./venv/bin/python ml-platform/manage.py predict --target mq135_avg --horizon 10

# 3. Check Model Registry Status
./venv/bin/python ml-platform/manage.py status

# 4. Run 4-Layer Anomaly Scanner
./venv/bin/python ml-platform/manage.py anomalies
```

### B. Python FastAPI Microservice (Port 8000)
- **Start Service**:
  ```bash
  cd ml-platform
  ./venv/bin/python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
  ```
- **Endpoints**:
  - `GET /overview`: Executive AI status, synchronized predictions, insights & sensor health
  - `GET /leaderboard`: Champion vs challenger model ranking
  - `GET /model-status`: Active registered model versions
  - `GET /model-history`: Historical evaluation metric logs
  - `POST /predict/gas`, `POST /predict/temperature`, `POST /predict/humidity`
  - `GET /detect-anomalies`: Real-time 4-layer anomaly rules
  - `POST /train`: Retraining pipeline trigger

### C. Web Dashboard UI (`http://localhost:3000/#ai`)
The **🤖 AI & ML Center** tab provides 3 sub-tabs:
1. **🎛️ AI Overview**: Executive summary status bar, side-by-side forecasts, natural language insights, visual feature attribution bars, 4-layer anomaly timeline, and multi-sensor thermal health.
2. **📊 Model Performance**: Model competition leaderboards (🥇 XGBoost vs 🥈 Random Forest vs 🥉 Linear Regression), 7-day drift stability monitor, and historical metric history log table.
3. **🏛️ Model Registry**: Artifact metadata, training sample counts (54,812), deployment tags, and one-click retraining trigger.
