import axios from 'axios'

const GET_CACHE_TTL_MS = 30_000
const responseCache = new Map()
const inflightGetRequests = new Map()

function buildCacheKey(url, params) {
  if (!params || typeof params !== 'object') return `GET:${url}`

  const searchParams = new URLSearchParams()
  Object.keys(params)
    .sort()
    .forEach((key) => {
      const value = params[key]
      if (value === undefined || value === null || value === '') return
      searchParams.append(key, String(value))
    })

  const query = searchParams.toString()
  return query ? `GET:${url}?${query}` : `GET:${url}`
}

function cachedGet(url, { params, ttl = GET_CACHE_TTL_MS, force = false } = {}) {
  const cacheKey = buildCacheKey(url, params)
  const now = Date.now()

  if (!force) {
    const cachedEntry = responseCache.get(cacheKey)
    if (cachedEntry && cachedEntry.expiresAt > now) {
      return Promise.resolve(cachedEntry.response)
    }

    const inflight = inflightGetRequests.get(cacheKey)
    if (inflight) return inflight
  }

  const request = api.get(url, { params })
    .then((response) => {
      responseCache.set(cacheKey, {
        response,
        expiresAt: Date.now() + ttl,
      })
      inflightGetRequests.delete(cacheKey)
      return response
    })
    .catch((error) => {
      inflightGetRequests.delete(cacheKey)
      throw error
    })

  inflightGetRequests.set(cacheKey, request)
  return request
}

function invalidateCache(match) {
  for (const key of responseCache.keys()) {
    if (match(key)) responseCache.delete(key)
  }

  for (const key of inflightGetRequests.keys()) {
    if (match(key)) inflightGetRequests.delete(key)
  }
}

function invalidateSopCache() {
  invalidateCache((key) =>
    key.startsWith('GET:/api/v1/SopDetail') ||
    key.startsWith('GET:/api/v1/SopApproveReject/pending-list')
  )
}

const api = axios.create({
  baseURL: '',
  withCredentials: true,
})

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('accessToken')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
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
  login: (data) => api.post('/api/v1/auth/login', data),
  logout: () => api.post('/api/v1/auth/logout'),
  me: () => api.get('/api/v1/auth/me'),
  refresh: () => api.post('/api/v1/auth/refresh-token'),
}

export const sopAPI = {
  getAll: (params, options) => cachedGet('/api/v1/SopDetail/list', { params, ...options }),
  getById: (id, options) => cachedGet(`/api/v1/SopDetail/${id}`, { ttl: 60_000, ...options }),
  create: async (formData) => {
    const response = await api.post('/api/v1/SopDetail/create', formData)
    invalidateSopCache()
    return response
  },
  update: async (id, formData) => {
    const response = await api.put(`/api/v1/SopDetail/update/${id}`, formData)
    invalidateSopCache()
    return response
  },
  delete: async (id) => {
    const response = await api.delete(`/api/v1/SopDetail/${id}`)
    invalidateSopCache()
    return response
  },
}

export const sopApproveRejectAPI = {
  getPendingList: (params, options) =>
    cachedGet('/api/v1/SopApproveReject/pending-list', { params, ttl: 15_000, ...options }),

  approve: async (sopId, comments, nextApprovalLevel) => {
    const response = await api.put(`/api/v1/SopApproveReject/approve/${sopId}`, {
      Comments: comments ?? null,
      NextApprovalLevel: nextApprovalLevel ?? 0,
    })
    invalidateSopCache()
    return response
  },

  reject: async (sopId, comments) => {
    const response = await api.put(`/api/v1/SopApproveReject/reject/${sopId}`, {
      Comments: comments,
      NextApprovalLevel: 0,
    })
    invalidateSopCache()
    return response
  },
}

export const employeeAPI = {
  getAll: (page, size, term) => api.get(`/api/v1/employee/list/${page}/${size}`, { params: { term } }),
  getById: (id) => api.get(`/api/v1/employee/${id}`),
  create: (data) => api.post('/api/v1/employee/new', data),
  update: (id, data) => api.put(`/api/v1/employee/update/${id}`, data),
  delete: (id) => api.delete(`/api/v1/employee/delete/${id}`),
  sendInvite: (employeeId) => api.post(`/api/v1/authonboarding/send-invite/${employeeId}`),
}

export const groupAPI = {
  getAll: () => api.get('/api/v1/employeegroup/list'),
  getById: (id) => api.get(`/api/v1/employeegroup/${id}`),
  create: (data) => api.post('/api/v1/employeegroup', data),
  update: (data) => api.put(`/api/v1/employeegroup/${data.id}`, data),
  delete: (id) => api.delete(`/api/v1/employeegroup/${id}`),
}

export const egDetailAPI = {
  getAll: () => api.get('/api/v1/egdetail/list'),
  getById: (id) => api.get(`/api/v1/egdetail/${id}`),
  addMember: (data) => api.post('/api/v1/egdetail', {
    EmployeeGroupID: data.employeeGroupID,
    EmployeeID: data.employeeID,
  }),
  removeMember: (id) => api.delete(`/api/v1/egdetail/${id}`),
}

export const ddlAPI = {
  employees: () => api.get('/api/v1/employeeddl/list'),
}

export const onboardingAPI = {
  validate: (token) => api.get('/api/v1/authonboarding/validate', { params: { token } }),
  setPassword: (token, password) => api.post('/api/v1/authonboarding/set-password', { token, password }),
  resendInvite: (employeeId) => api.post(`/api/v1/authonboarding/send-invite/${employeeId}`),
}

export const workflowAPI = {
  getAll: () => api.get('/api/v1/WorkFlowSetUp/list'),
  getById: (id) => api.get(`/api/v1/WorkFlowSetUp/${id}`),

  create: (data) => api.post('/api/v1/WorkFlowSetUp', {
    StageName: data.stageName,
    ApprovalLevel: data.approvalLevel,
    IsSupervisor: data.isSupervisor,
    EmployeeGroupID: data.employeeGroupID || null,
  }),

  bulkCreate: (rows) => api.post('/api/v1/WorkFlowSetUp/bulk', rows.map((r) => ({
    StageName: r.stageName,
    ApprovalLevel: r.approvalLevel,
    IsSupervisor: r.isSupervisor,
    EmployeeGroupID: r.employeeGroupID || null,
  }))),

  update: (id, data) => api.put(`/api/v1/WorkFlowSetUp/${id}`, {
    StageName: data.stageName,
    ApprovalLevel: data.approvalLevel,
    IsSupervisor: data.isSupervisor,
    EmployeeGroupID: data.employeeGroupID || null,
  }),

  delete: (id) => api.delete(`/api/v1/WorkFlowSetUp/${id}`),
}

export default api


