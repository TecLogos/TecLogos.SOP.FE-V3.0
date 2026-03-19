import axios from 'axios'

// ── Axios instance ─────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '',
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
        const token = data.Token || data.token || data.accessToken
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

export const authAPI = {
  login:   (data) => api.post('/api/v1/auth/login', data),
  logout:  ()     => api.post('/api/v1/auth/logout'),
  me:      ()     => api.get('/api/v1/auth/me'),
  refresh: ()     => api.post('/api/v1/auth/refresh-token'),
}

// ── SOP Detail API ────────────────────────────────────────────────────────
// GET    /api/v1/SopDetail/list
// GET    /api/v1/SopDetail/{sopId}
// POST   /api/v1/SopDetail/create
// PUT    /api/v1/SopDetail/update/{sopId}
// DELETE /api/v1/SopDetail/{sopId}
export const sopAPI = {
  getAll:   (params) => api.get('/api/v1/SopDetail/list', { params }),
  getById:  (id)     => api.get(`/api/v1/SopDetail/${id}`),
  create:   (formData) => api.post('/api/v1/SopDetail/create', formData),
  update:   (id, formData) => api.put(`/api/v1/SopDetail/update/${id}`, formData),
  delete:   (id) => api.delete(`/api/v1/SopDetail/${id}`),
}

// ── SOP Approve/Reject API ────────────────────────────────────────────────
// PUT  /api/v1/SopApproveReject/approve/{sopId}  Body: { Comments, NextApprovalLevel }
// PUT  /api/v1/SopApproveReject/reject/{sopId}   Body: { Comments }
// GET  /api/v1/SopApproveReject/pending-list     → { success, data: SopListResponse }
export const sopApproveRejectAPI = {
  getPendingList: (params) => api.get('/api/v1/SopApproveReject/pending-list', { params }),

  approve: (sopId, comments, nextApprovalLevel) =>
    api.put(`/api/v1/SopApproveReject/approve/${sopId}`, {
      Comments: comments ?? null,
      NextApprovalLevel: nextApprovalLevel ?? 0,
    }),

  reject: (sopId, comments) =>
    api.put(`/api/v1/SopApproveReject/reject/${sopId}`, {
      Comments: comments,
      NextApprovalLevel: 0,
    }),
}

export const employeeAPI = {
  getAll:     (page, size, term) => api.get(`/api/v1/employee/list/${page}/${size}`, { params: { term } }),
  getById:    (id)               => api.get(`/api/v1/employee/${id}`),
  create:     (data)             => api.post('/api/v1/employee/new', data),
  update:     (id, data)         => api.put(`/api/v1/employee/update/${id}`, data),
  delete:     (id)               => api.delete(`/api/v1/employee/delete/${id}`),
  sendInvite: (employeeId)       => api.post(`/api/v1/authonboarding/send-invite/${employeeId}`),
}

export const groupAPI = {
  getAll:  ()     => api.get('/api/v1/employeegroup/list'),
  getById: (id)   => api.get(`/api/v1/employeegroup/${id}`),
  create:  (data) => api.post('/api/v1/employeegroup', data),
  update:  (data) => api.put(`/api/v1/employeegroup/${data.id}`, data),
  delete:  (id)   => api.delete(`/api/v1/employeegroup/${id}`),
}

export const egDetailAPI = {
  getAll:       ()     => api.get('/api/v1/egdetail/list'),
  getById:      (id)   => api.get(`/api/v1/egdetail/${id}`),
  addMember:    (data) => api.post('/api/v1/egdetail', {
    EmployeeGroupID: data.employeeGroupID,
    EmployeeID:      data.employeeID,
  }),
  removeMember: (id)   => api.delete(`/api/v1/egdetail/${id}`),
}

export const ddlAPI = {
  employees: () => api.get('/api/v1/employeeddl/list'),
}

export const onboardingAPI = {
  validate:    (token)           => api.get('/api/v1/authonboarding/validate', { params: { token } }),
  setPassword: (token, password) => api.post('/api/v1/authonboarding/set-password', { token, password }),
  resendInvite:(employeeId)      => api.post(`/api/v1/authonboarding/send-invite/${employeeId}`),
}

// ── WORKFLOW SETUP ────────────────────────────────────────────────────────
// GET    /api/v1/WorkFlowSetUp/list
// GET    /api/v1/WorkFlowSetUp/{id}
// POST   /api/v1/WorkFlowSetUp
// POST   /api/v1/WorkFlowSetUp/bulk
// PUT    /api/v1/WorkFlowSetUp/{id}
// DELETE /api/v1/WorkFlowSetUp/{id}
export const workflowAPI = {
  getAll:   ()    => api.get('/api/v1/WorkFlowSetUp/list'),
  getById:  (id)  => api.get(`/api/v1/WorkFlowSetUp/${id}`),

  create: (data) => api.post('/api/v1/WorkFlowSetUp', {
    StageName:       data.stageName,
    ApprovalLevel:   data.approvalLevel,
    IsSupervisor:    data.isSupervisor,
    EmployeeGroupID: data.employeeGroupID || null,
  }),

  bulkCreate: (rows) => api.post('/api/v1/WorkFlowSetUp/bulk', rows.map(r => ({
    StageName:       r.stageName,
    ApprovalLevel:   r.approvalLevel,
    IsSupervisor:    r.isSupervisor,
    EmployeeGroupID: r.employeeGroupID || null,
  }))),

  update: (id, data) => api.put(`/api/v1/WorkFlowSetUp/${id}`, {
    StageName:       data.stageName,
    ApprovalLevel:   data.approvalLevel,
    IsSupervisor:    data.isSupervisor,
    EmployeeGroupID: data.employeeGroupID || null,
  }),

  delete: (id) => api.delete(`/api/v1/WorkFlowSetUp/${id}`),
}

export default api
