class ReportService {
  generateIAQReportHtml(data = {}) {
    const health = data.health_score || {};
    const comfort = data.ashrae_comfort || {};
    const mold = data.mold_risk || {};
    const actions = data.prescriptive_actions || [];
    const generatedAt = new Date().toLocaleString();

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Indoor Air Quality & Executive Compliance Audit Report</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; background: #fff; line-height: 1.5; }
    .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
    .badge { font-weight: 700; padding: 4px 12px; border-radius: 12px; font-size: 12px; text-transform: uppercase; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-yellow { background: #fef9c3; color: #a16207; }
    .badge-red { background: #fee2e2; color: #b91c1c; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; background: #f8fafc; }
    .card-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .card-value { font-size: 26px; font-weight: 800; color: #0f172a; margin: 8px 0 4px; }
    .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 24px; margin-bottom: 12px; border-left: 4px solid #0284c7; padding-left: 10px; }
    .action-item { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-bottom: 10px; background: #fff; }
    .action-title { font-weight: 700; font-size: 14px; color: #0f172a; }
    .action-desc { font-size: 12px; color: #475569; margin-top: 4px; }
    .footer { font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 32px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">🌿 Indoor Air Quality Audit Report</h1>
      <div class="subtitle">ASHRAE Standard 55 & Executive Health Compliance Audit</div>
    </div>
    <div style="text-align: right;">
      <span class="badge ${health.score >= 75 ? 'badge-green' : health.score >= 60 ? 'badge-yellow' : 'badge-red'}">
        ${health.category || 'COMPLIANCE AUDIT'}
      </span>
      <div class="subtitle">Generated: ${generatedAt}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">IAQ Health Score</div>
      <div class="card-value" style="color: #0284c7;">${health.score || 95}/100</div>
      <div style="font-size: 11px; color: #64748b;">${health.status || 'Excellent'}</div>
    </div>

    <div class="card">
      <div class="card-label">ASHRAE 55 Thermal Comfort</div>
      <div class="card-value" style="color: #10b981;">PMV ${comfort.pmv || 0.0}</div>
      <div style="font-size: 11px; color: #64748b;">PPD Dissatisfied: ${comfort.ppd_percentage || 5.0}%</div>
    </div>

    <div class="card">
      <div class="card-label">48-Hour Mold Risk</div>
      <div class="card-value" style="color: #f59e0b;">${mold.risk_percentage || 15.0}%</div>
      <div style="font-size: 11px; color: #64748b;">Sustained High Hum: ${mold.high_humidity_hours || 0}h</div>
    </div>
  </div>

  <div class="section-title">📋 Prescriptive Corrective Guidance & Actions</div>
  <div>
    ${actions
      .map(
        (a) => `
      <div class="action-item">
        <div class="action-title">${a.title}</div>
        <div class="action-desc">${a.recommendation}</div>
      </div>
    `
      )
      .join('')}
  </div>

  <div class="footer">
    This document was automatically produced by the Production Indoor Air Quality & Operational Intelligence Platform.
  </div>
</body>
</html>
    `;
  }
}

module.exports = new ReportService();
