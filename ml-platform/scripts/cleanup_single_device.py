import sys
import logging
from pathlib import Path
from sqlalchemy import create_engine, text

sys.path.append(str(Path(__file__).resolve().parent.parent))
from config.settings import DATABASE_URI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("single_device_cleanup")

def cleanup_database_to_single_device():
    engine = create_engine(DATABASE_URI, pool_pre_ping=True)
    logger.info(f"Connecting to MySQL database at {engine.url.host}...")

    with engine.connect() as conn:
        # Disable foreign key checks temporarily
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        
        # 1. Clear devices table and insert exactly 1 primary device
        logger.info("Cleaning up devices table to keep only 1 single primary device...")
        conn.execute(text("TRUNCATE TABLE devices;"))
        
        insert_single_device_sql = """
            INSERT INTO devices (
                id, device_uid, name, firmware_version, status, last_seen_at, location_name,
                latitude, longitude, metadata, created_at, updated_at
            ) VALUES (
                1, 'DEV-NODE-001', 'Air Quality Monitoring Station', 'v2.1.0', 'active', NOW(),
                'Indoor Environment', 24.8949, 91.8687, '{"environment": "indoor", "primary": true}', NOW(), NOW()
            );
        """
        conn.execute(text(insert_single_device_sql))
        conn.commit()

        # 2. Update telemetry and telemetry_1min records to map all data to device_id = 1
        logger.info("Cleaning telemetry tables for non-primary devices...")
        conn.execute(text("DELETE FROM telemetry WHERE device_id != 1;"))
        conn.execute(text("DELETE FROM telemetry_1min WHERE device_id != 1;"))
        
        if conn.dialect.has_table(conn, "alerts"):
            conn.execute(text("UPDATE alerts SET device_id = 1 WHERE device_id != 1;"))
            
        if conn.dialect.has_table(conn, "anomalies"):
            conn.execute(text("UPDATE anomalies SET device_id = 1 WHERE device_id != 1;"))

        # Re-enable foreign key checks
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        conn.commit()

        # Verification
        device_count = conn.execute(text("SELECT COUNT(*) FROM devices;")).scalar()
        device_row = conn.execute(text("SELECT id, device_uid, name, status FROM devices;")).fetchone()
        
        logger.info(f"✅ Success! Single Device in Database: ID={device_row[0]}, UID={device_row[1]}, Name='{device_row[2]}', Status={device_row[3]}")
        logger.info(f"Verified Total Devices Count: {device_count}")

if __name__ == "__main__":
    cleanup_database_to_single_device()
