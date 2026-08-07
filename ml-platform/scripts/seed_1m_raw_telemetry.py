import sys
import time
import math
import random
import logging
from pathlib import Path
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text

sys.path.append(str(Path(__file__).resolve().parent.parent))
from config.settings import DATABASE_URI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_1m_raw")

def generate_and_insert_1m_telemetry():
    engine = create_engine(DATABASE_URI, pool_pre_ping=True)
    logger.info(f"Connecting to MySQL database at {engine.url.host}...")
    
    total_metrics_target = 1000000
    num_timestamps = 200000 # 200,000 timestamps * 5 metrics = 1,000,000 rows
    
    logger.info(f"Generating {num_timestamps} timestamps x 5 metrics = {total_metrics_target} raw telemetry rows...")
    
    end_time = pd.Timestamp.now().floor("s")
    start_time = end_time - pd.Timedelta(seconds=num_timestamps * 3 - 3)
    timestamps = pd.date_range(start=start_time, end=end_time, periods=num_timestamps)
    
    sensor_specs = [
        {"sensor_id": 1, "metric": "temperature_ds18b20", "unit": "°C"},
        {"sensor_id": 2, "metric": "humidity_dht11", "unit": "%"},
        {"sensor_id": 3, "metric": "mq135_gas", "unit": "ppm"},
        {"sensor_id": 4, "metric": "temperature_dht11", "unit": "°C"},
        {"sensor_id": 5, "metric": "temperature_tmp36", "unit": "°C"},
    ]
    
    with engine.connect() as conn:
        logger.info("Clearing existing records in 'telemetry' table...")
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        conn.execute(text("TRUNCATE TABLE telemetry;"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        conn.commit()
        
        chunk_size = 10000 # 10k timestamps = 50k rows per batch
        total_inserted = 0
        start_exec_time = time.time()
        
        for idx in range(0, num_timestamps, chunk_size):
            ts_batch = timestamps[idx:idx + chunk_size]
            rows = []
            
            for seq_idx, dt in enumerate(ts_batch):
                seq_num = idx + seq_idx + 1
                hour = dt.hour
                minute = dt.minute
                day_of_week = dt.dayofweek
                
                # Temperature base sine curve
                temp_diurnal = 24.0 + 5.0 * math.sin(math.pi * (hour - 8.0) / 12.0)
                temp_ds18b20 = max(12.0, min(48.0, round(temp_diurnal + random.gauss(0, 0.3), 2)))
                temp_tmp36 = max(12.0, min(48.0, round(temp_ds18b20 + random.gauss(0, 0.15), 2)))
                temp_dht11 = max(12.0, min(48.0, round(temp_ds18b20 + 1.2 + random.gauss(0, 0.2), 2)))
                
                # Humidity base curve
                hum_diurnal = 57.5 - 17.5 * math.sin(math.pi * (hour - 8.0) / 12.0)
                hum_dht11 = max(20.0, min(98.0, round(hum_diurnal + random.gauss(0, 0.8), 2)))
                
                # Gas PPM base curve
                gas_base = 420.0 + random.gauss(0, 15.0)
                if day_of_week < 5 and 8 <= hour <= 9:
                    surge = math.sin(math.pi * ((hour * 60 + minute) - 480) / 90.0)
                    gas_base += max(0.0, surge * 1250.0)
                mq135_val = max(300.0, min(3500.0, round(gas_base, 2)))
                
                meas_str = dt.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
                rec_str = (dt + pd.Timedelta(milliseconds=random.randint(40, 120))).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
                
                quality = "good"
                rand_q = random.random()
                if rand_q > 0.995:
                    quality = "suspect"
                elif rand_q > 0.998:
                    quality = "out_of_range"

                metric_values = {
                    "temperature_ds18b20": temp_ds18b20,
                    "humidity_dht11": hum_dht11,
                    "mq135_gas": mq135_val,
                    "temperature_dht11": temp_dht11,
                    "temperature_tmp36": temp_tmp36,
                }

                for spec in sensor_specs:
                    rows.append({
                        "device_id": 1,
                        "sensor_id": spec["sensor_id"],
                        "metric": spec["metric"],
                        "value": metric_values[spec["metric"]],
                        "unit": spec["unit"],
                        "measured_at": meas_str,
                        "received_at": rec_str,
                        "quality": quality,
                        "sequence_number": seq_num,
                        "metadata": '{"latency_ms": 65}',
                        "created_at": meas_str,
                    })

            batch_df = pd.DataFrame(rows)
            batch_df.to_sql("telemetry", con=conn, if_exists="append", index=False, chunksize=5000)
            conn.commit()
            
            total_inserted += len(batch_df)
            elapsed = time.time() - start_exec_time
            logger.info(f"Progress: {total_inserted:,} / {total_metrics_target:,} raw telemetry rows inserted ({round(total_inserted/elapsed)} rows/sec)...")

        # Final Verification
        row_count = conn.execute(text("SELECT COUNT(*) FROM telemetry;")).scalar()
        logger.info(f"🎉 SUCCESS! Total Verified Rows in MySQL 'telemetry' table: {row_count:,}")

if __name__ == "__main__":
    generate_and_insert_1m_telemetry()
