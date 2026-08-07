# Dashboard & Analytics Visualizations Specification

The frontend is a single-page application (SPA) built with Vanilla CSS and Chart.js, delivering a Grafana/Datadog-grade monitoring experience.

---

## 🎨 Visualization Components & Algorithms

### 1. Executive Summary & SVG Radial Health Gauge
- **Health Score Math**: Evaluates MQ-135 Gas concentration (ppm) to generate a score (0–100):
  - `< 150 ppm`: Score **95** (GOOD) — Emerald Ring (`#10b981`)
  - `150–300 ppm`: Score **72** (MODERATE) — Amber Ring (`#f59e0b`)
  - `300–500 ppm`: Score **48** (UNHEALTHY) — Amber/Orange Ring
  - `> 500 ppm`: Score **24** (HAZARDOUS) — Rose Ring (`#ef4444`)
- **SVG Math**: Calculates `stroke-dashoffset` dynamically on a radius of 65px (Circumference ≈ 408.4px).

---

### 2. Grafana-Style Stacked Synchronized Charts
- **Dedicated Canvas Units**:
  - Chart 1: Temperature (°C) with Good (20–28°C) & Warning (>30°C) threshold regions.
  - Chart 2: Relative Humidity (%) with Optimal (40–70%) threshold regions.
  - Chart 3: MQ-135 Gas Concentration (ppm) with Safe (<150), Moderate (150–300), and Hazardous (>500) background bands.
- **Synchronized Hover Crosshairs**: Hovering over a timestamp on any chart aligns tooltips across all 3 charts simultaneously.

---

### 3. Pearson Correlation Analysis Matrix
Formula:
$$r = \frac{\sum (x - \bar{x})(y - \bar{y})}{\sqrt{\sum (x - \bar{x})^2 \sum (y - \bar{y})^2}}$$

Calculates real-time linear relationship coefficients:
- `Temperature ↔ MQ135 Gas` (`+0.72` Direct thermal emission)
- `Humidity ↔ MQ135 Gas` (`-0.35` Inverse moisture dissipation)
- `Temperature ↔ Humidity` (`-0.60` Inverse relative humidity)

---

### 4. 24-Hour x 7-Day Air Quality Intensity Heatmap
- **Matrix Grid**: 7 Days (Sun–Sat) x 24 Hours (00:00–23:00) cell array.
- **Cell Color Grading**:
  - `heat-good`: `< 150 ppm` (Emerald)
  - `heat-moderate`: `150–300 ppm` (Amber)
  - `heat-danger`: `300–500 ppm` (Orange)
  - `heat-hazardous`: `> 500 ppm` (Dark Rose)

---

### 5. Persistent Hash Navigation & CSV Export
- **Hash Navigation**: Retains view state in URL (`#dashboard`, `#charts`, `#live`, `#devices`, `#alerts`, `#details`).
- **CSV Data Downloader**: Generates client-side `.csv` exports of aggregated raw records.
