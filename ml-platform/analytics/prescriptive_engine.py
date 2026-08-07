class PrescriptiveActionEngine:
    """
    Evaluates real-time IAQ metrics, ASHRAE thermal comfort, mold risk, and sensor health
    to generate prioritized, actionable corrective guidance.
    """

    @staticmethod
    def generate_recommendations(
        health_data: dict, comfort_data: dict, mold_data: dict, latest_telemetry: dict
    ) -> list:
        actions = []

        gas_ppm = latest_telemetry.get("mq135_avg", 400.0) if latest_telemetry else 400.0
        humidity_pct = latest_telemetry.get("humidity_dht11_avg", 50.0) if latest_telemetry else 50.0
        temp_c = latest_telemetry.get("temperature_ds18b20_avg", 22.0) if latest_telemetry else 22.0

        # Action 1: High Gas Concentration Surge
        if gas_ppm > 1000.0:
            actions.append({
                "id": "act_gas_surge",
                "priority": "HIGH PRIORITY",
                "severity": "CRITICAL",
                "badge": "critical",
                "color": "var(--accent-rose)",
                "title": "Activate Fresh Air Ventilation / Exhaust Fans Immediately",
                "target": "Indoor Gas Concentration",
                "current_val": f"{round(gas_ppm, 1)} ppm",
                "threshold": "1000.0 ppm",
                "recommendation": "MQ-135 sensor recorded critical air contamination. Open fresh air dampers or trigger high-speed exhaust fans to purge stagnant air.",
            })

        # Action 2: High Relative Humidity / Mold Danger
        if humidity_pct > 70.0 or mold_data.get("risk_percentage", 0) > 40.0:
            actions.append({
                "id": "act_humidity_mold",
                "priority": "MEDIUM PRIORITY",
                "severity": "WARNING",
                "badge": "warning",
                "color": "var(--accent-amber)",
                "title": "Increase HVAC Dehumidification Cycle",
                "target": "Relative Humidity & Mold Risk",
                "current_val": f"{round(humidity_pct, 1)}%",
                "threshold": "65.0%",
                "recommendation": f"Sustained relative humidity ({round(humidity_pct, 1)}%) increases mold spore germination risk ({mold_data.get('risk_percentage', 0)}%). Increase AC cooling cycle or activate dedicated dehumidifiers.",
            })

        # Action 3: Thermal Discomfort
        pmv = comfort_data.get("pmv", 0.0)
        if pmv > 1.0:
            actions.append({
                "id": "act_thermal_hot",
                "priority": "COMFORT ADVISORY",
                "severity": "WARNING",
                "badge": "warning",
                "color": "var(--accent-amber)",
                "title": "Lower Air Conditioning Setpoint",
                "target": "ASHRAE 55 Thermal Comfort",
                "current_val": f"{round(temp_c, 1)}°C (PMV +{pmv})",
                "threshold": "24.0°C",
                "recommendation": "Indoor temperature exceeds optimal ASHRAE thermal comfort boundary. Reduce thermostat setpoint by 1.5°C.",
            })
        elif pmv < -1.0:
            actions.append({
                "id": "act_thermal_cold",
                "priority": "COMFORT ADVISORY",
                "severity": "WARNING",
                "badge": "warning",
                "color": "var(--accent-cyan)",
                "title": "Increase Heating Flow / Reduce Fan Draft Speed",
                "target": "ASHRAE 55 Thermal Comfort",
                "current_val": f"{round(temp_c, 1)}°C (PMV {pmv})",
                "threshold": "20.0°C",
                "recommendation": "Indoor environment is cool and dry. Increase heating distribution or reduce cold draft velocity.",
            })

        # Default Optimal Action if no warnings
        if not actions:
            actions.append({
                "id": "act_optimal",
                "priority": "ROUTINE",
                "severity": "OPTIMAL",
                "badge": "active",
                "color": "var(--accent-emerald)",
                "title": "Optimal Air Quality Maintained — No Action Needed",
                "target": "Composite IAQ Health Score",
                "current_val": f"{health_data.get('score', 95.0)} / 100",
                "threshold": "75.0 / 100",
                "recommendation": "All environmental sensors indicate pristine indoor air quality and thermal comfort. Continue current ventilation schedule.",
            })

        return actions
