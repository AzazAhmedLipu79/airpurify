import sys
from pathlib import Path

# Add ml-platform parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

import pytest
import pandas as pd
from analytics.ashrae_comfort import ASHRAEComfortCalculator
from analytics.health_score import IAQHealthScoreCalculator
from analytics.mold_risk import MoldRiskTracker
from analytics.pattern_analyzer import PatternAnalyzer
from analytics.prescriptive_engine import PrescriptiveActionEngine

def test_ashrae_comfort_calculator():
    res = ASHRAEComfortCalculator.calculate_comfort(22.0, 50.0)
    assert res["status"] == "Optimal Comfort"
    assert -0.5 <= res["pmv"] <= 0.5
    assert res["ppd_percentage"] <= 10.0

def test_health_score_calculator():
    res_pristine = IAQHealthScoreCalculator.calculate_score(380.0, 22.0, 50.0)
    assert res_pristine["score"] == 100.0
    assert res_pristine["status"] == "Excellent"

    res_severe = IAQHealthScoreCalculator.calculate_score(1800.0, 32.0, 85.0)
    assert res_severe["score"] < 60.0
    assert res_severe["badge"] == "critical"

def test_mold_risk_tracker():
    timestamps = pd.date_range(end=pd.Timestamp.now(), periods=2880, freq="1min")
    df = pd.DataFrame({
        "time_bucket": timestamps,
        "humidity_dht11_avg": [75.0 if i > 1000 else 50.0 for i in range(2880)],
        "temperature_ds18b20_avg": 24.0,
    })
    res = MoldRiskTracker.calculate_mold_risk(df)
    assert res["high_humidity_hours"] > 0
    assert "risk_percentage" in res

def test_pattern_analyzer():
    timestamps = pd.date_range(end=pd.Timestamp.now(), periods=500, freq="1min")
    df = pd.DataFrame({
        "time_bucket": timestamps,
        "mq135_avg": 450.0,
        "humidity_dht11_avg": 50.0,
        "temperature_ds18b20_avg": 22.0,
    })
    res = PatternAnalyzer.analyze_patterns(df)
    assert "total_patterns_detected" in res
    assert len(res["patterns"]) > 0

def test_prescriptive_engine():
    health = IAQHealthScoreCalculator.calculate_score(1500.0, 28.0, 78.0)
    comfort = ASHRAEComfortCalculator.calculate_comfort(28.0, 78.0)
    mold = {"risk_percentage": 65.0}
    latest = {"mq135_avg": 1500.0, "humidity_dht11_avg": 78.0, "temperature_ds18b20_avg": 28.0}

    actions = PrescriptiveActionEngine.generate_recommendations(health, comfort, mold, latest)
    assert len(actions) > 0
    assert any(a["severity"] == "CRITICAL" for a in actions)
