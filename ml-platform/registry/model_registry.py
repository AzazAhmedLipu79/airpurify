import os
import json
import time
import logging
import joblib
from pathlib import Path
from config.settings import MODELS_DIR

logger = logging.getLogger("ml_platform.registry")

class ModelRegistry:
    def __init__(self, models_dir: Path = MODELS_DIR):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)

    def save_model(
        self,
        model,
        target_name: str,
        horizon_minutes: int,
        metrics: dict,
        features: list,
        params: dict = None,
        training_duration: float = 0.0,
        algorithm: str = "XGBoost Regressor",
    ) -> str:
        """
        Persists a trained model artifact (.joblib) and versioned JSON metadata.
        Never overwrites previous versions.
        """
        timestamp_str = time.strftime("%Y%m%d_%H%M%S")
        version = f"v_{timestamp_str}"
        model_filename = f"{target_name}_{version}.joblib"
        meta_filename = f"{target_name}_{version}.json"

        model_path = self.models_dir / model_filename
        meta_path = self.models_dir / meta_filename

        # Save model binary artifact
        joblib.dump(model, model_path)

        # Save model metadata
        metadata = {
            "version": version,
            "target_name": target_name,
            "algorithm": algorithm,
            "horizon_minutes": horizon_minutes,
            "metrics": metrics,
            "feature_names": features,
            "hyperparameters": params or {},
            "training_duration_seconds": round(training_duration, 3),
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "model_file": model_filename,
        }

        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        # Update latest pointer text file
        latest_pointer = self.models_dir / f"{target_name}_latest.txt"
        with open(latest_pointer, "w", encoding="utf-8") as f:
            f.write(version)

        logger.info(f"Persisted model registry entry '{version}' for target '{target_name}' at {model_path}")
        return version

    def promote_model_version(self, target_name: str, version: str) -> bool:
        """
        Promotes a specific registered model version to active production pointer.
        """
        meta_path = self.models_dir / f"{target_name}_{version}.json"
        model_path = self.models_dir / f"{target_name}_{version}.joblib"
        if not meta_path.exists() or not model_path.exists():
            logger.error(f"Cannot promote version '{version}' - missing artifacts.")
            return False

        latest_pointer = self.models_dir / f"{target_name}_latest.txt"
        with open(latest_pointer, "w", encoding="utf-8") as f:
            f.write(version)

        logger.info(f"Successfully promoted version '{version}' for target '{target_name}' to production.")
        return True

    def load_latest_model(self, target_name: str):
        """
        Loads the latest production model artifact and metadata for a given target.
        """
        latest_pointer = self.models_dir / f"{target_name}_latest.txt"
        if not latest_pointer.exists():
            logger.warning(f"No registered model found for target '{target_name}'.")
            return None, None

        with open(latest_pointer, "r", encoding="utf-8") as f:
            version = f.read().strip()

        model_path = self.models_dir / f"{target_name}_{version}.joblib"
        meta_path = self.models_dir / f"{target_name}_{version}.json"

        if not model_path.exists() or not meta_path.exists():
            logger.error(f"Registry artifacts missing for version '{version}'.")
            return None, None

        model = joblib.load(model_path)
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata = json.load(f)

        logger.info(f"Loaded production model version '{version}' for target '{target_name}'.")
        return model, metadata

    def get_model_history(self, target_name: str = None) -> list:
        """
        Retrieves complete history of all registered model versions, parameters, and metrics.
        """
        history = []
        json_files = list(self.models_dir.glob("*.json"))

        for meta_path in json_files:
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)

                if target_name and meta.get("target_name") != target_name:
                    continue

                t_name = meta.get("target_name")
                latest_pointer = self.models_dir / f"{t_name}_latest.txt"
                is_production = False
                if latest_pointer.exists():
                    with open(latest_pointer, "r", encoding="utf-8") as pf:
                        if pf.read().strip() == meta.get("version"):
                            is_production = True

                meta["status"] = "production" if is_production else "retired"
                history.append(meta)
            except Exception as e:
                logger.error(f"Error reading model metadata file {meta_path}: {e}")

        # Sort by creation date descending
        history.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return history

if __name__ == "__main__":
    from sklearn.linear_model import LinearRegression
    registry = ModelRegistry()
    m = LinearRegression()
    v = registry.save_model(m, "test_target", 10, {"mae": 1.2}, ["feat1", "feat2"])
    loaded_m, meta = registry.load_latest_model("test_target")
    print("Loaded metadata:", meta)
