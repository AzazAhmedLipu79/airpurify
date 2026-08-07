import math

class ASHRAEComfortCalculator:
    """
    Implements ASHRAE Standard 55 Thermal Comfort Evaluation.
    Calculates Predicted Mean Vote (PMV) and Predicted Percentage Dissatisfied (PPD)
    approximations based on dry-bulb temperature (°C) and relative humidity (%).
    """

    @staticmethod
    def calculate_comfort(temp_c: float, humidity_pct: float) -> dict:
        temp_c = float(temp_c) if temp_c is not None else 22.0
        humidity_pct = float(humidity_pct) if humidity_pct is not None else 50.0

        # Ideal comfort baseline: 22°C, 50% RH
        temp_diff = temp_c - 22.0
        hum_diff = humidity_pct - 50.0

        # PMV Approximation (-3.0 Cold to +3.0 Hot)
        pmv = (0.28 * temp_diff) + (0.015 * hum_diff)
        pmv = max(-3.0, min(3.0, round(pmv, 2)))

        # PPD Approximation (%)
        ppd = 100.0 - 95.0 * math.exp(-0.03353 * (pmv ** 4) - 0.2179 * (pmv ** 2))
        ppd = max(5.0, min(100.0, round(ppd, 1)))

        # Thermal Comfort Status Classification
        if -0.5 <= pmv <= 0.5 and 30.0 <= humidity_pct <= 65.0:
            status = "Optimal Comfort"
            badge = "active"
            color = "var(--accent-emerald)"
            description = "Indoor climate meets ASHRAE 55 optimal thermal comfort standards. Peak cognitive productivity zone."
        elif pmv < -0.5 and humidity_pct < 35.0:
            status = "Cool & Dry (Respiratory Irritation Risk)"
            badge = "warning"
            color = "var(--accent-cyan)"
            description = "Low temperature and dry air increase mucosal dryness and respiratory susceptibility."
        elif pmv > 0.5 or humidity_pct > 68.0:
            status = "Hot & Humid (Thermal Fatigue Risk)"
            badge = "warning"
            color = "var(--accent-amber)"
            description = "Elevated humidity and thermal load reduce body cooling efficiency, causing lethargy."
        elif pmv > 1.8 or pmv < -1.8:
            status = "Severe Thermal Discomfort"
            badge = "critical"
            color = "var(--accent-rose)"
            description = "Environment significantly violates ASHRAE thermal comfort boundaries."
        else:
            status = "Moderate Thermal Comfort"
            badge = "active"
            color = "var(--accent-cyan)"
            description = "Acceptable thermal conditions with minor deviation from ideal baseline."

        return {
            "pmv": pmv,
            "ppd_percentage": ppd,
            "status": status,
            "badge": badge,
            "color": color,
            "description": description,
            "temperature_c": temp_c,
            "humidity_pct": humidity_pct,
        }
