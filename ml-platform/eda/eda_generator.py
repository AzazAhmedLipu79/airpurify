import logging
import os
import pandas as pd
import numpy as np
from config.settings import REPORTS_DIR

logger = logging.getLogger("ml_platform.eda")

class EDAReporter:
    def __init__(self, reports_dir=REPORTS_DIR):
        self.reports_dir = reports_dir

    def generate_report(self, df: pd.DataFrame, filename: str = "eda_report.html") -> str:
        """
        Generates a comprehensive EDA HTML Report.
        """
        if df.empty:
            logger.warning("Empty DataFrame provided for EDA report.")
            return ""

        summary_stats = df.describe().to_html(classes="table table-striped")
        missing_values = df.isnull().sum().to_frame("Missing Count").to_html(classes="table")
        
        # Outlier Detection via IQR for key metrics
        outlier_summary = []
        for col in ["temperature_ds18b20_avg", "humidity_dht11_avg", "mq135_avg"]:
            if col in df.columns:
                q1 = df[col].quantile(0.25)
                q3 = df[col].quantile(0.75)
                iqr = q3 - q1
                lower = q1 - 1.5 * iqr
                upper = q3 + 1.5 * iqr
                outliers = df[(df[col] < lower) | (df[col] > upper)]
                outlier_summary.append({
                    "Metric": col,
                    "Lower Bound": round(lower, 2),
                    "Upper Bound": round(upper, 2),
                    "Outlier Count": len(outliers),
                    "Outlier Pct": f"{round(len(outliers) / len(df) * 100, 2)}%"
                })
        
        outlier_df = pd.DataFrame(outlier_summary).to_html(classes="table")
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        corr_matrix = df[numeric_cols].corr().round(2).to_html(classes="table")

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>IoT Air Quality EDA & Statistical Analysis Report</title>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; }}
                h1, h2, h3 {{ color: #38bdf8; }}
                .section {{ background: rgba(30, 41, 59, 0.7); padding: 24px; margin-bottom: 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 0.85rem; color: #cbd5e1; }}
                th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }}
                th {{ background-color: rgba(56, 189, 248, 0.15); color: #38bdf8; }}
            </style>
        </head>
        <body>
            <h1>💨 IoT Air Quality Automated EDA Report</h1>
            <p>Dataset Sample Size: <strong>{len(df)} 1-minute time buckets</strong></p>

            <div class="section">
                <h2>📊 Statistical Summary</h2>
                {summary_stats}
            </div>

            <div class="section">
                <h2>⚠️ Outlier Analysis (IQR Method)</h2>
                {outlier_df}
            </div>

            <div class="section">
                <h2>🔍 Missing Values Audit</h2>
                {missing_values}
            </div>

            <div class="section">
                <h2>⚡ Feature Correlation Matrix</h2>
                {corr_matrix}
            </div>
        </body>
        </html>
        """

        output_path = os.path.join(self.reports_dir, filename)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        logger.info(f"Generated EDA HTML report at {output_path}")
        return output_path

if __name__ == "__main__":
    from database.db_loader import DataLoader
    loader = DataLoader()
    raw = loader.load_historical_aggregates(limit=500)
    reporter = EDAReporter()
    report_file = reporter.generate_report(raw)
    print("EDA Report Path:", report_file)
