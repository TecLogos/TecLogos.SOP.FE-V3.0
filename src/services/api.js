import axios from 'axios'

// Empty BASE_URL = all /api calls go through Vite proxy → backend
const api = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('accessToken')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  async err => {
    const orig = err.config
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true
      try {
        const { data } = await axios.post('/api/v1/auth/refresh-token', {}, { withCredentials: true })
        const token = data.token || data.accessToken
        if (token) {
          localStorage.setItem('accessToken', token)
          orig.headers.Authorization = `Bearer ${token}`
          return api(orig)
        }
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ── AUTH ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login:   (data) => api.post('/api/v1/auth/login', data),
  logout:  ()     => api.post('/api/v1/auth/logout'),
  me:      ()     => api.get('/api/v1/auth/me'),
  refresh: ()     => api.post('/api/v1/auth/refresh-token'),
}

// ── SOP ───────────────────────────────────────────────────────────────────
// IMPORTANT: Backend uses SopID (not sopDetailsID) and Comments (not remarks)
export const sopAPI = {
  // Admin
  getAll:            (params) => api.get('/api/v1/sop', { params }),
  getById:           (id)     => api.get(`/api/v1/sop/${id}`),
  create:            (form)   => api.post('/api/v1/sop', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:            (id, form) => api.put(`/api/v1/sop/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete:            (id)     => api.delete(`/api/v1/sop/${id}`),
  exportCsv:         ()       => api.get('/api/v1/sop/export', { responseType: 'blob' }),
  getWorkflowStages: ()           => api.get('/api/v1/sop/workflow-stages'),
  createWorkflowStage:      (data)       => api.post('/api/v1/sop/workflow-stages', data),
  bulkCreateWorkflowStages: (dataArray)  => api.post('/api/v1/sop/workflow-stages/bulk', dataArray),
  updateWorkflowStage: (id, data) => api.put(`/api/v1/sop/workflow-stages/${id}`, data),
  deleteWorkflowStage: (id)       => api.delete(`/api/v1/sop/workflow-stages/${id}`),
  // Legacy alias
  setupWorkflow: (data)           => api.post('/api/v1/sop/workflow-stages', data),

  // Initiator — field is SopID + Comments (NOT sopDetailsID/remarks)
  getMySops: () => api.get('/api/v1/sop/my-sops'),
  submit: ({ sopID, comments }) => api.post('/api/v1/sop/submit', {
    sopID:    sopID,
    comments: comments ?? null,
  }),

  // Supervisor — field is Comments (NOT remarks)
  getSupervisorPending: ()         => api.get('/api/v1/sop/supervisor/pending'),
  supervisorForward:    (id, data) => api.post(`/api/v1/sop/${id}/supervisor/forward`,        { comments: data.comments ?? null }),
  supervisorReqChanges: (id, data) => api.post(`/api/v1/sop/${id}/supervisor/request-changes`,{ comments: data.comments ?? null }),

  // Approver — field is SopID + Action + Comments
  getApproverPending: () => api.get('/api/v1/sop/approver/pending'),
  processApproval: ({ sopID, action, comments }) => api.post('/api/v1/sop/approve', {
    sopID:    sopID,
    action:   action,
    comments: comments ?? null,
  }),

  // Download PDF
  download: (id) => api.get(`/api/v1/sop/${id}/download`, { responseType: 'blob' }),
}

// ── EMPLOYEES ─────────────────────────────────────────────────────────────
export const employeeAPI = {
  getAll:  (page, size, term) => api.get(`/api/v1/employee/list/${page}/${size}`, { params: { term } }),
  getById: (id)               => api.get(`/api/v1/employee/${id}`),
  create:  (data)             => api.post('/api/v1/employee/new', data),
  update:  (id, data)         => api.put(`/api/v1/employee/update/${id}`, data),
  delete:  (id)               => api.delete(`/api/v1/employee/delete/${id}`),
  // Employee roles (for display on employee list)
  getRoles: (employeeId)      => api.get('/api/v1/employeerole/list', { params: { employeeId } }),
  // Onboarding invite
  sendInvite: (employeeId)    => api.post(`/api/v1/authonboarding/send-invite/${employeeId}`),
}

// ── ROLES ─────────────────────────────────────────────────────────────────
export const rolesAPI = {
  getAll: ()     => api.get('/api/v1/roles/list'),
  getById:(id)   => api.get(`/api/v1/roles/${id}`),
  create: (data) => api.post('/api/v1/roles', data),
  update: (data) => api.put(`/api/v1/roles/${data.id}`, data),
  delete: (id)   => api.delete(`/api/v1/roles/${id}`),
}

// ── EMPLOYEE GROUPS ───────────────────────────────────────────────────────
export const groupAPI = {
  getAll: ()     => api.get('/api/v1/employeegroup/list'),
  getById:(id)   => api.get(`/api/v1/employeegroup/${id}`),
  create: (data) => api.post('/api/v1/employeegroup', data),
  update: (data) => api.put(`/api/v1/employeegroup/${data.id}`, data),
  delete: (id)   => api.delete(`/api/v1/employeegroup/${id}`),
}

// ── EMPLOYEE GROUP DETAILS (group members) ────────────────────────────────
export const egDetailAPI = {
  getAll:       ()     => api.get('/api/v1/egdetail/list'),
  getById:      (id)   => api.get(`/api/v1/egdetail/${id}`),
  // Add employee to group
  addMember:    (data) => api.post('/api/v1/egdetail', {
    employeeGroupID: data.employeeGroupID,
    employeeID:      data.employeeID,
  }),
  // Remove employee from group
  removeMember: (id)   => api.delete(`/api/v1/egdetail/${id}`),
}

// ── DDL ───────────────────────────────────────────────────────────────────
export const ddlAPI = {
  employees: () => api.get('/api/v1/employeeddl/list'),
}

export default api

// ── ONBOARDING (public — no auth required) ────────────────────────────────
export const onboardingAPI = {
  // Validate token before showing set-password form
  validate:        (token)           => api.get('/api/v1/authonboarding/validate', { params: { token } }),
  // Get employee info by token (email + code for success screen)
  getEmployeeInfo: (token)           => api.get('/api/v1/authonboarding/employee-info', { params: { token } }),
  // Set password to complete onboarding
  setPassword:     (token, password) => api.post('/api/v1/authonboarding/set-password', { token, password }),
  // Admin: resend invite to an employee
  resendInvite:    (employeeId)      => api.post(`/api/v1/authonboarding/send-invite/${employeeId}`),
}
