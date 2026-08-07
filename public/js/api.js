const API_BASE_URL = '/api/v1';

class ApiClient {
  getToken() {
    return localStorage.getItem('jwt_token');
  }

  setToken(token) {
    localStorage.setItem('jwt_token', token);
  }

  getUser() {
    const raw = localStorage.getItem('user_data');
    return raw ? JSON.parse(raw) : null;
  }

  setUser(user) {
    localStorage.setItem('user_data', JSON.stringify(user));
  }

  clearAuth() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_data');
  }

  buildQueryString(params = {}) {
    const cleanParams = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanParams[key] = value;
      }
    }
    const query = new URLSearchParams(cleanParams).toString();
    return query ? `?${query}` : '';
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.clearAuth();
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (err) {
      throw err;
    }
  }

  // Auth Endpoints
  async login(usernameOrEmail, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, password }),
    });
    if (res.success && res.data.accessToken) {
      this.setToken(res.data.accessToken);
      this.setUser(res.data.user);
    }
    return res;
  }

  // Dashboard Overview
  async getDashboardOverview() {
    return await this.request('/dashboard/overview');
  }

  // Devices Endpoints
  async getDevices(params = {}) {
    return await this.request(`/devices${this.buildQueryString(params)}`);
  }

  async getDeviceById(id) {
    return await this.request(`/devices/${id}`);
  }

  async registerDevice(payload) {
    return await this.request('/devices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Analytics Endpoints
  async getHistoricalAnalytics(params = {}) {
    return await this.request(`/analytics/historical${this.buildQueryString(params)}`);
  }

  // Alerts Endpoints
  async getAlerts(params = {}) {
    return await this.request(`/alerts${this.buildQueryString(params)}`);
  }

  async updateAlertStatus(id, status) {
    return await this.request(`/alerts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Health Endpoints
  async getDeviceHealth(deviceId) {
    return await this.request(`/health/devices/${deviceId}`);
  }

  // AI & Analytics Endpoints
  async getAnalyticsOverview(params = {}) {
    return await this.request(`/analytics/overview${this.buildQueryString(params)}`);
  }

  async getAnalyticsPatterns(params = {}) {
    return await this.request(`/analytics/patterns${this.buildQueryString(params)}`);
  }

  async getAIOverview(params = {}) {
    return await this.request(`/ai/overview${this.buildQueryString(params)}`);
  }

  async getAILeaderboard() {
    return await this.request('/ai/leaderboard');
  }

  async getAIModelStatus() {
    return await this.request('/ai/model-status');
  }

  async getAIModelHistory(target) {
    const query = target ? `?target=${target}` : '';
    return await this.request(`/ai/model-history${query}`);
  }

  async triggerAITraining(params = {}) {
    return await this.request('/ai/train', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async promoteAIModel(target_name, version) {
    return await this.request('/ai/promote', {
      method: 'POST',
      body: JSON.stringify({ target_name, version }),
    });
  }

  async runAIPrediction(payload = {}) {
    return await this.request('/ai/predict', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async scanAIAnomalies(deviceId) {
    const query = deviceId ? `?device_id=${deviceId}` : '';
    return await this.request(`/ai/anomalies${query}`);
  }

  async triggerAITraining() {
    return await this.request('/ai/train', {
      method: 'POST',
      body: JSON.stringify({ tune_hyperparameters: false }),
    });
  }
}

const api = new ApiClient();
