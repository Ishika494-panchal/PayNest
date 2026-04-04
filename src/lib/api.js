/**
 * Production: set VITE_API_BASE_URL on the build host (e.g. Render) to your API origin only, no path:
 *   VITE_API_BASE_URL=https://paynest-api.onrender.com
 * Dev: leave unset to use Vite proxy (/api).
 */
function getApiBase() {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (raw != null && String(raw).trim() !== '') {
    const base = String(raw).trim().replace(/\/$/, '')
    return `${base}/api`
  }
  return '/api'
}

const API_BASE = getApiBase()

/** Thrown by `request()` so callers can distinguish 401 from network / 5xx (e.g. server restarting). */
export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function isLikelyHtmlErrorPayload(text) {
  const t = String(text || '').trimStart()
  return t.startsWith('<!') || t.toLowerCase().includes('<html') || t.toLowerCase().includes('<!doctype')
}

/** Never surface raw HTML error pages to the UI. */
function messageFromApiFailure(rawText, data, status) {
  const fromJson = typeof data?.message === 'string' ? data.message : ''
  if (fromJson && isLikelyHtmlErrorPayload(fromJson)) {
    return 'Service temporarily unavailable. Please try again.'
  }
  if (fromJson) return fromJson
  if (typeof data?.error === 'string' && data.error && !isLikelyHtmlErrorPayload(data.error)) {
    return data.error
  }
  if (rawText && isLikelyHtmlErrorPayload(rawText)) {
    return 'Service temporarily unavailable. Please try again.'
  }
  return `${status} ${status === 500 ? 'Server error' : statusTextOrEmpty(status)}`.trim()
}

function statusTextOrEmpty(status) {
  if (status === 502) return 'Bad gateway'
  if (status === 503) return 'Unavailable'
  return 'Request failed'
}

async function request(path, options = {}) {
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: mergedHeaders,
    })
  } catch (e) {
    throw new ApiError(e?.message || 'Network error', 0)
  }

  const rawText = await response.text()
  let data = {}
  if (rawText) {
    try {
      data = JSON.parse(rawText)
    } catch {
      data = isLikelyHtmlErrorPayload(rawText)
        ? { message: '' }
        : { message: rawText.slice(0, 200) }
    }
  }
  if (!response.ok) {
    const msg = messageFromApiFailure(rawText, data, response.status)
    throw new ApiError(msg, response.status)
  }
  return data
}

export async function signup(payload) {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function login(payload) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getCurrentUser(token) {
  return request('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function saveUserDetails(token, payload) {
  return request('/profile/details', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}

export async function updateProfile(token, payload) {
  return request('/profile/update', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}

export async function completeInitialPlan(token) {
  return request('/profile/complete-initial-plan', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getCurrentWeather(token) {
  return request('/weather/current', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getClaimsSummary(token) {
  return request('/claims/summary', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

/** Only works when the server has PAYNEST_CLAIM_SIMULATOR=true (404 otherwise). */
export async function simulateAutoClaim(token, payload = {}) {
  return request('/claims/simulate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}

/** Clears claims + daily lock. Only when PAYNEST_CLAIM_SIMULATOR=true on server. */
export async function resetClaimsForTesting(token) {
  return request('/claims/reset', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  })
}

export async function getPricingQuote(token) {
  return request('/pricing/quote', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getCurrentPricing(token) {
  return request('/pricing/current', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function selectPlan(token, payload) {
  return request('/plans/select', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}

export async function recordDisruption(token, payload) {
  return request('/disruptions/record', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}

export async function getSubscriptionStatus(token) {
  return request('/subscription/status', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function createPaymentOrder(token) {
  return request('/payments/create-order', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function verifyPayment(token, payload) {
  return request('/payments/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}

export async function getPaymentStatements(token) {
  return request('/payments/statements', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function logout(token) {
  return request('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

/** API Ninjas city search (min 2 chars). Proxied by backend; requires API_NINJAS_KEY on server. */
export async function searchCities(query) {
  const name = String(query || '').trim()
  if (name.length < 2) {
    return { results: [] }
  }
  const params = new URLSearchParams({ name })
  let response
  try {
    response = await fetch(`${API_BASE}/locations/city-search?${params}`)
  } catch (e) {
    throw new ApiError(e?.message || 'Network error', 0)
  }
  const rawText = await response.text()
  let data = {}
  if (rawText) {
    try {
      data = JSON.parse(rawText)
    } catch {
      data = { message: rawText.slice(0, 200) }
    }
  }
  if (!response.ok) {
    throw new ApiError(messageFromApiFailure(rawText, data, response.status), response.status)
  }
  return data
}
