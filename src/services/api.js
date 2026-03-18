import axios from 'axios'

// ── Axios instance ─────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '',
  // Don't force a single Content-Type globally.
  // - JSON requests will be set by axios when you pass a plain object
  // - multipart/form-data must be set by the browser/axios (boundary), so we must not override it
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

export const sopAPI = {
  getAll:             (params) => api.get('/api/v1/sopdetail/all', { params }),
  getById:            (id)     => api.get(`/api/v1/sopdetail/${id}/tracking`),
  create:             (formData) => api.post('/api/v1/sopdetail/create', formData),
  update:             (id, formData) => api.put(`/api/v1/sopdetail/update/${id}`, formData),
  delete:             (id) => api.delete(`/api/v1/sopdetail/${id}`),
  submit:             (id, data) => api.put(`/api/v1/sopdetail/submit/${id}`, { Comments: data?.comments ?? null }),
  resubmit:           (id, data) => api.put(`/api/v1/sopdetail/resubmit/${id}`, { Comments: data?.comments ?? null }),
  returnForChanges:   (id, data) => api.put(`/api/v1/sopdetail/return-for-changes/${id}`, { Comments: data?.comments ?? null }),
  getInitiatorAssigned: (params) => api.get('/api/v1/sopdetail/initiator-assigned', { params }),
  getMySops:          (params) => api.get('/api/v1/sopdetail/my-history', { params }),
  getSupervisorPending: ()     => api.get('/api/v1/SopApproveReject/pending-list'),
  getApproverPending:   ()     => api.get('/api/v1/SopApproveReject/pending-list'),
  supervisorForward:    (id, data) => api.put(`/api/v1/sopdetail/approve/${id}`, { Comments: data.comments ?? null }),
  supervisorReqChanges: (id, data) => api.put(`/api/v1/sopdetail/return-for-changes/${id}`, { Comments: data.comments ?? null }),
  processApproval: ({ sopID, action, comments }) =>
    action === 1
      ? api.put(`/api/v1/SopApproveReject/approve/${sopID}`, { Comments: comments ?? null }, { NextApprovalLevel: data.nextApprovalLevel })
      : api.put(`/api/v1/SopApproveReject/reject/${sopID}`,  { Comments: comments ?? null }),
  // getTracking: (id) => api.get(`/api/v1/sopdetail/${id}/tracking`),
  // downloadPdf: (id) => api.get(`/api/v1/sopdetail/${id}/download`, { responseType: 'blob' }),
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
// Controller: api/v1/workflowsetup  (Admin only)
//
// Response shape for getAll:
//   { success, data: [WorkFlowSetUpResponse] }
//
// WorkFlowSetUpResponse fields:
//   ID, StageName, ApprovalLevel (0-5), IsSupervisor,
//   EmployeeGroupID, GroupName, ApprovalLevelLabel, TypeLabel
//
// CreateWorkFlowStageRequest:
//   { StageName, ApprovalLevel, IsSupervisor, EmployeeGroupID }
//
// Bulk create body: List<CreateWorkFlowStageRequest>
export const workflowAPI = {
  // GET  api/v1/workflowsetup/list  → { success, data: [...] }
  getAll: () => api.get('/api/v1/workflowsetup/list'),

  // GET  api/v1/workflowsetup/{id}
  getById: (id) => api.get(`/api/v1/workflowsetup/${id}`),

  // POST api/v1/workflowsetup
  // Body: { StageName, ApprovalLevel, IsSupervisor, EmployeeGroupID }
  create: (data) => api.post('/api/v1/workflowsetup', {
    StageName:       data.stageName,
    ApprovalLevel:   data.approvalLevel,
    IsSupervisor:    data.isSupervisor,
    EmployeeGroupID: data.employeeGroupID || null,
  }),

  // POST api/v1/workflowsetup/bulk
  // Body: [{ StageName, ApprovalLevel, IsSupervisor, EmployeeGroupID }, ...]
  bulkCreate: (rows) => api.post('/api/v1/workflowsetup/bulk', rows.map(r => ({
    StageName:       r.stageName,
    ApprovalLevel:   r.approvalLevel,
    IsSupervisor:    r.isSupervisor,
    EmployeeGroupID: r.employeeGroupID || null,
  }))),

  // PUT  api/v1/workflowsetup/{id}
  // Body: { StageName, ApprovalLevel, IsSupervisor, EmployeeGroupID }
  update: (id, data) => api.put(`/api/v1/workflowsetup/${id}`, {
    StageName:       data.stageName,
    ApprovalLevel:   data.approvalLevel,
    IsSupervisor:    data.isSupervisor,
    EmployeeGroupID: data.employeeGroupID || null,
  }),

  // DELETE api/v1/workflowsetup/{id}
  delete: (id) => api.delete(`/api/v1/workflowsetup/${id}`),
}

export default api
