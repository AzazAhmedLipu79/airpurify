import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Database Config
DB_USER = os.getenv("DB_USER", "iot")
DB_PASSWORD = os.getenv("DB_PASSWORD", "5EMrfpz75WetmmRC")
DB_HOST = os.getenv("DB_HOST", "84.247.173.145")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "iot")

DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# AI Platform Paths
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "reports"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Forecasting Defaults
DEFAULT_PREDICTION_HORIZON_MINUTES = 10
TARGET_METRICS = ["temperature_ds18b20_avg", "humidity_dht11_avg", "mq135_avg"]

# Hyperparameter Search Spaces
PARAM_GRIDS = {
    "random_forest": {
        "n_estimators": [50, 100, 200],
        "max_depth": [5, 10, 15, None],
        "min_samples_split": [2, 5, 10],
    },
    "xgboost": {
        "n_estimators": [50, 100, 200],
        "max_depth": [3, 6, 9],
        "learning_rate": [0.01, 0.05, 0.1],
        "subsample": [0.8, 1.0],
    },
}
