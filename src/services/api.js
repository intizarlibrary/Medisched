const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('medisched_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }
  return data;
}

export const api = {
  // Auth API
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  async registerPatient(userData) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  },

  async registerClinic(clinicData) {
    const res = await fetch(`${API_BASE}/auth/register-clinic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clinicData)
    });
    return handleResponse(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updateProfile(profileData) {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    return handleResponse(res);
  },

  // Doctors & Search API
  async getDoctorSettings() {
    const res = await fetch(`${API_BASE}/doctors/me/settings`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updateDoctorSettings(settingsData) {
    const res = await fetch(`${API_BASE}/doctors/me/settings`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(settingsData)
    });
    return handleResponse(res);
  },

  async getDoctors(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.specialty_id) params.append('specialty_id', filters.specialty_id);
    if (filters.clinic_id) params.append('clinic_id', filters.clinic_id);
    if (filters.is_general !== undefined && filters.is_general !== '') {
      params.append('is_general', filters.is_general);
    }
    if (filters.city) params.append('city', filters.city);
    if (filters.date) params.append('date', filters.date);

    const res = await fetch(`${API_BASE}/doctors?${params.toString()}`);
    return handleResponse(res);
  },

  async getDoctor(id) {
    const res = await fetch(`${API_BASE}/doctors/${id}`);
    return handleResponse(res);
  },

  async getDoctorSlots(id, date) {
    const res = await fetch(`${API_BASE}/doctors/${id}/slots?date=${date}`);
    return handleResponse(res);
  },

  async getDoctorAvailability(id, date) {
    return this.getDoctorSlots(id, date);
  },

  async getSpecialties() {
    const res = await fetch(`${API_BASE}/doctors/specialties/all`);
    return handleResponse(res);
  },

  async getClinics() {
    const res = await fetch(`${API_BASE}/doctors/clinics/all`);
    return handleResponse(res);
  },

  // Appointments API
  async bookAppointment(bookingData) {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookingData)
    });
    return handleResponse(res);
  },

  async getAppointments(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.date) params.append('date', filters.date);
    if (filters.doctor_id) params.append('doctor_id', filters.doctor_id);

    const res = await fetch(`${API_BASE}/appointments?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAppointment(id) {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async updateAppointmentStatus(id, updateData) {
    const res = await fetch(`${API_BASE}/appointments/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData)
    });
    return handleResponse(res);
  },

  async rescheduleAppointment(id, newSlotData) {
    const res = await fetch(`${API_BASE}/appointments/${id}/reschedule`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newSlotData)
    });
    return handleResponse(res);
  },

  async cancelAppointment(id, reason) {
    const res = await fetch(`${API_BASE}/appointments/${id}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    return handleResponse(res);
  },

  // Admin & Clinic Management API
  async getAdminStats() {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAdminDoctors() {
    const res = await fetch(`${API_BASE}/admin/doctors`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async createDoctor(doctorData) {
    const res = await fetch(`${API_BASE}/admin/doctors`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(doctorData)
    });
    return handleResponse(res);
  },

  async updateDoctor(id, doctorData) {
    const res = await fetch(`${API_BASE}/admin/doctors/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(doctorData)
    });
    return handleResponse(res);
  },

  async toggleDoctorStatus(id) {
    const res = await fetch(`${API_BASE}/admin/doctors/${id}/toggle-status`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAdminCapacityInspector(doctorId, date) {
    const res = await fetch(`${API_BASE}/admin/capacity-inspector?doctor_id=${doctorId}&date=${date}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getAdminPatients() {
    const res = await fetch(`${API_BASE}/admin/patients`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  }
};
