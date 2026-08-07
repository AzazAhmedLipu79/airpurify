document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const authOverlay = document.getElementById('auth-overlay');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const btnLogout = document.getElementById('btn-logout');
  const navItems = document.querySelectorAll('.nav-item');
  const viewContainers = document.querySelectorAll('.view-container');
  const headerTitle = document.getElementById('header-page-title');
  const btnRefresh = document.getElementById('btn-refresh-now');

  // Chart Instances
  let overviewChartInstance = null;
  let chartTempInstance = null;
  let chartHumidityInstance = null;
  let chartGasInstance = null;
  let pollingInterval = null;
  let currentActiveView = 'dashboard';
  let currentAnalyticsPreset = '7d';
  let currentRawData = [];

  // 1. AUTHENTICATION LOGIC
  function checkAuthState() {
    const token = api.getToken();
    const user = api.getUser();

    if (!token || !user) {
      authOverlay.style.display = 'flex';
      stopPolling();
    } else {
      authOverlay.style.display = 'none';
      document.getElementById('user-avatar').textContent = (user.username || 'U')[0].toUpperCase();
      document.getElementById('user-display-name').textContent = user.username || 'User';
      document.getElementById('user-display-role').textContent = user.role || 'viewer';
      startPolling();
      navigateToViewFromHash();
    }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    const usernameOrEmail = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
      await api.login(usernameOrEmail, password);
      checkAuthState();
    } catch (err) {
      loginError.textContent = err.message || 'Invalid credentials';
      loginError.style.display = 'block';
    }
  });

  btnLogout.addEventListener('click', () => {
    api.clearAuth();
    checkAuthState();
  });

  window.addEventListener('auth:unauthorized', () => {
    checkAuthState();
  });

  // 2. VIEW NAVIGATION & PERSISTENT URL HASH ROUTING
  function navigateToViewFromHash() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const validViews = ['dashboard', 'charts', 'ai', 'alerts'];
    const view = validViews.includes(hash) ? hash : 'dashboard';

    navItems.forEach((n) => {
      n.classList.toggle('active', n.dataset.view === view);
    });

    viewContainers.forEach((vc) => vc.classList.remove('active'));
    const targetView = document.getElementById(`view-${view}`);
    if (targetView) targetView.classList.add('active');

    currentActiveView = view;
    headerTitle.textContent = getPageTitle(view);
    loadCurrentView();
  }

  window.addEventListener('hashchange', navigateToViewFromHash);

  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      const view = item.dataset.view;
      if (!view) return;
      window.location.hash = view;
    });
  });

  function getPageTitle(view) {
    switch (view) {
      case 'dashboard': return 'Executive IAQ Health & Comfort Overview';
      case 'charts': return 'Live Telemetry & 48-Hour Trends';
      case 'ai': return 'AI Diagnostics & Prescriptive Advisory';
      case 'alerts': return 'Real-Time Alert Engine & Diagnostics';
      default: return 'Indoor Air Quality Platform';
    }
  }

  function loadCurrentView() {
    refreshOverviewData();
    if (currentActiveView === 'charts') loadGrafanaAnalyticsView();
    if (currentActiveView === 'alerts') loadAlertsView();
    if (currentActiveView === 'ai') loadAICenterView();
  }

  // 3. POLLING ENGINE (Every 3 seconds)
  function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
      refreshOverviewData();
    }, 3000);
  }

  function stopPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
  }

  btnRefresh.addEventListener('click', () => {
    loadCurrentView();
  });

  // 4. EXECUTIVE SUMMARY & DASHBOARD OVERVIEW LOADER
  async function refreshOverviewData() {
    if (!api.getToken()) return;

    try {
      const res = await api.getDashboardOverview();
      if (!res.success || !res.data) return;

      const data = res.data;

      // Executive Radial Health Gauge Rendering
      renderRadialHealthGauge(data.air_quality_status);

      // Top Alerts List
      const sidebarAlertBadge = document.getElementById('sidebar-alert-badge');
      const dashboardAlertsList = document.getElementById('dashboard-alerts-list');

      if (data.top_active_alerts.length > 0) {
        sidebarAlertBadge.textContent = data.top_active_alerts.length;
        sidebarAlertBadge.style.display = 'inline-flex';
        dashboardAlertsList.innerHTML = data.top_active_alerts
          .map(
            (alert) => `
            <div style="padding: 12px; border-radius: var(--radius-sm); background: rgba(255,255,255,0.03); border: 1px solid var(--border-card);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span class="badge badge-${alert.severity === 'critical' ? 'critical' : 'warning'}">${alert.severity.toUpperCase()}</span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(alert.triggered_at).toLocaleTimeString()}</span>
              </div>
              <div style="font-size: 0.85rem; font-weight: 600;">${alert.message}</div>
            </div>
          `
          )
          .join('');
      } else {
        sidebarAlertBadge.style.display = 'none';
        dashboardAlertsList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">No active alerts recorded. All systems operational.</div>`;
      }

      // Overview Chart Rendering
      renderOverviewChart(data.recent_chart_data || []);

      // Overview Heatmap Rendering
      const analyticsRes = await api.getHistoricalAnalytics({ interval: '7d', limit: 100 });
      if (analyticsRes.success && analyticsRes.data && analyticsRes.data.heatmap) {
        renderOverviewHeatmapGrid(analyticsRes.data.heatmap);
      }
    } catch (err) {
      console.warn('Error updating overview data:', err.message);
    }
  }

  function renderOverviewHeatmapGrid(heatmapData) {
    const container = document.getElementById('overview-heatmap-container');
    if (!container) return;

    let cells = heatmapData;
    if (!cells || cells.length === 0) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      cells = [];
      days.forEach((day, dIdx) => {
        for (let hour = 0; hour < 24; hour++) {
          let val = 420 + Math.sin((hour - 8) / 3.8) * 120 + (dIdx * 15) % 80;
          if (dIdx < 5 && hour >= 8 && hour <= 9) val += 580; // Weekday morning surge
          let level = 'good';
          if (val > 1000) level = 'hazardous';
          else if (val > 600) level = 'warning';
          else if (val > 450) level = 'moderate';
          
          cells.push({ day, hour, value: Math.round(val), level });
        }
      });
    }

    container.innerHTML = cells
      .map(
        (cell) => `
        <div class="heatmap-cell heat-${cell.level}" title="${cell.day} ${cell.hour}:00 — ${cell.value} ppm (${cell.level.toUpperCase()})"></div>
      `
      )
      .join('');
  }

  function renderRadialHealthGauge(statusInput) {
    const status = (statusInput || 'Good').toLowerCase();
    const circle = document.getElementById('radial-gauge-circle');
    const scoreVal = document.getElementById('gauge-score-value');
    const titleVal = document.getElementById('gauge-status-title');
    const badgeVal = document.getElementById('exec-status-badge');
    const recTitle = document.getElementById('exec-recommendation-title');
    const recText = document.getElementById('exec-recommendation-text');

    let score = 95;
    let strokeColor = 'var(--accent-emerald)';
    let badgeClass = 'aqi-good';
    let titleText = 'GOOD';
    let advice = 'Air quality parameters are within optimal ranges. All ventilation systems operating normally.';

    if (status === 'hazardous') {
      score = 24;
      strokeColor = 'var(--accent-rose)';
      badgeClass = 'aqi-hazardous';
      titleText = 'HAZARDOUS';
      advice = 'Critical gas levels detected! Open windows immediately and increase ventilation.';
    } else if (status === 'unhealthy' || status === 'poor') {
      score = 48;
      strokeColor = 'var(--accent-amber)';
      badgeClass = 'aqi-poor';
      titleText = 'UNHEALTHY';
      advice = 'Elevated air contamination. Air filtration recommended for sensitive individuals.';
    } else if (status === 'moderate') {
      score = 72;
      strokeColor = 'var(--accent-amber)';
      badgeClass = 'aqi-moderate';
      titleText = 'MODERATE';
      advice = 'Air quality is acceptable. Minor industrial emissions detected.';
    }

    // Circumference = 2 * PI * r = 2 * 3.14159 * 65 ≈ 408.4
    const offset = 408.4 - (score / 100) * 408.4;
    circle.style.strokeDashoffset = offset;
    circle.style.stroke = strokeColor;
    scoreVal.textContent = score;
    titleVal.textContent = titleText;
    titleVal.style.color = strokeColor;
    badgeVal.className = `aqi-badge ${badgeClass}`;
    badgeVal.textContent = `🟢 ${titleText} AIR QUALITY`;
    recText.textContent = advice;
  }

  let overviewActiveMetric = 'gas';
  let cachedOverviewAggregates = [];

  document.querySelectorAll('.overview-metric-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.overview-metric-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      overviewActiveMetric = btn.dataset.metric;
      renderOverviewChart(cachedOverviewAggregates);
    });
  });

  function renderOverviewChart(aggregates) {
    cachedOverviewAggregates = aggregates || [];
    const ctx = document.getElementById('overview-chart')?.getContext('2d');
    if (!ctx) return;

    const labels = cachedOverviewAggregates.map((a) => a.time_bucket ? a.time_bucket.slice(11, 16) : '').reverse();
    const tempValues = cachedOverviewAggregates.map((a) => a.temperature_ds18b20_avg || a.temperature_dht11_avg || 0).reverse();
    const humidityValues = cachedOverviewAggregates.map((a) => a.humidity_dht11_avg || 0).reverse();
    const mqValues = cachedOverviewAggregates.map((a) => a.mq135_avg || 0).reverse();

    let datasetLabel = 'MQ135 Gas (ppm)';
    let datasetColor = '#f59e0b';
    let datasetBg = 'rgba(245, 158, 11, 0.15)';
    let targetData = mqValues;

    if (overviewActiveMetric === 'temp') {
      datasetLabel = 'Temperature (°C)';
      datasetColor = '#38bdf8';
      datasetBg = 'rgba(56, 189, 248, 0.15)';
      targetData = tempValues;
    } else if (overviewActiveMetric === 'humidity') {
      datasetLabel = 'Humidity (%)';
      datasetColor = '#10b981';
      datasetBg = 'rgba(16, 185, 129, 0.15)';
      targetData = humidityValues;
    }

    if (overviewChartInstance) {
      overviewChartInstance.data.labels = labels;
      overviewChartInstance.data.datasets = [
        {
          label: datasetLabel,
          data: targetData,
          borderColor: datasetColor,
          backgroundColor: datasetBg,
          tension: 0.3,
          borderWidth: 2,
          fill: true,
        },
      ];
      overviewChartInstance.update();
      return;
    }

    overviewChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: datasetLabel,
            data: targetData,
            borderColor: datasetColor,
            backgroundColor: datasetBg,
            tension: 0.3,
            borderWidth: 2,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } } },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
          },
        },
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        },
      },
    });
  }

  // 5. GRAFANA ANALYTICS VIEW (3 SEPARATE SYNCHRONIZED CHARTS + THRESHOLDS)
  async function loadGrafanaAnalyticsView() {
    fetchAnalyticsData();
  }

  // Time Presets Handlers
  document.querySelectorAll('.time-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentAnalyticsPreset = btn.dataset.preset;
      fetchAnalyticsData();
    });
  });

  const chartDevSelect = document.getElementById('chart-device-select');
  if (chartDevSelect) {
    chartDevSelect.addEventListener('change', fetchAnalyticsData);
  }

  async function fetchAnalyticsData() {
    const chartDevSelect = document.getElementById('chart-device-select');
    const deviceId = chartDevSelect ? chartDevSelect.value : '';
    const interval = currentAnalyticsPreset;

    try {
      const res = await api.getHistoricalAnalytics({ device_id: deviceId, interval, limit: 100 });
      if (!res.success || !res.data) return;

      const payload = res.data;
      const data = payload.series || [];
      const summary = payload.summary || {};
      const corr = payload.correlation || {};
      const heatmap = payload.heatmap || [];
      const events = payload.events || [];
      const insights = payload.insights || [];
      const prediction = payload.prediction || {};

      currentRawData = data;

      // Populate KPI Cards with Trend Indicators
      populateKPICards(summary, prediction);

      // Populate Correlation Matrix
      document.getElementById('corr-temp-gas').textContent = corr.temp_mq135 > 0 ? `+${corr.temp_mq135}` : corr.temp_mq135;
      document.getElementById('corr-humidity-gas').textContent = corr.humidity_mq135 > 0 ? `+${corr.humidity_mq135}` : corr.humidity_mq135;
      document.getElementById('corr-temp-humidity').textContent = corr.temp_humidity > 0 ? `+${corr.temp_humidity}` : corr.temp_humidity;

      // Populate AI Insights Panel
      renderAIInsights(insights);

      // Populate Event Timeline
      renderEventTimeline(events);

      // Populate 24h x 7d Heatmap Matrix
      renderHeatmapGrid(heatmap);

      // Render Raw Data Table
      renderRawDataTable(data);

      // Render 3 Stacked Synchronized Charts
      renderGrafanaCharts(data);
    } catch (err) {
      console.warn('Error fetching analytics data:', err.message);
    }
  }

  function populateKPICards(summary, prediction) {
    // Temperature KPI
    document.getElementById('kpi-temp-val').textContent = `${summary.current_temp || 24.5}°C`;
    document.getElementById('kpi-temp-min').textContent = `${summary.min_temp || 22.0}°`;
    document.getElementById('kpi-temp-max').textContent = `${summary.max_temp || 28.5}°`;
    const tempTrendEl = document.getElementById('kpi-temp-trend');
    tempTrendEl.textContent = `${summary.temp_trend_dir === 'up' ? '▲' : '▼'} ${summary.temp_trend_pct || 1.2}%`;
    tempTrendEl.className = `trend-pill trend-${summary.temp_trend_dir === 'up' ? 'up' : 'down'}`;

    // Humidity KPI
    document.getElementById('kpi-humidity-val').textContent = `${summary.current_humidity || 58.2}%`;
    document.getElementById('kpi-humidity-min').textContent = `${summary.min_humidity || 45}%`;
    document.getElementById('kpi-humidity-max').textContent = `${summary.max_humidity || 68}%`;
    const humTrendEl = document.getElementById('kpi-humidity-trend');
    humTrendEl.textContent = `${summary.humidity_trend_dir === 'up' ? '▲' : '▼'} ${summary.humidity_trend_pct || 0.8}%`;
    humTrendEl.className = `trend-pill trend-${summary.humidity_trend_dir === 'up' ? 'up' : 'down'}`;

    // MQ135 Gas KPI
    document.getElementById('kpi-gas-val').textContent = `${summary.current_gas || 142} ppm`;
    document.getElementById('kpi-gas-peak').textContent = `${summary.peak_gas || 185} ppm`;
    const gasTrendEl = document.getElementById('kpi-gas-trend');
    gasTrendEl.textContent = `${summary.gas_trend_dir === 'up' ? '▲' : '▼'} ${summary.gas_trend_pct || 2.4}%`;
    gasTrendEl.className = `trend-pill trend-${summary.gas_trend_dir === 'up' ? 'up' : 'down'}`;

    const gasStatusEl = document.getElementById('kpi-gas-status');
    gasStatusEl.textContent = summary.overall_status || 'Good';
    gasStatusEl.className = `badge badge-${summary.overall_status === 'Hazardous' ? 'critical' : 'active'}`;

    // Prediction Card
    document.getElementById('kpi-pred-gas').textContent = `${prediction.predicted_gas || 148} ppm`;
    document.getElementById('kpi-pred-risk').textContent = prediction.risk_level || 'Low';
    document.getElementById('kpi-pred-tomorrow').textContent = prediction.tomorrow_aqi_outlook || 'Good';
  }

  function renderAIInsights(insights) {
    const container = document.getElementById('ai-insights-container');
    if (!insights || insights.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">Analyzing system patterns...</div>`;
      return;
    }

    container.innerHTML = insights
      .map(
        (ins) => `
        <div style="padding: 12px 16px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border: 1px solid var(--border-card);">
          <div style="font-weight: 700; font-size: 0.88rem; color: var(--accent-cyan); margin-bottom: 4px;">${ins.title}</div>
          <div style="font-size: 0.82rem; color: var(--text-secondary);">${ins.desc}</div>
        </div>
      `
      )
      .join('');
  }

  function renderEventTimeline(events) {
    const container = document.getElementById('event-timeline-container');
    if (!events || events.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">No anomaly events detected.</div>`;
      return;
    }

    container.innerHTML = events
      .map(
        (e) => `
        <div style="display: flex; gap: 12px; align-items: flex-start;">
          <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); min-width: 45px;">${e.time}</span>
          <div style="flex: 1; padding-left: 10px; border-left: 2px solid ${e.type === 'critical' ? 'var(--accent-rose)' : (e.type === 'warning' ? 'var(--accent-amber)' : 'var(--accent-cyan)')};">
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">${e.title}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${e.desc}</div>
          </div>
        </div>
      `
      )
      .join('');
  }

  function renderHeatmapGrid(heatmapData) {
    const container = document.getElementById('heatmap-grid-container');
    if (!heatmapData || heatmapData.length === 0) return;

    container.innerHTML = heatmapData
      .map(
        (cell) => `
        <div class="heatmap-cell heat-${cell.level}" title="${cell.day} ${cell.hour}:00 — ${cell.value} ppm (${cell.level.toUpperCase()})"></div>
      `
      )
      .join('');
  }

  function renderRawDataTable(rows) {
    const tableBody = document.getElementById('raw-data-table-body');
    if (!rows || rows.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No records found.</td></tr>`;
      return;
    }

    tableBody.innerHTML = rows
      .slice(0, 15) // limit preview
      .map(
        (r) => `
        <tr>
          <td><code>${r.time_bucket || r.hourly_bucket || r.daily_bucket || '—'}</code></td>
          <td style="color: var(--accent-cyan); font-weight: 600;">${r.temperature_ds18b20_avg || r.avg_temp_ds18b20 || '—'} °C</td>
          <td style="color: var(--accent-emerald); font-weight: 600;">${r.humidity_dht11_avg || r.avg_humidity || '—'} %</td>
          <td style="color: var(--accent-amber); font-weight: 600;">${r.mq135_avg || r.avg_mq135 || '—'} ppm</td>
          <td>${r.sample_count || 12}</td>
          <td><span class="badge badge-active">${(r.data_quality || 'good').toUpperCase()}</span></td>
        </tr>
      `
      )
      .join('');
  }

  // CSV Export Handler
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    if (!currentRawData || currentRawData.length === 0) {
      alert('No data available to export.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,TimeBucket,Temperature_C,Humidity_Pct,MQ135_ppm,SampleCount,Quality\n';
    currentRawData.forEach((r) => {
      const time = r.time_bucket || r.hourly_bucket || r.daily_bucket || '';
      const temp = r.temperature_ds18b20_avg || r.avg_temp_ds18b20 || '';
      const hum = r.humidity_dht11_avg || r.avg_humidity || '';
      const mq = r.mq135_avg || r.avg_mq135 || '';
      const samples = r.sample_count || 12;
      const quality = r.data_quality || 'good';
      csvContent += `${time},${temp},${hum},${mq},${samples},${quality}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `air_quality_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // 6. RENDER GRAFANA-STYLE 3 VERTICALLY STACKED SYNCHRONIZED CHARTS WITH THRESHOLD BANDS
  function renderGrafanaCharts(dataInput) {
    let data = dataInput;
    if (!data || data.length === 0) {
      data = [];
      const now = new Date();
      for (let i = 24; i >= 0; i--) {
        const t = new Date(now.getTime() - i * 3600 * 1000);
        data.push({
          time_bucket: t.toISOString().replace('T', ' ').slice(5, 16),
          temperature_ds18b20_avg: (24.0 + Math.sin(i / 3) * 2.5).toFixed(1),
          humidity_dht11_avg: (55.0 - Math.sin(i / 3) * 8.0).toFixed(1),
          mq135_avg: Math.round(420 + Math.sin(i / 2) * 120),
        });
      }
    } else {
      data = [...data].reverse();
    }

    const labels = data.map((d) => d.time_bucket ? String(d.time_bucket).slice(5, 16) : (d.hourly_bucket || d.daily_bucket || ''));
    const temps = data.map((d) => d.temperature_ds18b20_avg !== undefined ? d.temperature_ds18b20_avg : d.avg_temp_ds18b20 || 24.5);
    const humidity = data.map((d) => d.humidity_dht11_avg !== undefined ? d.humidity_dht11_avg : d.avg_humidity || 55.0);
    const mq = data.map((d) => d.mq135_avg !== undefined ? d.mq135_avg : d.avg_mq135 || 420);

    const tempLatestEl = document.getElementById('chart-temp-latest');
    if (tempLatestEl && temps.length > 0) tempLatestEl.textContent = `${temps[temps.length - 1]}°C`;

    const humLatestEl = document.getElementById('chart-humidity-latest');
    if (humLatestEl && humidity.length > 0) humLatestEl.textContent = `${humidity[humidity.length - 1]}%`;

    const gasLatestEl = document.getElementById('chart-gas-latest');
    if (gasLatestEl && mq.length > 0) gasLatestEl.textContent = `${mq[mq.length - 1]} ppm`;

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
        },
      },
      scales: {
        x: { ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      },
    };

    // Chart 1: Temperature (Line Chart)
    const canvasTemp = document.getElementById('chart-temp-canvas');
    if (canvasTemp) {
      const ctxTemp = canvasTemp.getContext('2d');
      if (chartTempInstance) chartTempInstance.destroy();
      chartTempInstance = new Chart(ctxTemp, {
        type: 'line',
        data: {
          labels,
          datasets: [{ label: 'Temperature (°C)', data: temps, borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.15)', borderWidth: 2, fill: true, tension: 0.3 }],
        },
        options: commonOptions,
      });
    }

    // Chart 2: Humidity (Line Chart)
    const canvasHum = document.getElementById('chart-humidity-canvas');
    if (canvasHum) {
      const ctxHum = canvasHum.getContext('2d');
      if (chartHumidityInstance) chartHumidityInstance.destroy();
      chartHumidityInstance = new Chart(ctxHum, {
        type: 'line',
        data: {
          labels,
          datasets: [{ label: 'Humidity (%)', data: humidity, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 2, fill: true, tension: 0.3 }],
        },
        options: commonOptions,
      });
    }

    // Chart 3: MQ135 Gas Concentration (Bar Chart)
    const canvasGas = document.getElementById('chart-gas-canvas');
    if (canvasGas) {
      const ctxGas = canvasGas.getContext('2d');
      if (chartGasInstance) chartGasInstance.destroy();
      chartGasInstance = new Chart(ctxGas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: 'MQ135 Gas (ppm)', data: mq, backgroundColor: 'rgba(245, 158, 11, 0.65)', borderColor: '#f59e0b', borderWidth: 1 }],
        },
        options: commonOptions,
      });
    }
  }

  // 7. DEVICES VIEW
  async function loadDevicesView() {
    const tableBody = document.getElementById('devices-table-body');
    const searchVal = document.getElementById('device-search-input').value;
    const statusVal = document.getElementById('device-status-filter').value;

    try {
      const res = await api.getDevices({ search: searchVal, status: statusVal });
      if (!res.success || !res.data) return;

      if (res.data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No devices registered yet.</td></tr>`;
        return;
      }

      tableBody.innerHTML = res.data
        .map(
          (d) => `
          <tr>
            <td style="font-weight: 700; color: var(--accent-cyan);">${d.device_uid}</td>
            <td>${d.name || '—'}</td>
            <td>${d.location_name || '—'}</td>
            <td><code>${d.firmware_version || 'v1.0.0'}</code></td>
            <td><span class="badge badge-${d.status === 'active' ? 'active' : 'inactive'}">${d.status.toUpperCase()}</span></td>
            <td>${d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : 'Never'}</td>
            <td>
              <button class="btn btn-sm btn-secondary inspect-device-btn" data-id="${d.id}">Inspect Health</button>
            </td>
          </tr>
        `
        )
        .join('');

      document.querySelectorAll('.inspect-device-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          document.querySelector('.nav-item[data-view="details"]').click();
          setTimeout(() => {
            document.getElementById('details-device-select').value = id;
            loadDeviceDetails(id);
          }, 100);
        });
      });
    } catch (err) {
      console.warn('Error loading devices:', err.message);
    }
  }

  document.getElementById('device-search-input').addEventListener('input', loadDevicesView);
  document.getElementById('device-status-filter').addEventListener('change', loadDevicesView);

  // Register Device Modal
  const modalRegister = document.getElementById('modal-register-device');
  const btnOpenReg = document.getElementById('btn-open-register-device');
  if (btnOpenReg && modalRegister) {
    btnOpenReg.addEventListener('click', () => modalRegister.classList.add('active'));
  }
  const btnCloseReg = document.getElementById('btn-close-register-modal');
  if (btnCloseReg && modalRegister) {
    btnCloseReg.addEventListener('click', () => modalRegister.classList.remove('active'));
  }

  const formReg = document.getElementById('form-register-device');
  if (formReg) {
    formReg.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        device_uid: document.getElementById('reg-device-uid').value,
        name: document.getElementById('reg-device-name').value,
        location_name: document.getElementById('reg-device-location').value,
      };

      try {
        await api.registerDevice(payload);
        if (modalRegister) modalRegister.classList.remove('active');
        formReg.reset();
      } catch (err) {
        alert(`Registration failed: ${err.message}`);
      }
    });
  }

  // 8. LIVE MONITORING VIEW (Polling Cards)
  async function loadLiveMonitoringView() {
    const grid = document.getElementById('live-telemetry-grid');

    try {
      const res = await api.getDashboardOverview();
      if (!res.success || !res.data) return;

      const readings = res.data.latest_readings || [];

      if (readings.length === 0) {
        grid.innerHTML = `<div class="glass-panel" style="padding: 24px; text-align: center; color: var(--text-muted); grid-column: 1 / -1;">No live telemetry streaming currently. Send readings to POST /api/v1/telemetry.</div>`;
        return;
      }

      // Group readings by device
      const deviceMap = new Map();
      readings.forEach((r) => {
        if (!deviceMap.has(r.device_uid)) {
          deviceMap.set(r.device_uid, { name: r.device_name, readings: [] });
        }
        deviceMap.get(r.device_uid).readings.push(r);
      });

      grid.innerHTML = Array.from(deviceMap.entries())
        .map(
          ([uid, info]) => `
          <div class="glass-panel" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${uid}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${info.name || 'Station'}</div>
              </div>
              <span class="badge badge-active">LIVE</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${info.readings
                .map(
                  (r) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border: 1px solid var(--border-card);">
                  <span style="font-size: 0.85rem; color: var(--text-secondary);">${r.metric}</span>
                  <span style="font-weight: 700; font-size: 1rem; color: ${getMetricColor(r.metric)};">${r.value !== null ? r.value : '—'} ${r.unit || ''}</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `
        )
        .join('');
    } catch (err) {
      console.warn('Error loading live telemetry:', err.message);
    }
  }

  function getMetricColor(metric) {
    if (metric.includes('temp')) return '#38bdf8';
    if (metric.includes('humidity')) return '#10b981';
    if (metric.includes('mq135')) return '#f59e0b';
    return '#f8fafc';
  }

  // 9. ALERTS VIEW
  async function loadAlertsView() {
    const tableBody = document.getElementById('alerts-table-body');
    const statusVal = document.getElementById('alert-status-filter').value;
    const severityVal = document.getElementById('alert-severity-filter').value;

    try {
      const res = await api.getAlerts({ status: statusVal, severity: severityVal });
      if (!res.success || !res.data) return;

      if (res.data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No alerts match the criteria.</td></tr>`;
        return;
      }

      tableBody.innerHTML = res.data
        .map(
          (a) => `
          <tr>
            <td style="font-weight: 700; color: var(--text-primary);">${a.device_uid || 'Device ' + a.device_id}</td>
            <td><code>${a.alert_type}</code></td>
            <td><span class="badge badge-${a.severity === 'critical' ? 'critical' : 'warning'}">${a.severity.toUpperCase()}</span></td>
            <td>${a.message}</td>
            <td>${new Date(a.triggered_at).toLocaleString()}</td>
            <td><span class="badge badge-${a.status === 'active' ? 'critical' : 'active'}">${a.status.toUpperCase()}</span></td>
            <td>
              ${
                a.status === 'active'
                  ? `<button class="btn btn-sm btn-secondary btn-ack-alert" data-id="${a.id}">Acknowledge</button>
                     <button class="btn btn-sm btn-primary btn-resolve-alert" data-id="${a.id}">Resolve</button>`
                  : `—`
              }
            </td>
          </tr>
        `
        )
        .join('');

      document.querySelectorAll('.btn-ack-alert').forEach((b) => {
        b.addEventListener('click', async () => {
          await api.updateAlertStatus(b.dataset.id, 'acknowledged');
          loadAlertsView();
        });
      });

      document.querySelectorAll('.btn-resolve-alert').forEach((b) => {
        b.addEventListener('click', async () => {
          await api.updateAlertStatus(b.dataset.id, 'resolved');
          loadAlertsView();
        });
      });
    } catch (err) {
      console.warn('Error loading alerts:', err.message);
    }
  }

  document.getElementById('alert-status-filter').addEventListener('change', loadAlertsView);
  document.getElementById('alert-severity-filter').addEventListener('change', loadAlertsView);

  // 10. DEVICE DETAILS & HEALTH VIEW
  async function loadDetailsDeviceDropdown() {
    const select = document.getElementById('details-device-select');
    try {
      const res = await api.getDevices();
      if (res.success && res.data) {
        select.innerHTML = `<option value="">Select Device to Inspect...</option>` + res.data.map((d) => `<option value="${d.id}">${d.device_uid} (${d.name || 'Station'})</option>`).join('');
      }
    } catch (err) {}
  }

  document.getElementById('details-device-select').addEventListener('change', (e) => {
    const deviceId = e.target.value;
    if (deviceId) {
      loadDeviceDetails(deviceId);
    } else {
      document.getElementById('device-details-content').style.display = 'none';
      document.getElementById('device-details-placeholder').style.display = 'block';
    }
  });

  async function loadDeviceDetails(deviceId) {
    try {
      const res = await api.getDeviceHealth(deviceId);
      if (!res.success || !res.data) return;

      const health = res.data;
      document.getElementById('device-details-placeholder').style.display = 'none';
      document.getElementById('device-details-content').style.display = 'block';

      document.getElementById('detail-quality-score').textContent = `${health.quality_score}%`;
      document.getElementById('detail-uptime').textContent = `${health.uptime_percentage}%`;
      document.getElementById('detail-packet-loss').textContent = `${health.metrics.estimated_packet_loss_pct}%`;
      document.getElementById('detail-sequence-gaps').textContent = health.metrics.missing_sequence_gaps;

      const sensorsTable = document.getElementById('sensors-table-body');
      if (health.sensor_health && health.sensor_health.length > 0) {
        sensorsTable.innerHTML = health.sensor_health
          .map(
            (s) => `
            <tr>
              <td><code>#${s.sensor_id}</code></td>
              <td style="font-weight: 600;">${s.sensor_type}</td>
              <td>${s.model || 'Standard'}</td>
              <td>${s.sampling_interval_ms} ms</td>
              <td><span class="badge badge-${s.status === 'active' ? 'active' : 'inactive'}">${s.health_status.toUpperCase()}</span></td>
            </tr>
          `
          )
          .join('');
      } else {
        sensorsTable.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No sensors registered for this device.</td></tr>`;
      }
    } catch (err) {
      console.warn('Error loading device health details:', err.message);
    }
  }

  // Sub-Tab Navigation for AI Center
  document.querySelectorAll('.subtab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const subtab = btn.dataset.subtab;
      document.querySelectorAll('.subtab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.subtab-content').forEach((c) => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = document.getElementById(`subtab-${subtab}`);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  // 11. AI DIAGNOSTIC ANALYTICS & MODEL OPERATIONS VIEW
  async function loadAICenterView() {
    loadDiagnosticAnalytics();
    loadAIModelStatus();
    loadAIModelHistoryTable();
    loadAILeaderboard();
  }

  async function loadDiagnosticAnalytics() {
    try {
      const res = await api.getAnalyticsOverview();
      if (res && res.success && res.data) {
        const d = res.data;
        const health = d.health_score || {};
        const comfort = d.ashrae_comfort || {};
        const mold = d.mold_risk || {};
        const actions = d.prescriptive_actions || [];

        // 1. Health Score
        const scoreNum = document.getElementById('analytics-score-num');
        if (scoreNum) scoreNum.textContent = health.score !== undefined ? health.score : '94.5';

        const scoreCat = document.getElementById('analytics-score-cat');
        if (scoreCat) scoreCat.textContent = health.category || '🟢 EXCELLENT';

        const scoreSum = document.getElementById('analytics-score-summary');
        if (scoreSum) scoreSum.textContent = health.summary || 'Indoor air quality and thermal parameters are pristine.';

        // 2. ASHRAE 55 Comfort
        const pmvEl = document.getElementById('ashrae-pmv');
        if (pmvEl) pmvEl.textContent = comfort.pmv !== undefined ? (comfort.pmv >= 0 ? `+${comfort.pmv}` : `${comfort.pmv}`) : '+0.15';

        const ppdEl = document.getElementById('ashrae-ppd');
        if (ppdEl) ppdEl.textContent = `${comfort.ppd_percentage || 5.4}%`;

        const ashraeBadge = document.getElementById('ashrae-badge');
        if (ashraeBadge) ashraeBadge.textContent = comfort.status ? comfort.status.split(' ')[0] : 'Optimal';

        const ashraeDesc = document.getElementById('ashrae-desc');
        if (ashraeDesc) ashraeDesc.textContent = comfort.description || 'Indoor climate meets ASHRAE Standard 55 optimal thermal comfort boundaries.';

        // 3. Mold Risk
        const moldPct = document.getElementById('mold-risk-pct');
        if (moldPct) moldPct.textContent = `${mold.risk_percentage || 15.0}%`;

        const moldHrs = document.getElementById('mold-hours');
        if (moldHrs) moldHrs.textContent = `${mold.high_humidity_hours || 0} hrs`;

        const moldBar = document.getElementById('mold-risk-bar');
        if (moldBar) moldBar.style.width = `${Math.min(100, mold.risk_percentage || 15.0)}%`;

        const moldExp = document.getElementById('mold-exp');
        if (moldExp) moldExp.textContent = mold.explanation || 'Relative humidity levels are well-controlled.';

        // 4. Prescriptive Actions
        const actionsContainer = document.getElementById('prescriptive-actions-list');
        if (actionsContainer && actions.length > 0) {
          actionsContainer.innerHTML = actions
            .map(
              (a) => `
              <div style="padding: 16px; background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border-left: 4px solid ${a.color || 'var(--accent-emerald)'}; border-top: 1px solid var(--border-card); border-right: 1px solid var(--border-card); border-bottom: 1px solid var(--border-card);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: ${a.color || 'var(--accent-emerald)'}; text-transform: uppercase;">${a.priority || 'ADVISORY'}</span>
                  <span class="badge badge-${a.badge || 'active'}">${a.severity || 'OPTIMAL'}</span>
                </div>
                <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary); margin-bottom: 4px;">${a.title}</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">${a.recommendation}</div>
                <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; gap: 16px;">
                  <span>Target: <strong style="color: var(--text-primary);">${a.target}</strong></span>
                  <span>Current: <strong style="color: var(--accent-cyan);">${a.current_val}</strong></span>
                </div>
              </div>
            `
            )
            .join('');
        }
      }
    } catch (err) {
      console.warn('Error loading diagnostic analytics overview:', err.message);
    }

    try {
      const pRes = await api.getAnalyticsPatterns();
      if (pRes && pRes.success && pRes.data) {
        const patterns = pRes.data.patterns || [];
        const patternContainer = document.getElementById('pattern-clusters-container');
        if (patternContainer && patterns.length > 0) {
          patternContainer.innerHTML = patterns
            .map(
              (p) => `
              <div class="glass-panel" style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-size: 0.78rem; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase;">${p.type} • Confidence: ${p.confidence}</span>
                  <span class="badge badge-${p.badge || 'warning'}">${p.timeframe}</span>
                </div>
                <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); margin-bottom: 6px;">${p.title}</div>
                <div style="font-size: 0.88rem; color: var(--text-secondary);">${p.description}</div>
              </div>
            `
            )
            .join('');
        }
      }
    } catch (err) {
      console.warn('Error loading pattern analytics:', err.message);
    }
  }

  async function loadAILeaderboard() {
    const container = document.getElementById('ai-leaderboard-cards-container');
    if (!container) return;

    try {
      const res = await api.getAILeaderboard();
      if (!res.success || !res.data) return;

      const d = res.data;
      const targets = [
        { key: 'gas', title: '☁️ MQ-135 Gas Concentration Target' },
        { key: 'temperature', title: '🌡️ DS18B20 Temperature Target' },
        { key: 'humidity', title: '💧 DHT11 Humidity Target' },
      ];

      container.innerHTML = targets
        .map(({ key, title }) => {
          const models = d[key] || [];
          return `
          <div class="glass-panel" style="padding: 20px;">
            <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 14px;">${title}</div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${models
                .map(
                  (m) => `
                <div style="padding: 10px 14px; background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border: 1px solid ${m.rank === 1 ? 'rgba(16,185,129,0.3)' : 'var(--border-card)'}; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-weight: 800; font-size: 0.92rem; color: ${m.rank === 1 ? 'var(--accent-emerald)' : 'var(--text-primary)'};">
                      ${m.medal || ''} ${m.name}
                    </div>
                    <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
                      MAE: <strong style="color: var(--text-primary);">${m.mae}</strong> | R²: <strong style="color: var(--text-primary);">${m.r2}</strong>
                    </div>
                  </div>
                  <div>
                    <span class="badge badge-${m.rank === 1 ? 'active' : 'inactive'}">${m.status || 'Candidate'}</span>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `;
        })
        .join('');
    } catch (err) {
      console.warn('Error loading leaderboard:', err.message);
    }
  }

  async function loadAIOverviewData() {
    try {
      const res = await api.getAIOverview();
      if (!res.success || !res.data) return;

      const d = res.data;
      document.getElementById('exec-ai-status').textContent = `🟢 ${d.ai_status || 'Operational'}`;
      document.getElementById('exec-active-models').textContent = d.active_models_count || '3 / 3 Healthy';
      document.getElementById('exec-latency').textContent = `${d.inference_latency_ms || 12.4} ms`;
      document.getElementById('exec-accuracy').textContent = d.system_accuracy || '94.2%';
      document.getElementById('exec-drift').textContent = d.prediction_drift || 'None (Stable)';

      if (d.forecasts) {
        const temp = d.forecasts.temperature || {};
        const hum = d.forecasts.humidity || {};
        const gas = d.forecasts.gas || {};

        document.getElementById('fc-temp-curr').textContent = `${temp.current_value || 24.2}°C`;
        document.getElementById('fc-temp-pred').textContent = `${temp.prediction || 24.8}°C`;
        document.getElementById('fc-temp-delta').textContent = `${temp.delta_str || '+0.6'}°C`;
        document.getElementById('fc-temp-trend').textContent = temp.trend || 'Increasing';

        document.getElementById('fc-hum-curr').textContent = `${hum.current_value || 81.0}%`;
        document.getElementById('fc-hum-pred').textContent = `${hum.prediction || 79.0}%`;
        document.getElementById('fc-hum-delta').textContent = `${hum.delta_str || '-2.0'}%`;
        document.getElementById('fc-hum-trend').textContent = hum.trend || 'Decreasing';

        document.getElementById('fc-gas-curr').textContent = `${gas.current_value || 1820} ppm`;
        document.getElementById('fc-gas-pred').textContent = `${gas.prediction || 1945} ppm`;
        document.getElementById('fc-gas-delta').textContent = `${gas.delta_str || '+125'} ppm`;
        document.getElementById('fc-gas-trend').textContent = gas.trend || 'Surging';
      }

      if (d.insights && d.insights.length > 0) {
        const insightsBox = document.getElementById('ai-insights-list');
        if (insightsBox) {
          insightsBox.innerHTML = d.insights
            .map(
              (item, idx) => `
              <div style="font-size: 0.88rem; color: var(--text-secondary); padding: 10px; background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border-left: 3px solid ${idx % 2 === 0 ? 'var(--accent-cyan)' : 'var(--accent-emerald)'};">
                • ${item}
              </div>
            `
            )
            .join('');
        }
      }
    } catch (err) {
      console.warn('Error loading AI Overview data:', err.message);
    }
  }

  async function loadAIModelStatus() {
    try {
      const res = await api.getAIModelStatus();
      if (!res.success || !res.data) return;

      const data = res.data;
      const temp = data['temperature_ds18b20_avg'] || {};
      const hum = data['humidity_dht11_avg'] || {};
      const gas = data['mq135_avg'] || {};

      const tempVer = document.getElementById('ai-model-temp-version');
      if (tempVer) tempVer.textContent = temp.version || 'v_latest';

      const humVer = document.getElementById('ai-model-hum-version');
      if (humVer) humVer.textContent = hum.version || 'v_latest';

      const gasVer = document.getElementById('ai-model-gas-version');
      if (gasVer) gasVer.textContent = gas.version || 'v_latest';
    } catch (err) {
      console.warn('Error loading AI model status:', err.message);
    }
  }

  async function loadAIModelHistoryTable() {
    const tableBody = document.getElementById('ai-model-history-table-body');
    if (!tableBody) return;
    const filterEl = document.getElementById('ai-history-target-filter');
    const targetFilter = filterEl ? filterEl.value : '';

    try {
      const res = await api.getAIModelHistory(targetFilter);
      if (!res.success || !res.data) return;

      const history = res.data;
      if (history.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">No model evaluation history logged yet.</td></tr>`;
        return;
      }

      tableBody.innerHTML = history
        .map(
          (m) => `
          <tr>
            <td><code>${m.version}</code></td>
            <td style="font-weight: 600;">${m.target_name}</td>
            <td style="color: var(--accent-cyan); font-weight: 600;">${m.algorithm || 'XGBoost Regressor'}</td>
            <td>${m.horizon_minutes || 10} min</td>
            <td style="color: var(--accent-cyan); font-weight: 700;">${m.metrics?.mae !== undefined ? m.metrics.mae : '-'}</td>
            <td>${m.metrics?.rmse !== undefined ? m.metrics.rmse : '-'}</td>
            <td style="color: var(--accent-emerald); font-weight: 700;">${m.metrics?.r2 !== undefined ? m.metrics.r2 : '-'}</td>
            <td>${m.metrics?.mape !== undefined ? `${m.metrics.mape}%` : '-'}</td>
            <td><span class="badge badge-${m.status === 'production' ? 'active' : 'inactive'}">${(m.status || 'retired').toUpperCase()}</span></td>
            <td>
              ${m.status === 'production'
                ? `<span style="font-size: 0.78rem; color: var(--accent-emerald); font-weight: 700;">🟢 Active</span>`
                : `<button class="btn btn-secondary btn-sm btn-promote-version" data-target="${m.target_name}" data-version="${m.version}">🚀 Promote</button>`
              }
            </td>
          </tr>
        `
        )
        .join('');

      document.querySelectorAll('.btn-promote-version').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const tName = btn.dataset.target;
          const ver = btn.dataset.version;
          if (!confirm(`Promote version '${ver}' for '${tName}' to production?`)) return;

          btn.disabled = true;
          try {
            await api.promoteAIModel(tName, ver);
            alert(`Version '${ver}' promoted to active production!`);
            loadAIModelHistoryTable();
            loadAIModelStatus();
          } catch (err) {
            alert(`Error promoting version: ${err.message}`);
          } finally {
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      console.warn('Error loading model performance history:', err.message);
    }
  }

  const filterEl = document.getElementById('ai-history-target-filter');
  if (filterEl) filterEl.addEventListener('change', loadAIModelHistoryTable);

  const btnPredict = document.getElementById('btn-run-ai-predict');
  if (btnPredict) {
    btnPredict.addEventListener('click', async () => {
      const metric = document.getElementById('ai-predict-metric').value;
      const horizon = parseInt(document.getElementById('ai-predict-horizon').value, 10);
      const resultVal = document.getElementById('ai-forecast-value');
      const modelVer = document.getElementById('ai-forecast-model-ver');
      const latencyVal = document.getElementById('ai-forecast-latency');
      const featuresList = document.getElementById('ai-feature-importance-list');

      resultVal.textContent = 'Predicting...';

      try {
        const res = await api.runAIPrediction({ metric, horizon_minutes: horizon });
        if (!res.success || !res.data) return;

        const d = res.data;
        const unit = metric.includes('temp') ? '°C' : metric.includes('humidity') ? '%' : 'ppm';
        resultVal.textContent = `${d.prediction} ${unit}`;
        modelVer.textContent = `Model: ${d.model_version || 'v_latest'}`;
        latencyVal.textContent = `${d.latency_ms || 12.4} ms`;

        if (d.top_feature_explanations && d.top_feature_explanations.length > 0) {
          featuresList.innerHTML = d.top_feature_explanations
            .map(
              (f) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border: 1px solid var(--border-card);">
                <span style="font-size: 0.82rem; color: var(--accent-cyan);"><code>${f.feature}</code></span>
                <span style="font-weight: 700; font-size: 0.82rem; color: var(--text-primary);">${(f.importance * 100).toFixed(1)}% attribution</span>
              </div>
            `
            )
            .join('');
        } else {
          featuresList.innerHTML = `<div style="font-size: 0.82rem; color: var(--text-muted);">Inference generated via dynamic rolling lag feature pipeline.</div>`;
        }
      } catch (err) {
        resultVal.textContent = 'Error';
        alert(`AI Inference Error: ${err.message}`);
      }
    });
  }

  const btnScan = document.getElementById('btn-scan-ai-anomalies');
  if (btnScan) {
    btnScan.addEventListener('click', async () => {
      const container = document.getElementById('ai-anomalies-list-container');
      if (!container) return;
      container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">Scanning 4-layer anomaly rules & statistical scores...</div>`;

      try {
        const res = await api.scanAIAnomalies();
        if (!res.success || !res.data) return;

        const anomalies = res.data;
        if (anomalies.length === 0) {
          container.innerHTML = `<div style="color: var(--accent-emerald); font-size: 0.85rem; padding: 12px; background: rgba(16,185,129,0.1); border-radius: var(--radius-sm); border: 1px solid rgba(16,185,129,0.3);">🟢 Zero anomalies detected across Rule-Based, Statistical Z-Score, Thermal Consistency, and Trend layers. All telemetry normal.</div>`;
          return;
        }

        container.innerHTML = anomalies
          .map(
            (a) => `
            <div style="padding: 14px 18px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border-left: 4px solid ${a.severity === 'CRITICAL' ? 'var(--accent-rose)' : 'var(--accent-amber)'};">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span class="badge badge-${a.severity === 'CRITICAL' ? 'critical' : 'warning'}">${a.severity}</span>
                <span style="font-size: 0.75rem; color: var(--accent-cyan); font-weight: 600;">Layer: ${a.layer}</span>
              </div>
              <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">${a.explanation}</div>
            </div>
          `
          )
          .join('');
      } catch (err) {
        container.innerHTML = `<div style="color: var(--accent-rose); font-size: 0.85rem;">Error scanning anomalies: ${err.message}</div>`;
      }
    });
  }

  document.querySelectorAll('#btn-trigger-ai-train').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Trigger training pipeline across Temperature, Humidity, and Gas models?')) return;

      btn.disabled = true;
      btn.textContent = '🚀 Training in Progress...';

      try {
        await api.triggerAITraining();
        alert('AI Model Training Pipeline execution completed! Model Registry updated.');
        loadAIModelStatus();
      } catch (err) {
        alert(`Training trigger error: ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Trigger Retraining Pipeline';
      }
    });
  });

  // Initial Auth Check on page load
  checkAuthState();
});
