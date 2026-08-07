import sys
import time
import math
import random
import logging
from pathlib import Path
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text

# Add ml-platform parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config.settings import DATABASE_URI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_telemetry")

def generate_versatile_data(num_records: int = 10000) -> pd.DataFrame:
    """
    Generates 10,000 highly realistic, versatile telemetry aggregate records
    over ~7 days with diurnal cycles, morning HVAC surges, thermal sensor offsets,
    and intermittent realistic environmental anomalies.
    """
    logger.info(f"Generating {num_records} versatile telemetry aggregate records...")
    
    end_time = pd.Timestamp.now().floor("min")
    start_time = end_time - pd.Timedelta(minutes=num_records - 1)
    timestamps = pd.date_range(start=start_time, end=end_time, freq="1min")
    
    records = []
    
    # State tracking for continuous anomaly duration
    gas_anomaly_remaining = 0
    gas_anomaly_boost = 0.0
    
    hum_anomaly_remaining = 0
    hum_anomaly_boost = 0.0
    
    for i, dt in enumerate(timestamps):
        hour = dt.hour
        minute = dt.minute
        day_of_week = dt.dayofweek
        
        # 1. Base Diurnal Temperature Cycle (19°C night to 29°C day peak at 14:00)
        temp_diurnal = 24.0 + 5.0 * math.sin(math.pi * (hour - 8.0) / 12.0)
        temp_noise = random.gauss(0, 0.3)
        temp_ds18b20 = temp_diurnal + temp_noise
        
        # Multi-Sensor Thermal Derivatives
        temp_tmp36 = temp_ds18b20 + random.gauss(0, 0.15)
        # DHT11 systematically reads ~1.2°C higher due to self-heating
        temp_dht11 = temp_ds18b20 + 1.2 + random.gauss(0, 0.2)
        
        # 2. Base Diurnal Humidity Cycle (Inverted to Temp: 40% day to 75% night)
        hum_diurnal = 57.5 - 17.5 * math.sin(math.pi * (hour - 8.0) / 12.0)
        hum_noise = random.gauss(0, 0.8)
        hum_dht11 = hum_diurnal + hum_noise
        
        # 3. Gas Concentration Baseline & Occupancy Surges
        gas_base = 420.0 + random.gauss(0, 15.0)
        
        # Morning HVAC & Occupancy Surge (08:00 - 09:30 on weekdays)
        if day_of_week < 5 and 8 <= hour <= 9:
            surge_factor = math.sin(math.pi * ((hour * 60 + minute) - 480) / 90.0)
            gas_base += max(0.0, surge_factor * 1250.0)
            
        # Evening Off-Hours Circulation Reduction (19:00 - 21:00)
        if 19 <= hour <= 21:
            hum_dht11 += 6.5
            gas_base += 150.0

        # 4. Trigger Intermittent Realistic Anomaly Events
        if gas_anomaly_remaining > 0:
            gas_base += gas_anomaly_boost
            gas_anomaly_remaining -= 1
        elif random.random() < 0.002: # 0.2% chance to trigger gas surge event
            gas_anomaly_remaining = random.randint(15, 45) # 15-45 minutes
            gas_anomaly_boost = random.uniform(800.0, 1600.0)
            
        if hum_anomaly_remaining > 0:
            hum_dht11 += hum_anomaly_boost
            hum_anomaly_remaining -= 1
        elif random.random() < 0.001: # 0.1% chance for humidity accumulation event
            hum_anomaly_remaining = random.randint(60, 180) # 1-3 hours
            hum_anomaly_boost = random.uniform(18.0, 28.0)

        # Clamping bounds
        temp_ds18b20 = max(12.0, min(48.0, round(temp_ds18b20, 2)))
        temp_tmp36 = max(12.0, min(48.0, round(temp_tmp36, 2)))
        temp_dht11 = max(12.0, min(48.0, round(temp_dht11, 2)))
        hum_dht11 = max(20.0, min(98.0, round(hum_dht11, 2)))
        mq135_val = max(300.0, min(3500.0, round(gas_base, 2)))
        
        # Min/Max ranges around average
        record = {
            "device_id": 1,
            "time_bucket": dt.strftime("%Y-%m-%d %H:%M:%S"),
            "temperature_ds18b20_avg": temp_ds18b20,
            "temperature_ds18b20_min": round(temp_ds18b20 - random.uniform(0.1, 0.4), 2),
            "temperature_ds18b20_max": round(temp_ds18b20 + random.uniform(0.1, 0.4), 2),
            "temperature_dht11_avg": temp_dht11,
            "temperature_tmp36_avg": temp_tmp36,
            "humidity_dht11_avg": hum_dht11,
            "humidity_dht11_min": round(hum_dht11 - random.uniform(0.2, 0.8), 2),
            "humidity_dht11_max": round(hum_dht11 + random.uniform(0.2, 0.8), 2),
            "mq135_avg": mq135_val,
            "mq135_min": round(mq135_val - random.uniform(2.0, 10.0), 2),
            "mq135_max": round(mq135_val + random.uniform(2.0, 10.0), 2),
            "sample_count": 12,
            "data_quality": "good",
            "created_at": dt.strftime("%Y-%m-%d %H:%M:%S"),
        }
        records.append(record)
        
    return pd.DataFrame(records)

def seed_database(num_records: int = 10000):
    engine = create_engine(DATABASE_URI, pool_pre_ping=True)
    df = generate_versatile_data(num_records=num_records)
    
    logger.info(f"Connecting to MySQL database at {engine.url.host}...")
    
    with engine.connect() as conn:
        logger.info("Clearing existing sample data in telemetry_1min...")
        conn.execute(text("TRUNCATE TABLE telemetry_1min;"))
        conn.commit()
        
        logger.info(f"Inserting {len(df)} versatile 1-minute aggregate records in batch...")
        df.to_sql("telemetry_1min", con=conn, if_exists="append", index=False, chunksize=2500)
        conn.commit()
        
        # Verify row count
        count_res = conn.execute(text("SELECT COUNT(*) FROM telemetry_1min;")).scalar()
        logger.info(f"✅ Success! Total verified records in 'telemetry_1min': {count_res}")

if __name__ == "__main__":
    seed_database(100000)
