import logging
import pandas as pd
from sqlalchemy import create_engine, text
from config.settings import DATABASE_URI

logger = logging.getLogger("ml_platform.db_loader")
logging.basicConfig(level=logging.INFO)

class DataLoader:
    def __init__(self, db_uri: str = DATABASE_URI):
        self.engine = create_engine(db_uri, pool_pre_ping=True, pool_size=10, max_overflow=20)

    def load_historical_aggregates(self, device_id: int = None, limit: int = 50000) -> pd.DataFrame:
        """
        Extract historical 1-min telemetry aggregates from MySQL.
        """
        query = """
            SELECT 
                id,
                device_id,
                time_bucket,
                temperature_ds18b20_avg,
                temperature_dht11_avg,
                temperature_tmp36_avg,
                humidity_dht11_avg,
                mq135_avg,
                temperature_ds18b20_min,
                temperature_ds18b20_max,
                humidity_dht11_min,
                humidity_dht11_max,
                mq135_min,
                mq135_max,
                sample_count,
                data_quality,
                created_at
            FROM telemetry_1min
        """
        params = {}
        if device_id is not None:
            query += " WHERE device_id = :device_id"
            params["device_id"] = device_id

        query += " ORDER BY time_bucket ASC LIMIT :limit"
        params["limit"] = limit

        try:
            with self.engine.connect() as conn:
                df = pd.read_sql(text(query), conn, params=params)
                if not df.empty and "time_bucket" in df.columns:
                    df["time_bucket"] = pd.to_datetime(df["time_bucket"])
                logger.info(f"Loaded {len(df)} historical aggregate records from MySQL.")
                return df
        except Exception as e:
            logger.error(f"Error loading telemetry aggregates from MySQL: {str(e)}")
            return pd.DataFrame()

    def load_recent_window(self, device_id: int = None, minutes: int = 120) -> pd.DataFrame:
        """
        Extract recent window of 1-min aggregates for real-time feature computation & inference.
        """
        query = """
            SELECT * FROM telemetry_1min
            WHERE time_bucket >= NOW() - INTERVAL :minutes MINUTE
        """
        params = {"minutes": minutes}
        if device_id is not None:
            query += " AND device_id = :device_id"
            params["device_id"] = device_id

        query += " ORDER BY time_bucket ASC"

        try:
            with self.engine.connect() as conn:
                df = pd.read_sql(text(query), conn, params=params)
                if not df.empty and "time_bucket" in df.columns:
                    df["time_bucket"] = pd.to_datetime(df["time_bucket"])
                return df
        except Exception as e:
            logger.error(f"Error loading recent window: {str(e)}")
            return pd.DataFrame()

if __name__ == "__main__":
    loader = DataLoader()
    data = loader.load_historical_aggregates(limit=10)
    print("Sample Loaded Data:")
    print(data.head())
