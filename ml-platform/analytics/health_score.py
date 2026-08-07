class IAQHealthScoreCalculator:
    """
    Computes a composite 0-100 Indoor Air Quality Health Score weighted across
    Gas Concentration (MQ-135), Relative Humidity (DHT11), and Thermal Bounds (DS18B20).
    """

    @staticmethod
    def calculate_score(gas_ppm: float, temp_c: float, humidity_pct: float) -> dict:
        gas_ppm = float(gas_ppm) if gas_ppm is not None else 400.0
        temp_c = float(temp_c) if temp_c is not None else 22.0
        humidity_pct = float(humidity_pct) if humidity_pct is not None else 50.0

        gas_penalty = 0.0
        if gas_ppm > 400.0:
            if gas_ppm <= 800.0:
                gas_penalty = ((gas_ppm - 400.0) / 400.0) * 20.0
            elif gas_ppm <= 1500.0:
                gas_penalty = 20.0 + ((gas_ppm - 800.0) / 700.0) * 35.0
            else:
                gas_penalty = 55.0 + min(25.0, ((gas_ppm - 1500.0) / 1000.0) * 20.0)

        hum_penalty = 0.0
        if humidity_pct < 40.0:
            hum_penalty = min(20.0, ((40.0 - humidity_pct) / 40.0) * 20.0)
        elif humidity_pct > 60.0:
            hum_penalty = min(20.0, ((humidity_pct - 60.0) / 40.0) * 20.0)

        temp_penalty = 0.0
        if temp_c < 20.0:
            temp_penalty = min(15.0, ((20.0 - temp_c) / 20.0) * 15.0)
        elif temp_c > 25.0:
            temp_penalty = min(15.0, ((temp_c - 25.0) / 20.0) * 15.0)

        total_penalty = gas_penalty + hum_penalty + temp_penalty
        score = max(0.0, min(100.0, round(100.0 - total_penalty, 1)))

        if score >= 90.0:
            status = "Excellent"
            category = "🟢 EXCELLENT"
            color = "var(--accent-emerald)"
            badge = "active"
            summary = "Indoor air quality and thermal parameters are pristine. Ideal for health and productivity."
        elif score >= 75.0:
            status = "Good"
            category = "🟢 GOOD"
            color = "var(--accent-emerald)"
            badge = "active"
            summary = "Normal indoor conditions with minor environmental variances."
        elif score >= 60.0:
            status = "Moderate Warning"
            category = "🟡 MODERATE WARNING"
            color = "var(--accent-amber)"
            badge = "warning"
            summary = "Sub-optimal air quality or humidity. Increased ventilation recommended."
        else:
            status = "Hazardous"
            category = "🔴 HAZARDOUS"
            color = "var(--accent-rose)"
            badge = "critical"
            summary = "Unhealthy indoor environment. Elevated gas concentration or thermal stress detected."

        return {
            "score": score,
            "status": status,
            "category": category,
            "color": color,
            "badge": badge,
            "summary": summary,
            "penalties": {
                "gas_penalty": round(gas_penalty, 1),
                "humidity_penalty": round(hum_penalty, 1),
                "thermal_penalty": round(temp_penalty, 1),
            },
        }
