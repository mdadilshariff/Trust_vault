import axios from 'axios'

const rawApiUrl = (import.meta as any).env?.VITE_API_URL as string | undefined
const baseURL = rawApiUrl ? `${rawApiUrl.replace(/\/+$/, '')}/api` : '/api'

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // Clear auth state — App will redirect to login
      window.dispatchEvent(new Event('tv:unauthorized'))
    }
    return Promise.reject(err)
  },
)

export default api
