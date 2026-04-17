/* eslint-env node */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })
import cors from 'cors'
import express from 'express'
import mongoose from 'mongoose'
import { fetchWeatherApi } from 'openmeteo'
import Razorpay from 'razorpay'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

const PORT = Number(process.env.PORT) || 4000

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  // eslint-disable-next-line no-console
  console.error('FATAL: Set MONGODB_URI in your environment (e.g. .env locally, Render dashboard in production).')
  process.exit(1)
}

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const API_NINJAS_AQI_URL = 'https://api.api-ninjas.com/v1/airquality'
const API_NINJAS_KEY = process.env.API_NINJAS_KEY || ''
const WEATHER_CACHE_TTL_MS = Number(process.env.WEATHER_CACHE_TTL_MS || 10 * 60 * 1000)
const PRICING_CACHE_TTL_MS = Number(process.env.PRICING_CACHE_TTL_MS || 10 * 60 * 1000)
const AQI_TIMEOUT_MS = Number(process.env.AQI_TIMEOUT_MS || 2500)
const NO_CLAIM_RENEWAL_DISCOUNT_PERCENT = Math.max(
  0,
  Math.min(30, Number(process.env.PAYNEST_NO_CLAIM_DISCOUNT_PERCENT || 10))
)
const NOMINATIM_USER_AGENT =
  process.env.NOMINATIM_USER_AGENT || 'PayNest/1.0 (+https://paynest.app; support@paynest.app)'

const RAZORPAY_KEY_ID = String(process.env.RAZORPAY_KEY_ID || '').trim()
const RAZORPAY_KEY_SECRET = String(process.env.RAZORPAY_KEY_SECRET || '').trim()

const PRICE_MODEL_URL =
  String(process.env.PRICE_MODEL_URL || '').trim() || 'https://price-model-1.onrender.com'
const PRICE_MODEL_PREDICT_URL =
  String(process.env.PRICE_MODEL_PREDICT_URL || '').trim() ||
  `${String(PRICE_MODEL_URL).replace(/\/$/, '')}/predict-price`
const FRAUD_MODEL_PREDICT_URL =
  String(process.env.FRAUD_MODEL_PREDICT_URL || '').trim() ||
  'https://paynest-fraud-detection-model.onrender.com/predict'
const FRAUD_MODEL_TIMEOUT_MS = Number(process.env.FRAUD_MODEL_TIMEOUT_MS || 9000)
const FRAUD_BLOCK_SCORE_THRESHOLD = Math.max(
  0,
  Math.min(1, Number(process.env.FRAUD_BLOCK_SCORE_THRESHOLD || 0.6))
)
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'admin@gmail.com')
  .trim()
  .toLowerCase()
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || 'admin@123').trim()
const ADMIN_DISPLAY_NAME = String(process.env.ADMIN_DISPLAY_NAME || 'PayNest Admin').trim()

function wmoWeatherCodeToLabels(code) {
  const c = Number(code)
  if (Number.isNaN(c)) {
    return { condition: 'Unknown', description: 'Weather unavailable' }
  }
  if (c === 0) return { condition: 'Clear', description: 'Clear sky' }
  if (c <= 3) return { condition: 'Cloudy', description: 'Mainly clear to overcast' }
  if (c <= 48) return { condition: 'Fog', description: 'Fog or depositing rime fog' }
  if (c <= 67) return { condition: 'Rain', description: 'Drizzle or rain' }
  if (c <= 77) return { condition: 'Snow', description: 'Snow or snow grains' }
  if (c <= 82) return { condition: 'Showers', description: 'Rain or snow showers' }
  if (c <= 86) return { condition: 'Snow', description: 'Snow showers' }
  if (c <= 99) return { condition: 'Storm', description: 'Thunderstorm or heavy precipitation' }
  return { condition: 'Unknown', description: 'Weather code ' + c }
}

function buildHourlyForecast(response) {
  const hourly = response.hourly()
  if (!hourly) return []

  const utcOffsetSeconds = Number(response.utcOffsetSeconds?.() || 0)
  const start = Number(hourly.time())
  const end = Number(hourly.timeEnd())
  const interval = Number(hourly.interval())
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(interval) || interval <= 0) {
    return []
  }

  const total = Math.max(0, Math.floor((end - start) / interval))
  const nowMs = Date.now()
  const temperatureArr = hourly.variables(0)?.valuesArray?.() || []
  const weatherCodeArr = hourly.variables(2)?.valuesArray?.() || []
  const rainArr = hourly.variables(3)?.valuesArray?.() || []
  const rainProbArr = hourly.variables(4)?.valuesArray?.() || []

  const nextHours = []
  for (let i = 0; i < total; i += 1) {
    const tsSec = start + i * interval + utcOffsetSeconds
    const tsMs = tsSec * 1000
    if (tsMs < nowMs - 30 * 60 * 1000) continue

    const rawProb = Number(rainProbArr[i])
    const rawRain = Number(rainArr[i])
    const rainPercent = Number.isFinite(rawProb)
      ? Math.max(0, Math.min(100, Math.round(rawProb)))
      : Number.isFinite(rawRain)
        ? Math.max(0, Math.min(100, Math.round(rawRain * 20)))
        : 0
    const code = Number(weatherCodeArr[i] ?? 0)
    const labels = wmoWeatherCodeToLabels(code)

    nextHours.push({
      time: new Date(tsMs).toISOString(),
      temperatureC: Number.isFinite(Number(temperatureArr[i])) ? Number(temperatureArr[i]) : null,
      weatherCode: code,
      condition: labels.condition,
      rainPercent,
    })
    if (nextHours.length >= 8) break
  }
  return nextHours
}

function buildFallbackHourlyForecastFromCurrent(currentTemp, condition, rainPercent = 0) {
  const now = new Date()
  const baseTemp = Number.isFinite(Number(currentTemp)) ? Number(currentTemp) : 28
  const safeRain = Math.max(0, Math.min(100, Math.round(Number(rainPercent) || 0)))
  return Array.from({ length: 8 }, (_, index) => {
    const t = new Date(now.getTime() + index * 60 * 60 * 1000)
    const drift = index % 3 === 0 ? 0 : index % 3 === 1 ? 1 : -1
    return {
      time: t.toISOString(),
      temperatureC: baseTemp + drift,
      weatherCode: 0,
      condition: condition || 'Cloudy',
      rainPercent: safeRain,
    }
  })
}

/** ISO-2 suffixes we treat as country (omit US/CA so "Portland, OR" is not parsed as country "OR"). */
const GEOCOUNTRY_SUFFIX_ISO2 = new Set([
  'IN',
  'GB',
  'UK',
  'DE',
  'FR',
  'IT',
  'ES',
  'NL',
  'BE',
  'AU',
  'JP',
  'CN',
  'BR',
  'MX',
  'AE',
  'SG',
  'NZ',
  'IE',
  'PT',
  'CH',
  'AT',
  'SE',
  'NO',
  'DK',
  'FI',
  'PL',
  'CZ',
  'GR',
  'TR',
  'ZA',
  'KR',
  'TH',
  'MY',
  'ID',
  'PH',
  'VN',
  'EG',
  'SA',
  'NG',
  'KE',
  'AR',
  'CL',
  'CO',
  'PE',
  'HK',
  'TW',
  'IL',
  'RU',
  'UA',
  'PK',
  'BD',
  'LK',
  'NP',
])

/** e.g. "Vadodara, IN" → { cityName: "Vadodara", countryCode: "IN" } (Open-Meteo needs split + countryCode). */
function parseCityCountryHint(raw) {
  const q = String(raw || '').trim()
  if (!q) return null
  const parts = q.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length < 2) return null
  const last = parts[parts.length - 1].toUpperCase()
  if (last.length !== 2 || !GEOCOUNTRY_SUFFIX_ISO2.has(last)) return null
  const countryCode = last === 'UK' ? 'GB' : last
  const cityName = parts.slice(0, -1).join(', ').trim()
  if (cityName.length < 2) return null
  return { cityName, countryCode }
}

/** Skip as Open-Meteo "name" for comma parts that are country codes (name=IN matches wrong cities). */
function isLikelyIsoCountryToken(s) {
  const t = String(s || '').trim().toUpperCase()
  if (t.length !== 2 || !/^[A-Z]{2}$/.test(t)) return false
  if (GEOCOUNTRY_SUFFIX_ISO2.has(t)) return true
  if (t === 'US' || t === 'CA') return true
  return false
}

function buildGeocodeCandidates(raw) {
  const q = String(raw || '').trim()
  if (!q) return []
  const candidates = []
  const seen = new Set()
  const push = (s) => {
    const v = String(s || '').trim()
    if (v.length < 2 || seen.has(v.toLowerCase())) return
    seen.add(v.toLowerCase())
    candidates.push(v)
  }

  push(q)
  const noParens = q.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
  push(noParens)

  const parts = q.split(',').map((s) => s.trim()).filter(Boolean)
  for (const p of parts) {
    if (isLikelyIsoCountryToken(p)) continue
    push(p)
  }
  if (parts.length >= 2) {
    push(parts[parts.length - 2])
    push(parts[0])
  }

  return candidates
}

async function openMeteoGeocodeFirst(name, countryCode = null) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', name)
  url.searchParams.set('count', '5')
  url.searchParams.set('language', 'en')
  if (countryCode && /^[A-Za-z]{2}$/.test(String(countryCode).trim())) {
    url.searchParams.set('countryCode', String(countryCode).trim().toUpperCase())
  }

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(url.toString(), { signal: controller.signal })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.reason || 'Geocoding request failed.')
    }
    const hit = data?.results?.[0]
    if (!hit) return null
    return {
      latitude: hit.latitude,
      longitude: hit.longitude,
      label: hit.name || name,
    }
  } finally {
    clearTimeout(t)
  }
}

/** When Open-Meteo/Nominatim fail from the server (e.g. hosting IP limits), API Ninjas can still resolve coordinates. */
async function apiNinjasGeocodeLookup(rawCity) {
  const key = String(API_NINJAS_KEY || '').trim()
  if (!key) return null
  const q = String(rawCity || '').trim()
  if (!q) return null
  const hint = parseCityCountryHint(q)
  const cityName = hint ? hint.cityName : q.split(',')[0].trim() || q
  const country = hint ? hint.countryCode : ''
  if (cityName.length < 2) return null

  const url = new URL('https://api.api-ninjas.com/v1/geocoding')
  url.searchParams.set('city', cityName)
  if (country) url.searchParams.set('country', country)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch(url.toString(), {
      headers: { 'X-Api-Key': key, Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) return null
    const data = await response.json().catch(() => [])
    const row = Array.isArray(data) ? data[0] : null
    const lat = Number(row?.latitude)
    const lon = Number(row?.longitude)
    if (!row || !Number.isFinite(lat) || !Number.isFinite(lon)) return null
    const label = row.name ? `${row.name}${row.country ? `, ${row.country}` : ''}` : cityName
    return { latitude: lat, longitude: lon, label }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function nominatimGeocodeFirst(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '1')
  url.searchParams.set('addressdetails', '1')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
      signal: controller.signal,
    })
    if (!response.ok) return null
    const data = await response.json().catch(() => [])
    const hit = Array.isArray(data) ? data[0] : null
    if (!hit?.lat || !hit?.lon) return null
    const lat = Number(hit.lat)
    const lon = Number(hit.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    const addr = hit.address || {}
    const label =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      String(hit.display_name || '').split(',')[0]?.trim() ||
      query
    return { latitude: lat, longitude: lon, label }
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function nominatimReverseGeocodeLabel(latitude, longitude) {
  const lat = Number(latitude)
  const lon = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return ''

  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))
  url.searchParams.set('zoom', '12')
  url.searchParams.set('addressdetails', '1')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
      signal: controller.signal,
    })
    if (!response.ok) return ''
    const data = await response.json().catch(() => ({}))
    const addr = data?.address || {}
    const cityLike =
      addr.city || addr.town || addr.village || addr.municipality || addr.suburb || ''
    const state = addr.state || ''
    const country = addr.country || ''
    const label = [cityLike, state, country].filter(Boolean).join(', ')
    if (label) return label
    return String(data?.display_name || '').trim()
  } catch {
    return ''
  } finally {
    clearTimeout(timeout)
  }
}

async function geocodeCityName(city) {
  const q = String(city || '').trim()
  if (!q) throw new Error('City is required to fetch weather.')

  const hint = parseCityCountryHint(q)
  let lastOpenMeteoError = null

  if (hint) {
    try {
      const resolved = await openMeteoGeocodeFirst(hint.cityName, hint.countryCode)
      if (resolved) return resolved
    } catch (err) {
      lastOpenMeteoError = err
    }
  }

  const candidates = buildGeocodeCandidates(q)
  const countryFilter = hint?.countryCode || null
  for (const candidate of candidates) {
    if (isLikelyIsoCountryToken(candidate)) continue
    try {
      const resolved = await openMeteoGeocodeFirst(candidate, countryFilter)
      if (resolved) return resolved
    } catch (err) {
      lastOpenMeteoError = err
    }
  }

  for (const candidate of candidates) {
    if (isLikelyIsoCountryToken(candidate)) continue
    const resolved = await nominatimGeocodeFirst(candidate)
    if (resolved) return resolved
  }

  const ninjas = await apiNinjasGeocodeLookup(q)
  if (ninjas) return ninjas

  if (lastOpenMeteoError) throw lastOpenMeteoError
  throw new Error('City not found for weather lookup.')
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    profileCompleted: { type: Boolean, default: false },
    needsInitialPlanChoice: { type: Boolean, default: true },
    profile: {
      fullName: String,
      phone: String,
      city: String,
      workPlatform: String,
      dailyIncome: Number,
      weather: {
        city: String,
        latitude: Number,
        longitude: Number,
        condition: String,
        description: String,
        temperatureC: Number,
        tempMinC: Number,
        tempMaxC: Number,
        humidity: Number,
        rainMm: Number,
        precipitationMm: Number,
        aqi: Number,
        pm10: Number,
        pm2_5: Number,
        windSpeed: Number,
        dailyRainSumMm: Number,
        dailyMaxWindKmh: Number,
        weatherCode: Number,
        icon: String,
        fetchedAt: String,
      },
      claims: [
        {
          id: { type: String, required: true },
          trigger: String,
          triggerLabel: String,
          amount: Number,
          coverageRemainingAfter: Number,
          status: String,
          razorpayPayoutId: String,
          payoutMode: String,
          subscriptionOrderId: String,
          createdAt: String,
        },
      ],
      lastAutoClaimDayUtc: String,
      disruptions: [
        {
          severity: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
          reason: String,
          createdAt: String,
        },
      ],
      selectedPlan: {
        tier: String,
        title: String,
        weeklyPremium: Number,
        coverageAmount: Number,
        isRecommended: Boolean,
        selectedAt: String,
      },
      subscription: {
        status: { type: String, enum: ['active', 'expired', 'none'], default: 'none' },
        startedAt: String,
        expiresAt: String,
        daysLeft: Number,
        lastPaymentId: String,
        lastOrderId: String,
        amountPaid: Number,
      },
      payments: [
        {
          razorpayOrderId: String,
          razorpayPaymentId: String,
          razorpaySignature: String,
          basePremium: Number,
          discountAmount: Number,
          discountPercent: Number,
          rewardSourceOrderId: String,
          amount: Number,
          currency: String,
          status: String,
          tier: String,
          weeklyPremium: Number,
          paidAt: String,
        },
      ],
      paymentIntents: [
        {
          razorpayOrderId: String,
          basePremium: Number,
          finalPremium: Number,
          discountAmount: Number,
          discountPercent: Number,
          rewardSourceOrderId: String,
          createdAt: String,
        },
      ],
      rewards: {
        lastDiscountSourceOrderId: String,
        totalDiscountUsed: Number,
      },
      dynamicPricing: {
        weeklyPrice: Number,
        riskScore: String,
        areaRisk: Number,
        rainfall: Number,
        aqi: Number,
        pastDisruptions: Number,
        recommendedPlan: String,
        fetchedAt: String,
      },
      updatedAt: String,
    },
  },
  { timestamps: true }
)

const sessionSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, index: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    adminEmail: { type: String, default: '' },
  },
  { timestamps: true }
)

const User = mongoose.model('User', userSchema)
const Session = mongoose.model('Session', sessionSchema)

let razorpayClientSingleton = null
function getRazorpayClient() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return null
  if (!razorpayClientSingleton) {
    razorpayClientSingleton = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    })
  }
  return razorpayClientSingleton
}

function sanitizeUser(userDoc) {
  return {
    id: String(userDoc._id),
    name: userDoc.name,
    email: userDoc.email,
    profileCompleted: userDoc.profileCompleted,
    needsInitialPlanChoice: userDoc.needsInitialPlanChoice,
    profile: userDoc.profile || null,
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt,
  }
}

function getSessionToken(req) {
  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) return ''
  return authHeader.slice(7).trim()
}

function safeEqualText(a, b) {
  const left = Buffer.from(String(a || ''))
  const right = Buffer.from(String(b || ''))
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

async function getUserFromToken(req) {
  const token = getSessionToken(req)
  if (!token) return null
  const session = await Session.findOne({ token })
  if (!session) return null
  if (session.role === 'admin') return null
  return User.findById(session.userId)
}

async function getAdminSessionFromToken(req) {
  const token = getSessionToken(req)
  if (!token) return null
  return Session.findOne({ token, role: 'admin' })
}

async function requireAdminSession(req, res) {
  const session = await getAdminSessionFromToken(req)
  if (!session) {
    res.status(401).json({ message: 'Admin authentication required.' })
    return null
  }
  return session
}

function buildAdminUserSummary(userDoc) {
  const profileRaw = cloneProfilePlain(userDoc)
  const profile = profileRaw && typeof profileRaw === 'object' ? profileRaw : {}
  const claims = Array.isArray(profile.claims) ? profile.claims : []
  const payments = Array.isArray(profile.payments) ? profile.payments : []
  const subscription = getSubscriptionSnapshot(profile.subscription)
  const latestClaim = [...claims].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))[0] || null
  const latestPayment = [...payments].sort((a, b) => new Date(b?.paidAt || 0) - new Date(a?.paidAt || 0))[0] || null

  return {
    id: String(userDoc._id),
    name: userDoc.name || '',
    email: userDoc.email || '',
    passwordHash: userDoc.passwordHash || '',
    profileCompleted: Boolean(userDoc.profileCompleted),
    needsInitialPlanChoice: Boolean(userDoc.needsInitialPlanChoice),
    city: profile.city || '',
    workPlatform: profile.workPlatform || '',
    dailyIncome: Number(profile.dailyIncome || 0),
    claimsCount: claims.length,
    paymentsCount: payments.length,
    subscription,
    latestClaim: latestClaim
      ? {
          triggerLabel: latestClaim.triggerLabel || latestClaim.trigger || 'N/A',
          status: latestClaim.status || 'unknown',
          amount: Number(latestClaim.amount || 0),
          createdAt: latestClaim.createdAt || '',
        }
      : null,
    latestPayment: latestPayment
      ? {
          amount: Number(latestPayment.amount || 0),
          status: latestPayment.status || 'captured',
          tier: latestPayment.tier || '',
          paidAt: latestPayment.paidAt || '',
        }
      : null,
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt,
  }
}

async function fetchWeatherByCity(city) {
  const { latitude, longitude, label } = await geocodeCityName(city)

  const params = {
    latitude,
    longitude,
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,rain_sum,wind_speed_10m_max',
    hourly: 'temperature_2m,wind_speed_10m,weather_code,rain,precipitation_probability',
    current:
      'temperature_2m,relative_humidity_2m,rain,precipitation,weather_code,wind_speed_10m',
    timezone: 'auto',
  }
  const fallbackParams = {
    ...params,
    hourly: 'temperature_2m,wind_speed_10m,weather_code,rain',
  }

  let responses
  try {
    responses = await fetchWeatherApi(OPEN_METEO_FORECAST_URL, params)
  } catch {
    responses = await fetchWeatherApi(OPEN_METEO_FORECAST_URL, fallbackParams)
  }
  const response = responses[0]
  if (!response) {
    throw new Error('No weather data returned.')
  }

  const current = response.current()
  const daily = response.daily()
  if (!current || !daily) {
    throw new Error('Incomplete forecast response.')
  }

  const tempVar = current.variables(0)
  const humidityVar = current.variables(1)
  const codeVar = current.variables(4)
  const windVar = current.variables(5)
  const rainVar = current.variables(2)
  const precipitationVar = current.variables(3)

  const weatherCode = codeVar ? codeVar.value() : 0
  const { condition, description } = wmoWeatherCodeToLabels(weatherCode)
  let aqiData = { aqi: null, pm10: null, pm2_5: null }
  try {
    aqiData = await fetchAqiByCity(label || city)
  } catch {
    try {
      aqiData = await fetchAqiByCoordinatesFallback(latitude, longitude)
    } catch {
      aqiData = { aqi: null, pm10: null, pm2_5: null }
    }
  }

  const maxArr = daily.variables(1)?.valuesArray()
  const minArr = daily.variables(2)?.valuesArray()
  const rainSumArr = daily.variables(3)?.valuesArray()
  const windMaxArr = daily.variables(4)?.valuesArray()
  const tempMaxC = maxArr && maxArr.length ? Number(maxArr[0]) : NaN
  const tempMinC = minArr && minArr.length ? Number(minArr[0]) : NaN
  const dailyRainSumMm = rainSumArr && rainSumArr.length ? Number(rainSumArr[0]) : NaN
  const dailyMaxWindKmh = windMaxArr && windMaxArr.length ? Number(windMaxArr[0]) : NaN

  const computedHourly = buildHourlyForecast(response)
  const currentRainForFallback = rainVar ? Number(rainVar.value()) : NaN
  const fallbackRainPercent = Number.isFinite(currentRainForFallback)
    ? Math.max(0, Math.min(100, Math.round(currentRainForFallback * 20)))
    : 0

  return {
    city: label,
    latitude: Number(latitude),
    longitude: Number(longitude),
    condition,
    description,
    temperatureC: tempVar ? Number(tempVar.value()) : NaN,
    tempMinC: Number.isFinite(tempMinC) ? tempMinC : Number(tempVar?.value() ?? 0),
    tempMaxC: Number.isFinite(tempMaxC) ? tempMaxC : Number(tempVar?.value() ?? 0),
    humidity: humidityVar ? Number(humidityVar.value()) : 0,
    rainMm: rainVar ? Number(rainVar.value()) : 0,
    precipitationMm: precipitationVar ? Number(precipitationVar.value()) : 0,
    aqi: Number.isFinite(aqiData.aqi) ? aqiData.aqi : null,
    pm10: Number.isFinite(aqiData.pm10) ? aqiData.pm10 : null,
    pm2_5: Number.isFinite(aqiData.pm2_5) ? aqiData.pm2_5 : null,
    windSpeed: windVar ? Number(windVar.value()) : 0,
    dailyRainSumMm: Number.isFinite(dailyRainSumMm) ? dailyRainSumMm : 0,
    dailyMaxWindKmh: Number.isFinite(dailyMaxWindKmh) ? dailyMaxWindKmh : 0,
    weatherCode: Math.round(Number(weatherCode) || 0),
    hourlyForecast:
      computedHourly.length > 0
        ? computedHourly
        : buildFallbackHourlyForecastFromCurrent(
            tempVar ? Number(tempVar.value()) : NaN,
            condition,
            fallbackRainPercent
          ),
    icon: `wmo-${Math.round(weatherCode)}`,
    fetchedAt: new Date().toISOString(),
  }
}

async function fetchAqiByCity(city) {
  const cityName = String(city || '').trim()
  if (!cityName) throw new Error('City is required for AQI lookup.')
  if (!API_NINJAS_KEY) throw new Error('API_NINJAS_KEY is missing.')

  const url = new URL(API_NINJAS_AQI_URL)
  url.searchParams.set('city', cityName)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AQI_TIMEOUT_MS)
  const response = await fetch(url.toString(), {
    headers: {
      'X-Api-Key': API_NINJAS_KEY,
    },
    signal: controller.signal,
  })
  clearTimeout(timeout)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || 'AQI request failed.')
  }

  const aqi = Number(data?.overall_aqi)
  const pm10 = Number(data?.PM10?.concentration)
  const pm25 = Number(data?.PM2_5?.concentration)
  if (!Number.isFinite(aqi)) {
    throw new Error('AQI unavailable for this location.')
  }

  return {
    aqi: Math.max(0, Math.round(aqi)),
    pm10: Number.isFinite(pm10) ? Number(pm10.toFixed(1)) : null,
    pm2_5: Number.isFinite(pm25) ? Number(pm25.toFixed(1)) : null,
  }
}

async function fetchAqiByCoordinatesFallback(latitude, longitude) {
  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('current', 'us_aqi')
  url.searchParams.set('hourly', 'pm10,pm2_5')
  url.searchParams.set('timezone', 'auto')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AQI_TIMEOUT_MS)
  const response = await fetch(url.toString(), { signal: controller.signal })
  clearTimeout(timeout)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.reason || 'AQI fallback request failed.')
  }

  const currentAqi = Number(data?.current?.us_aqi)
  const pm10Series = Array.isArray(data?.hourly?.pm10) ? data.hourly.pm10 : []
  const pm25Series = Array.isArray(data?.hourly?.pm2_5) ? data.hourly.pm2_5 : []
  const pm10 = Number(pm10Series.find((v) => Number.isFinite(Number(v))))
  const pm25 = Number(pm25Series.find((v) => Number.isFinite(Number(v))))
  if (!Number.isFinite(currentAqi)) {
    throw new Error('AQI fallback unavailable.')
  }

  return {
    aqi: Math.max(0, Math.round(currentAqi)),
    pm10: Number.isFinite(pm10) ? Number(pm10.toFixed(1)) : null,
    pm2_5: Number.isFinite(pm25) ? Number(pm25.toFixed(1)) : null,
  }
}

function getAreaRiskFromSignals(rainfall, aqi) {
  const rain = Number(rainfall) || 0
  const aqiValue = Number(aqi) || 0

  // IMD-heavy rainfall and US AQI breakpoints.
  if (rain >= 100 || aqiValue >= 301) return 2
  if (rain >= 35 || aqiValue >= 201) return 1
  if (rain >= 70 && aqiValue >= 151) return 2
  return 0
}

function normalizeRiskLabel(risk) {
  const v = String(risk || '').trim().toLowerCase()
  if (v === 'high' || v === 'medium' || v === 'low') return v
  return 'medium'
}

function pickRecommendedPlan(weeklyPrice) {
  const plans = [
    { key: 'basic', premium: 20 },
    { key: 'standard', premium: 40 },
    { key: 'premium', premium: 70 },
  ]
  let best = plans[0]
  let minDiff = Math.abs(weeklyPrice - best.premium)
  for (let i = 1; i < plans.length; i += 1) {
    const diff = Math.abs(weeklyPrice - plans[i].premium)
    if (diff < minDiff) {
      minDiff = diff
      best = plans[i]
    }
  }
  return best.key
}

async function requestModelPrice(payload) {
  const candidateUrls = [
    PRICE_MODEL_PREDICT_URL,
    new URL('/predict-price', PRICE_MODEL_URL).toString(),
    new URL('/predict', PRICE_MODEL_URL).toString(),
    new URL('/', PRICE_MODEL_URL).toString(),
  ]
  for (const target of candidateUrls) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 9000)
      const response = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!response.ok) continue
      const data = await response.json().catch(() => null)
      if (!data || typeof data !== 'object') continue

      const price = Number(data.price ?? data.weekly_price ?? data.weeklyPrice)
      const riskScore = normalizeRiskLabel(data.risk_score ?? data.riskScore ?? data.risk)
      if (Number.isFinite(price)) {
        return {
          weeklyPrice: Math.min(70, Math.max(20, Math.round(price))),
          riskScore,
        }
      }
    } catch {
      /* try next endpoint */
    }
  }
  return null
}

function fallbackWeeklyPrice(areaRisk, pastDisruptions, aqi, rainfall) {
  const base = 20
  const areaWeight = areaRisk * 14
  const disruptionsWeight = Math.min(5, pastDisruptions) * 4
  const aqiWeight = aqi >= 301 ? 8 : aqi >= 201 ? 5 : aqi >= 151 ? 2 : 0
  const rainWeight = rainfall >= 100 ? 8 : rainfall >= 65 ? 4 : rainfall >= 35 ? 2 : 0
  return Math.min(70, Math.max(20, Math.round(base + areaWeight + disruptionsWeight + aqiWeight + rainWeight)))
}

function toFiniteNumber(v, fallback = null) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const aLat = toFiniteNumber(lat1)
  const aLon = toFiniteNumber(lon1)
  const bLat = toFiniteNumber(lat2)
  const bLon = toFiniteNumber(lon2)
  if (![aLat, aLon, bLat, bLon].every((n) => Number.isFinite(n))) return null
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLon = ((bLon - aLon) * Math.PI) / 180
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))
  return R * c
}

function deriveActivityLevelFromWeather(weather) {
  const rainMm = Number(weather?.rainMm ?? weather?.precipitationMm ?? 0) || 0
  const windKmh = Number(weather?.windSpeed ?? weather?.dailyMaxWindKmh ?? 0) || 0
  const aqi = Number(weather?.aqi ?? 0) || 0
  if (rainMm >= 40 || windKmh >= 65 || aqi >= 250) return 0
  if (rainMm >= 10 || windKmh >= 35 || aqi >= 150) return 1
  return 2
}

function countCreditedClaims(claims) {
  return (Array.isArray(claims) ? claims : []).reduce((sum, claim) => {
    return String(claim?.status || '') === 'credited' ? sum + 1 : sum
  }, 0)
}

function hoursSinceLastClaim(claims) {
  const list = Array.isArray(claims) ? claims : []
  const sorted = [...list]
    .filter((c) => c?.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  if (!sorted.length) return 24 * 30
  const lastMs = new Date(sorted[0].createdAt).getTime()
  if (!Number.isFinite(lastMs)) return 24 * 30
  const diffMs = Date.now() - lastMs
  if (!Number.isFinite(diffMs) || diffMs < 0) return 0
  return Number((diffMs / (1000 * 60 * 60)).toFixed(2))
}

async function resolveLocationMatch(profileCity, weather, currentLocation) {
  const lat = toFiniteNumber(currentLocation?.latitude)
  const lon = toFiniteNumber(currentLocation?.longitude)
  // Fail-safe: if user live location is unavailable, do not treat as a match.
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return {
      locationMatch: 0,
      distanceKm: null,
      resolvedFrom: 'missing-current-location',
      expectedCoords: null,
      actualCoords: null,
      expectedLabel: String(profileCity || '').trim() || '',
    }
  }
  const weatherLat = toFiniteNumber(weather?.latitude)
  const weatherLon = toFiniteNumber(weather?.longitude)
  if (Number.isFinite(weatherLat) && Number.isFinite(weatherLon)) {
    const distanceKm = haversineDistanceKm(weatherLat, weatherLon, lat, lon)
    if (Number.isFinite(distanceKm)) {
      return {
        locationMatch: distanceKm <= 30 ? 1 : 0,
        distanceKm: Number(distanceKm.toFixed(2)),
        resolvedFrom: 'weather-coordinates',
        expectedCoords: { latitude: weatherLat, longitude: weatherLon },
        actualCoords: { latitude: lat, longitude: lon },
        expectedLabel: String(weather?.city || profileCity || '').trim(),
      }
    }
  }
  const city = String(profileCity || '').trim()
  if (!city) {
    return {
      locationMatch: 0,
      distanceKm: null,
      resolvedFrom: 'missing-profile-city',
      expectedCoords: null,
      actualCoords: { latitude: lat, longitude: lon },
      expectedLabel: '',
    }
  }
  try {
    const resolved = await geocodeCityName(city)
    const distanceKm = haversineDistanceKm(resolved.latitude, resolved.longitude, lat, lon)
    if (!Number.isFinite(distanceKm)) {
      return {
        locationMatch: 0,
        distanceKm: null,
        resolvedFrom: 'invalid-distance',
        expectedCoords: { latitude: resolved.latitude, longitude: resolved.longitude },
        actualCoords: { latitude: lat, longitude: lon },
        expectedLabel: String(resolved.label || city),
      }
    }
    return {
      locationMatch: distanceKm <= 30 ? 1 : 0,
      distanceKm: Number(distanceKm.toFixed(2)),
      resolvedFrom: 'profile-city-geocode',
      expectedCoords: { latitude: resolved.latitude, longitude: resolved.longitude },
      actualCoords: { latitude: lat, longitude: lon },
      expectedLabel: String(resolved.label || city),
    }
  } catch {
    return {
      locationMatch: 0,
      distanceKm: null,
      resolvedFrom: 'profile-city-geocode-failed',
      expectedCoords: null,
      actualCoords: { latitude: lat, longitude: lon },
      expectedLabel: String(city || ''),
    }
  }
}

async function requestFraudPrediction(input) {
  const payload = {
    location_match: Number(input.location_match || 0),
    activity_level: Number(input.activity_level || 0),
    claims_count: Number(input.claims_count || 0),
    time_gap_between_claims: Number(input.time_gap_between_claims || 0),
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FRAUD_MODEL_TIMEOUT_MS)
  try {
    const response = await fetch(FRAUD_MODEL_PREDICT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (!response.ok) {
      const raw = await response.text().catch(() => '')
      throw new Error(raw || `Fraud model request failed with status ${response.status}`)
    }
    const data = await response.json().catch(() => ({}))
    const resultLabel = String(data?.result ?? data?.label ?? '')
      .trim()
      .toLowerCase()
    const fraudRaw = Number(
      data?.fraud ??
        data?.prediction ??
        data?.is_fraud ??
        (resultLabel === 'fraud' ? 1 : resultLabel === 'not fraud' ? 0 : 0)
    )
    const scoreRaw = Number(
      data?.fraud_score ??
        data?.score ??
        data?.fraudProbability ??
        data?.probability ??
        data?.confidence ??
        fraudRaw
    )
    const fraud = fraudRaw === 1 ? 1 : 0
    // Some model variants return percentages (0..100) instead of probabilities (0..1).
    const normalizedScore = Number.isFinite(scoreRaw)
      ? scoreRaw > 1
        ? scoreRaw / 100
        : scoreRaw
      : fraud
    const fraudScore = Math.max(0, Math.min(1, normalizedScore))
    return { fraud, fraudScore, raw: data, input: payload }
  } finally {
    clearTimeout(timeout)
  }
}

async function evaluateClaimFraudRisk(user, weather, options = {}) {
  const profile = cloneProfilePlain(user)
  const claims = Array.isArray(profile.claims) ? profile.claims : []
  const enteredCity = String(
    profile.city || profile.weather?.city || weather?.city || options.enteredLocation || ''
  ).trim()
  const locationInfo = await resolveLocationMatch(enteredCity, weather, options.currentLocation)
  const locationMatch = Number(locationInfo?.locationMatch || 0)
  const activityLevel = Number.isFinite(Number(options.activityLevel))
    ? Number(options.activityLevel)
    : deriveActivityLevelFromWeather(weather)
  const claimsCount = countCreditedClaims(claims)
  const timeGapBetweenClaims = hoursSinceLastClaim(claims)
  const fraudInput = {
    location_match: locationMatch,
    activity_level: activityLevel,
    claims_count: claimsCount,
    time_gap_between_claims: timeGapBetweenClaims,
  }
  try {
    const prediction = await requestFraudPrediction(fraudInput)
    const locationMismatch = Number(locationMatch) === 0
    const shouldBlock =
      locationMismatch ||
      prediction.fraud === 1 ||
      Number(prediction.fraudScore || 0) >= FRAUD_BLOCK_SCORE_THRESHOLD
    return {
      ok: true,
      shouldBlock,
      fraud: prediction.fraud,
      fraudScore: Number(prediction.fraudScore.toFixed(4)),
      modelInput: fraudInput,
      modelOutput: prediction.raw,
      reason: locationMismatch ? 'location_mismatch' : 'model_decision',
      location: locationInfo,
      enteredCity,
    }
  } catch (error) {
    return {
      ok: false,
      shouldBlock: true,
      fraud: 0,
      fraudScore: 0,
      modelInput: fraudInput,
      modelOutput: null,
      error: error?.message || 'Fraud model unavailable',
      location: locationInfo,
      enteredCity,
    }
  }
}

const CLAIM_TIER_MULTIPLIER = { basic: 0.7, standard: 0.8, premium: 0.9 }
const CLAIM_TRIGGER_PRIORITY = ['severe_aqi', 'extreme_heat', 'heavy_rain', 'severe_wind']

const TRIGGER_ENV_PATH = path.join(__dirname, '..', '.env')

function parseTriggerEnvNumber(key, fallback, min, max) {
  const raw = String(process.env[key] ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
  if (raw === '') return fallback
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  let v = n
  if (typeof min === 'number') v = Math.max(min, v)
  if (typeof max === 'number') v = Math.min(max, v)
  return v
}

function claimTriggersHotReloadEnabled() {
  const raw = String(process.env.PAYNEST_TRIGGERS_RELOAD_ENV || '')
    .trim()
    .replace(/^["']|["']$/g, '')
  return raw === '1' || raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes'
}

/**
 * Thresholds for auto-claims. Set in .env:
 * PAYNEST_TRIGGER_RAIN_MM, PAYNEST_TRIGGER_AQI, PAYNEST_TRIGGER_TEMP_C, PAYNEST_TRIGGER_WIND_KMH
 * Use PAYNEST_TRIGGERS_RELOAD_ENV=true locally to re-read .env on every check (no server restart).
 */
function getClaimTriggerThresholds() {
  if (claimTriggersHotReloadEnabled()) {
    dotenv.config({ path: TRIGGER_ENV_PATH, override: true })
  }
  return {
    rainMm: parseTriggerEnvNumber('PAYNEST_TRIGGER_RAIN_MM', 50, 0, 800),
    aqi: parseTriggerEnvNumber('PAYNEST_TRIGGER_AQI', 300, 0, 2000),
    tempC: parseTriggerEnvNumber('PAYNEST_TRIGGER_TEMP_C', 40, -30, 55),
    windKmh: parseTriggerEnvNumber('PAYNEST_TRIGGER_WIND_KMH', 75, 0, 300),
  }
}

function getPerDisruptionPayoutAmount(tier, dailyIncome) {
  const t = String(tier || '').toLowerCase()
  const mult = CLAIM_TIER_MULTIPLIER[t] ?? 0.7
  const income = Number(dailyIncome)
  if (!Number.isFinite(income) || income <= 0) return 0
  return Math.max(0, Math.round(income * mult))
}

function detectExtremeWeatherTriggers(weather) {
  if (!weather || typeof weather !== 'object') return []

  const th = getClaimTriggerThresholds()

  const rainNow = Number(weather.rainMm) || 0
  const rainDaily = Number(weather.dailyRainSumMm) || 0
  const effectiveRain = Math.max(rainNow, rainDaily)

  const aqi = Number(weather.aqi)
  const tempNow = Number(weather.temperatureC)
  const tempMax = Number(weather.tempMaxC)
  const effectiveTemp = Math.max(
    Number.isFinite(tempNow) ? tempNow : -Infinity,
    Number.isFinite(tempMax) ? tempMax : -Infinity
  )

  const windNow = Number(weather.windSpeed) || 0
  const windDaily = Number(weather.dailyMaxWindKmh) || 0
  const effectiveWind = Math.max(windNow, windDaily)

  const fired = []
  if (Number.isFinite(aqi) && aqi > th.aqi) {
    fired.push({
      code: 'severe_aqi',
      label: `Severe air quality (AQI ${Math.round(aqi)})`,
    })
  }
  if (Number.isFinite(effectiveTemp) && effectiveTemp > th.tempC) {
    fired.push({
      code: 'extreme_heat',
      label: `Extreme heat (${Math.round(effectiveTemp)}°C)`,
    })
  }
  if (effectiveRain > th.rainMm) {
    fired.push({
      code: 'heavy_rain',
      label: `Heavy rain (${effectiveRain.toFixed(1)} mm)`,
    })
  }
  if (effectiveWind >= th.windKmh) {
    fired.push({
      code: 'severe_wind',
      label: `Severe wind (${Math.round(effectiveWind)} km/h)`,
    })
  }

  fired.sort(
    (a, b) => CLAIM_TRIGGER_PRIORITY.indexOf(a.code) - CLAIM_TRIGGER_PRIORITY.indexOf(b.code)
  )
  return fired
}

function sumCreditedClaimsForPeriod(claims, subscriptionOrderId) {
  const id = String(subscriptionOrderId || '')
  if (!id) return 0
  return (Array.isArray(claims) ? claims : []).reduce((sum, c) => {
    if (String(c?.subscriptionOrderId || '') !== id) return sum
    if (String(c?.status || '') !== 'credited') return sum
    return sum + (Number(c?.amount) || 0)
  }, 0)
}

async function processSimulatedRazorpayPayout() {
  const useSimulate = process.env.RAZORPAY_CLAIM_PAYOUT_SIMULATE !== 'false'
  if (useSimulate) {
    const payoutId = `pout_test_${randomUUID().replace(/-/g, '').slice(0, 16)}`
    return { payoutId, mode: 'simulated', ok: true }
  }
  return { payoutId: null, mode: 'disabled', ok: false }
}

function buildSyntheticExtremeWeather(triggerCode) {
  const th = getClaimTriggerThresholds()
  const now = new Date().toISOString()
  const base = {
    city: 'simulator',
    fetchedAt: now,
    rainMm: 0,
    dailyRainSumMm: 0,
    aqi: 50,
    temperatureC: 28,
    tempMaxC: 28,
    windSpeed: 10,
    dailyMaxWindKmh: 10,
  }
  const t = String(triggerCode || 'severe_aqi').toLowerCase()
  if (t === 'heavy_rain') {
    const v = th.rainMm + 1
    return { ...base, rainMm: v, dailyRainSumMm: v }
  }
  if (t === 'extreme_heat') {
    const v = th.tempC + 1
    return { ...base, temperatureC: v, tempMaxC: v }
  }
  if (t === 'severe_wind') {
    return { ...base, windSpeed: th.windKmh, dailyMaxWindKmh: th.windKmh }
  }
  return { ...base, aqi: th.aqi + 1 }
}

/**
 * Evaluates extreme weather against an active subscription and records at most one auto-claim per UTC day.
 * Mutates `user` in memory; caller must save. Returns a UI payload when a claim was credited.
 */
async function applyAutoClaimFromWeather(
  user,
  weather,
  { degraded = false, bypassDailyLimit = false, simulation = false, fraudContext = null } = {}
) {
  if (degraded || !weather) return null

  const profile = cloneProfilePlain(user)
  const subscriptionSnapshot = getSubscriptionSnapshot(profile.subscription)
  if (subscriptionSnapshot.status !== 'active') return null

  const selectedPlan = profile.selectedPlan
  if (!selectedPlan || !selectedPlan.tier) return null

  const coverageAmount = Number(selectedPlan.coverageAmount)
  if (!Number.isFinite(coverageAmount) || coverageAmount <= 0) return null

  const dailyIncome = Number(profile.dailyIncome)
  if (!Number.isFinite(dailyIncome) || dailyIncome <= 0) return null

  const triggers = detectExtremeWeatherTriggers(weather)
  if (!triggers.length) return null

  const todayUtc = new Date().toISOString().slice(0, 10)
  if (!bypassDailyLimit && String(profile.lastAutoClaimDayUtc || '') === todayUtc) return null

  const periodOrderId = String(profile.subscription?.lastOrderId || '')
  if (!periodOrderId) return null

  const claims = Array.isArray(profile.claims) ? [...profile.claims] : []
  const usedInPeriod = sumCreditedClaimsForPeriod(claims, periodOrderId)
  const remainingCoverage = Math.max(0, coverageAmount - usedInPeriod)
  if (remainingCoverage <= 0) return null

  const tier = String(selectedPlan.tier).toLowerCase()
  const perClaim = getPerDisruptionPayoutAmount(tier, dailyIncome)
  if (perClaim <= 0) return null

  const payoutAmount = Math.min(perClaim, remainingCoverage)
  if (payoutAmount <= 0) return null

  const fraudCheck = await evaluateClaimFraudRisk(user, weather, {
    currentLocation: fraudContext?.currentLocation,
    activityLevel: fraudContext?.activityLevel,
    enteredLocation: fraudContext?.enteredLocation,
  })
  const manualReviewApproved = Boolean(simulation && fraudContext?.manualReviewApprove)
  const forceFraudBlock = Boolean(simulation && fraudContext?.forceFraudBlock)
  const blockedByFraud = forceFraudBlock || (!manualReviewApproved && (!fraudCheck.ok || fraudCheck.shouldBlock))
  if (blockedByFraud) {
    const blockedClaimRecord = {
      id: randomUUID(),
      trigger: 'fraud_block',
      triggerLabel: simulation
        ? '[TEST] Fraud risk detected'
        : !fraudCheck.ok
          ? 'Fraud check unavailable'
          : 'Fraud risk detected',
      amount: 0,
      coverageRemainingAfter: remainingCoverage,
      status: 'cancelled_fraud',
      razorpayPayoutId: '',
      payoutMode: 'blocked',
      subscriptionOrderId: periodOrderId,
      createdAt: new Date().toISOString(),
      fraud: {
        fraud: fraudCheck.fraud,
        score: fraudCheck.fraudScore,
        input: fraudCheck.modelInput,
      },
    }
    claims.push(blockedClaimRecord)
    profile.claims = claims.slice(-100)
    profile.updatedAt = new Date().toISOString()
    user.profile = normalizeProfileForSave({ ...profile })
    user.markModified('profile')
    return {
      ok: false,
      blockedByFraud: true,
      headline: !fraudCheck.ok ? 'Fraud check unavailable' : 'Fraud detected',
      message: !fraudCheck.ok
        ? `Claim cancelled because fraud check failed (${fraudCheck.error || 'service unavailable'}).`
        : fraudCheck.reason === 'location_mismatch'
          ? 'Claim cancelled because current location does not match profile city.'
          : `Claim cancelled by fraud engine (score: ${fraudCheck.fraudScore.toFixed(2)}).`,
      fraud: fraudCheck,
      claim: blockedClaimRecord,
      decisionSummary: {
        threshold: FRAUD_BLOCK_SCORE_THRESHOLD,
        score: fraudCheck.fraudScore,
        locationMatch: fraudCheck.modelInput?.location_match,
        modelFraud: fraudCheck.fraud,
        source: fraudCheck.reason || 'model_decision',
      },
    }
  }

  const primary = triggers[0]
  const payout = await processSimulatedRazorpayPayout()
  if (!payout.ok) {
    return {
      ok: false,
      headline: 'Disruption detected ⚠️',
      message:
        'Conditions matched an automatic claim, but payout is not enabled. Set RAZORPAY_CLAIM_PAYOUT_SIMULATE=true (default) for test credits.',
      triggerLabel: primary.label,
    }
  }

  const coverageAfter = Math.max(0, remainingCoverage - payoutAmount)

  const claimRecord = {
    id: randomUUID(),
    trigger: primary.code,
    triggerLabel: simulation ? `[TEST] ${primary.label}` : primary.label,
    amount: payoutAmount,
    coverageRemainingAfter: coverageAfter,
    status: 'credited',
    razorpayPayoutId: payout.payoutId || '',
    payoutMode: payout.mode,
    subscriptionOrderId: periodOrderId,
    createdAt: new Date().toISOString(),
    fraud: {
      fraud: fraudCheck.fraud,
      score: fraudCheck.fraudScore,
      reason: fraudCheck.reason,
      input: fraudCheck.modelInput,
      manualReviewApproved,
    },
  }

  claims.push(claimRecord)
  profile.claims = claims.slice(-100)
  if (!bypassDailyLimit) {
    profile.lastAutoClaimDayUtc = todayUtc
  }
  profile.updatedAt = new Date().toISOString()

  user.profile = normalizeProfileForSave({ ...profile })
  user.markModified('profile')

  return {
    ok: true,
    headline: 'Disruption detected ⚠️',
    creditLine: `₹${payoutAmount} credited automatically`,
    amount: payoutAmount,
    triggerLabel: primary.label,
    triggerCode: primary.code,
    razorpayPayoutId: payout.payoutId,
    payoutMode: payout.mode,
    remainingCoverage: coverageAfter,
    claim: claimRecord,
    fraud: {
      fraud: fraudCheck.fraud,
      fraudScore: fraudCheck.fraudScore,
      reason: fraudCheck.reason,
      modelInput: fraudCheck.modelInput,
      manualReviewApproved,
    },
    decisionSummary: {
      threshold: FRAUD_BLOCK_SCORE_THRESHOLD,
      score: fraudCheck.fraudScore,
      locationMatch: fraudCheck.modelInput?.location_match,
      modelFraud: fraudCheck.fraud,
      source: manualReviewApproved ? 'manual_review_override' : fraudCheck.reason || 'model_decision',
      manualReviewApproved,
    },
  }
}

function buildClaimsSummary(profile) {
  const p = profile || {}
  const selectedPlan = p.selectedPlan || null
  const tier = String(selectedPlan?.tier || '').toLowerCase()
  const coverageAmount = Number(selectedPlan?.coverageAmount) || 0
  const dailyIncome = Number(p.dailyIncome) || 0
  const perClaim = getPerDisruptionPayoutAmount(tier, dailyIncome)
  const periodOrderId = String(p.subscription?.lastOrderId || '')
  const claims = Array.isArray(p.claims) ? p.claims : []
  const usedInPeriod = sumCreditedClaimsForPeriod(claims, periodOrderId)
  const remaining = Math.max(0, coverageAmount - usedInPeriod)
  const maxClaimsApprox =
    perClaim > 0 && coverageAmount > 0 ? Math.floor(coverageAmount / perClaim) : 0

  const trig = getClaimTriggerThresholds()

  return {
    selectedPlan,
    coverageAmount,
    dailyIncome,
    perClaimAmount: perClaim,
    usedInPeriod,
    remainingCoverage: remaining,
    maxClaimsApprox,
    claims: [...claims].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)),
    triggersInfo: {
      rainAboveMm: trig.rainMm,
      aqiAbove: trig.aqi,
      tempAboveC: trig.tempC,
      windAtLeastKmh: trig.windKmh,
      reloadsFromEnvFile: claimTriggersHotReloadEnabled(),
    },
  }
}

/** Comma-separated browser origins allowed to call this API (e.g. https://your-ui.onrender.com). Set on Render for split UI + API deploys. */
function parseOriginsList(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const FRONTEND_ORIGINS = parseOriginsList(
  process.env.FRONTEND_ORIGINS || process.env.ALLOWED_ORIGINS,
)

const corsOptions = {
  origin:
    FRONTEND_ORIGINS.length > 0
      ? FRONTEND_ORIGINS
      : true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  maxAge: 86_400,
}

const app = express()
app.use(cors(corsOptions))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'paynest-api' })
})

/** City name search via OpenStreetMap Nominatim (same map data ecosystem as Leaflet/OSM UI). */
app.get('/api/locations/city-search', async (req, res) => {
  try {
    const name = String(req.query.name || req.query.q || '').trim()
    if (name.length < 2) {
      return res.status(400).json({ message: 'Query must be at least 2 characters.' })
    }

    const url = new URL('https://nominatim.openstreetmap.org/search')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('q', name)
    url.searchParams.set('limit', '8')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('accept-language', 'en')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      const text = await response.text()
      return res.status(502).json({
        message: text.slice(0, 300) || 'City lookup service request failed.',
      })
    }

    const data = await response.json().catch(() => [])
    if (!Array.isArray(data)) {
      return res.json({ results: [] })
    }

    const results = data
      .map((row, i) => {
        const lat = Number(row?.lat)
        const lon = Number(row?.lon)
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
        const addr = row?.address || {}
        const cityName = String(
          addr.city ||
            addr.town ||
            addr.village ||
            addr.municipality ||
            addr.county ||
            String(row?.display_name || '').split(',')[0] ||
            ''
        ).trim()
        const state = String(addr.state || addr.state_district || '').trim()
        const country = String(addr.country || '').trim()
        const countryCode = String(addr.country_code || '').trim().toUpperCase()

        const displayName = [cityName, state, country].filter(Boolean).join(', ')
        const city = [cityName, countryCode].filter(Boolean).join(', ')

        return {
          placeId: `${row?.osm_type || 'osm'}|${row?.osm_id || i}|${lat}|${lon}|${i}`,
          lat,
          lon,
          displayName: displayName || String(row?.display_name || '').trim(),
          label: displayName || String(row?.display_name || '').trim(),
          city: city || cityName,
        }
      })
      .filter(Boolean)

    return res.json({ results })
  } catch (error) {
    const message = error?.name === 'AbortError' ? 'City search timed out.' : error?.message
    return res.status(500).json({ message: message || 'City search failed.' })
  }
})

app.post('/api/auth/signup', async (req, res) => {
  const { name = '', email = '', password = '' } = req.body || {}
  const normalizedEmail = email.trim().toLowerCase()

  if (!name.trim() || !normalizedEmail || password.length < 6) {
    return res.status(400).json({ message: 'Name, email, and password are required.' })
  }

  const exists = await User.findOne({ email: normalizedEmail })
  if (exists) {
    return res.status(409).json({ message: 'Email already registered.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    profileCompleted: false,
    needsInitialPlanChoice: true,
    profile: null,
  })

  const token = randomUUID()
  await Session.create({ token, userId: user._id })

  return res.json({ token, user: sanitizeUser(user) })
})

app.post('/api/auth/login', async (req, res) => {
  const { identity = '', password = '' } = req.body || {}
  const lookup = identity.trim().toLowerCase()
  if (safeEqualText(lookup, ADMIN_EMAIL) && safeEqualText(String(password || ''), ADMIN_PASSWORD)) {
    const token = randomUUID()
    await Session.create({ token, role: 'admin', adminEmail: ADMIN_EMAIL })
    return res.json({
      token,
      user: {
        id: 'admin',
        name: ADMIN_DISPLAY_NAME,
        email: ADMIN_EMAIL,
        role: 'admin',
      },
    })
  }

  const user = await User.findOne({
    $or: [{ email: lookup }, { name: lookup }],
  })

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials.' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials.' })
  }

  const token = randomUUID()
  await Session.create({ token, userId: user._id })

  return res.json({ token, user: sanitizeUser(user) })
})

app.post('/api/admin/login', async (req, res) => {
  const { email = '', password = '' } = req.body || {}
  const normalizedEmail = String(email).trim().toLowerCase()
  const normalizedPassword = String(password || '')

  if (!normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }
  if (!safeEqualText(normalizedEmail, ADMIN_EMAIL) || !safeEqualText(normalizedPassword, ADMIN_PASSWORD)) {
    return res.status(401).json({ message: 'Invalid admin credentials.' })
  }

  const token = randomUUID()
  await Session.create({ token, role: 'admin', adminEmail: ADMIN_EMAIL })
  return res.json({
    token,
    admin: {
      email: ADMIN_EMAIL,
      name: ADMIN_DISPLAY_NAME,
      role: 'admin',
    },
  })
})

app.get('/api/admin/me', async (req, res) => {
  const session = await getAdminSessionFromToken(req)
  if (!session) return res.status(401).json({ message: 'Admin authentication required.' })
  return res.json({
    admin: {
      email: session.adminEmail || ADMIN_EMAIL,
      name: ADMIN_DISPLAY_NAME,
      role: 'admin',
    },
  })
})

app.get('/api/admin/users', async (req, res) => {
  const adminSession = await requireAdminSession(req, res)
  if (!adminSession) return

  const users = await User.find({}).sort({ createdAt: -1 }).limit(500)
  const summaries = users.map(buildAdminUserSummary)
  const totals = summaries.reduce(
    (acc, u) => {
      acc.users += 1
      if (u.profileCompleted) acc.profileCompleted += 1
      if (u.subscription?.status === 'active') acc.activeSubscriptions += 1
      acc.totalClaims += Number(u.claimsCount || 0)
      acc.totalPayments += Number(u.paymentsCount || 0)
      return acc
    },
    { users: 0, profileCompleted: 0, activeSubscriptions: 0, totalClaims: 0, totalPayments: 0 }
  )

  return res.json({ totals, users: summaries })
})

app.get('/api/admin/users/:userId', async (req, res) => {
  const adminSession = await requireAdminSession(req, res)
  if (!adminSession) return

  const { userId } = req.params
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid user id.' })
  }

  const user = await User.findById(userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })

  const summary = buildAdminUserSummary(user)
  const profile = cloneProfilePlain(user)
  const claims = [...(Array.isArray(profile.claims) ? profile.claims : [])].sort(
    (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
  )
  const payments = [...(Array.isArray(profile.payments) ? profile.payments : [])].sort(
    (a, b) => new Date(b?.paidAt || 0) - new Date(a?.paidAt || 0)
  )

  return res.json({
    user: {
      ...summary,
      profile: {
        fullName: profile.fullName || '',
        phone: profile.phone || '',
        city: profile.city || '',
        workPlatform: profile.workPlatform || '',
        dailyIncome: Number(profile.dailyIncome || 0),
        selectedPlan: profile.selectedPlan || null,
        dynamicPricing: profile.dynamicPricing || null,
        rewards: profile.rewards || null,
      },
      disruptions: Array.isArray(profile.disruptions) ? profile.disruptions : [],
      claims,
      payments,
    },
  })
})

app.patch('/api/admin/users/:userId', async (req, res) => {
  const adminSession = await requireAdminSession(req, res)
  if (!adminSession) return

  const { userId } = req.params
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid user id.' })
  }
  const user = await User.findById(userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })

  const {
    name,
    email,
    profileCompleted,
    needsInitialPlanChoice,
    city,
    workPlatform,
    dailyIncome,
    phone,
    subscriptionStatus,
  } = req.body || {}

  if (typeof name === 'string' && name.trim()) user.name = name.trim()
  if (typeof email === 'string' && email.trim()) {
    const normalizedEmail = email.trim().toLowerCase()
    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } })
    if (existing) return res.status(409).json({ message: 'Email already used by another account.' })
    user.email = normalizedEmail
  }
  if (typeof profileCompleted === 'boolean') user.profileCompleted = profileCompleted
  if (typeof needsInitialPlanChoice === 'boolean') user.needsInitialPlanChoice = needsInitialPlanChoice

  const profile = cloneProfilePlain(user)
  if (typeof city === 'string') profile.city = city.trim()
  if (typeof workPlatform === 'string') profile.workPlatform = workPlatform.trim()
  if (typeof phone === 'string') profile.phone = phone.trim()
  if (dailyIncome !== undefined && Number.isFinite(Number(dailyIncome))) {
    profile.dailyIncome = Math.max(0, Number(dailyIncome))
  }
  if (typeof subscriptionStatus === 'string') {
    const nextStatus = subscriptionStatus.trim().toLowerCase()
    if (['none', 'active', 'expired'].includes(nextStatus)) {
      const snap = getSubscriptionSnapshot(profile.subscription)
      profile.subscription = {
        ...snap,
        status: nextStatus,
        daysLeft: nextStatus === 'active' ? Math.max(1, Number(snap.daysLeft || 1)) : 0,
        expiresAt:
          nextStatus === 'active'
            ? snap.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            : '',
      }
    }
  }

  profile.updatedAt = new Date().toISOString()
  user.profile = normalizeProfileForSave(profile)
  user.markModified('profile')
  await user.save()

  return res.json({ ok: true, user: buildAdminUserSummary(user) })
})

app.post('/api/admin/users/:userId/claims/reset', async (req, res) => {
  const adminSession = await requireAdminSession(req, res)
  if (!adminSession) return

  const { userId } = req.params
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid user id.' })
  }
  const user = await User.findById(userId)
  if (!user) return res.status(404).json({ message: 'User not found.' })

  const profile = cloneProfilePlain(user)
  profile.claims = []
  profile.lastAutoClaimDayUtc = ''
  profile.updatedAt = new Date().toISOString()
  user.profile = normalizeProfileForSave(profile)
  user.markModified('profile')
  await user.save()

  return res.json({ ok: true })
})

app.get('/api/auth/me', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })
  return res.json({ user: sanitizeUser(user) })
})

app.post('/api/profile/details', async (req, res) => {
  const token = getSessionToken(req)
  const session = await Session.findOne({ token })
  if (!session) return res.status(401).json({ message: 'Unauthorized' })

  const user = await User.findById(session.userId)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })

  const { fullName = '', city = '', workPlatform = '', dailyIncome = 0 } = req.body || {}
  const missingFields = []
  if (!fullName.trim()) missingFields.push('fullName')
  if (!city.trim()) missingFields.push('city')
  if (!workPlatform.trim()) missingFields.push('workPlatform')
  if (Number(dailyIncome) <= 0) missingFields.push('dailyIncome')

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: `Please fill all user details. Missing: ${missingFields.join(', ')}`,
    })
  }

  let weather = null
  try {
    weather = await fetchWeatherByCity(city.trim())
  } catch {
    weather = null
  }

  user.name = fullName.trim()
  user.profileCompleted = true
  user.profile = normalizeProfileForSave({
    fullName: fullName.trim(),
    city: city.trim(),
    workPlatform: workPlatform.trim(),
    dailyIncome: Number(dailyIncome),
    weather,
    updatedAt: new Date().toISOString(),
  })
  await user.save()

  return res.json({ user: sanitizeUser(user) })
})

function cloneProfilePlain(user) {
  const raw = user.profile
  if (!raw) return {}
  try {
    const parsed = JSON.parse(JSON.stringify(raw))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return { ...(typeof raw === 'object' ? raw : {}) }
  }
}

/** Ignore stale/partial profile.weather so production refetches after bad saves (e.g. weather: null body). */
function isUsableWeatherSnapshot(w) {
  if (!w || typeof w !== 'object') return false
  if (!String(w.condition || '').trim()) return false
  if (!Number.isFinite(Number(w.temperatureC))) return false
  if (!Array.isArray(w.hourlyForecast) || w.hourlyForecast.length === 0) return false
  return true
}

/** TTL cache must not serve old-city weather after the user updates profile city. */
function cityStringsMatchForWeatherCache(profileCity, weatherCity) {
  const p = String(profileCity || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const w = String(weatherCity || '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!p || !w) return false
  if (p === w) return true
  const pHead = p.split(',')[0].trim()
  const wHead = w.split(',')[0].trim()
  return pHead.length >= 2 && wHead.length >= 2 && pHead === wHead
}

function normalizeProfileForSave(profileInput) {
  const profile = { ...(profileInput || {}) }
  if (profile.selectedPlan == null) delete profile.selectedPlan
  if (profile.dynamicPricing == null) delete profile.dynamicPricing
  return profile
}

function getSubscriptionSnapshot(subscription) {
  if (!subscription || !subscription.expiresAt) {
    return { status: 'none', daysLeft: 0, expiresAt: null, startedAt: null }
  }
  const now = Date.now()
  const expiryMs = new Date(subscription.expiresAt).getTime()
  if (!Number.isFinite(expiryMs)) {
    return { status: 'none', daysLeft: 0, expiresAt: null, startedAt: null }
  }
  const msLeft = expiryMs - now
  const daysLeft = msLeft > 0 ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : 0
  return {
    status: msLeft > 0 ? 'active' : 'expired',
    daysLeft,
    expiresAt: subscription.expiresAt,
    startedAt: subscription.startedAt || null,
  }
}

function roundMoney(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Number((Math.round(v * 100) / 100).toFixed(2))
}

function getNoClaimRewardSnapshot(profileInput, { nowMs = Date.now() } = {}) {
  const profile = profileInput || {}
  const rewards = profile.rewards || {}
  const usedSourceOrderId = String(rewards.lastDiscountSourceOrderId || '')

  const paymentsRaw = Array.isArray(profile.payments) ? profile.payments : []
  const claimsRaw = Array.isArray(profile.claims) ? profile.claims : []

  const claimCountByOrder = new Map()
  for (const claim of claimsRaw) {
    if (String(claim?.status || '') !== 'credited') continue
    const orderId = String(claim?.subscriptionOrderId || '')
    if (!orderId) continue
    claimCountByOrder.set(orderId, (claimCountByOrder.get(orderId) || 0) + 1)
  }

  const cyclesAsc = [...paymentsRaw]
    .sort((a, b) => new Date(a?.paidAt || 0).getTime() - new Date(b?.paidAt || 0).getTime())
    .map((payment) => {
      const paidAt = String(payment?.paidAt || '')
      const paidMs = new Date(paidAt).getTime()
      const orderId = String(payment?.razorpayOrderId || '')
      const endsAtMs = Number.isFinite(paidMs) ? paidMs + 7 * 24 * 60 * 60 * 1000 : NaN
      const ended = Number.isFinite(endsAtMs) ? nowMs >= endsAtMs : false
      const claimCount = orderId ? Number(claimCountByOrder.get(orderId) || 0) : 0
      const claimFree = claimCount === 0
      return {
        orderId,
        paidAt,
        endsAt: Number.isFinite(endsAtMs) ? new Date(endsAtMs).toISOString() : '',
        ended,
        claimCount,
        claimFree,
      }
    })

  let currentStreak = 0
  for (let i = cyclesAsc.length - 1; i >= 0; i -= 1) {
    const cycle = cyclesAsc[i]
    if (!cycle.ended) continue
    if (!cycle.claimFree) break
    currentStreak += 1
  }

  const latestEndedCycle = [...cyclesAsc].reverse().find((cycle) => cycle.ended) || null
  const eligible =
    Boolean(latestEndedCycle?.orderId) &&
    latestEndedCycle.claimFree &&
    latestEndedCycle.orderId !== usedSourceOrderId

  const selectedWeeklyPremium = Number(profile?.selectedPlan?.weeklyPremium || 0)
  const discountPercent = eligible ? NO_CLAIM_RENEWAL_DISCOUNT_PERCENT : 0
  const discountAmountPreview =
    selectedWeeklyPremium > 0
      ? roundMoney((selectedWeeklyPremium * discountPercent) / 100)
      : 0

  const recentCycles = [...cyclesAsc]
    .reverse()
    .slice(0, 6)
    .map((cycle) => ({
      orderId: cycle.orderId,
      paidAt: cycle.paidAt,
      endsAt: cycle.endsAt,
      claimCount: cycle.claimCount,
      claimFree: cycle.claimFree,
      ended: cycle.ended,
      status: cycle.ended ? (cycle.claimFree ? 'claim-free' : 'claimed') : 'active',
    }))

  return {
    discountPercent: NO_CLAIM_RENEWAL_DISCOUNT_PERCENT,
    eligible,
    eligibleSourceOrderId: eligible ? latestEndedCycle.orderId : '',
    nextDiscountAmountPreview: discountAmountPreview,
    claimFreeCycles: cyclesAsc.filter((c) => c.ended && c.claimFree).length,
    claimedCycles: cyclesAsc.filter((c) => c.ended && !c.claimFree).length,
    currentStreak,
    latestCycleStatus: latestEndedCycle
      ? latestEndedCycle.claimFree
        ? 'claim-free'
        : 'claimed'
      : 'none',
    totalDiscountUsed: roundMoney(rewards.totalDiscountUsed || 0),
    recentCycles,
  }
}

async function handleProfileUpdate(req, res) {
  try {
    const token = getSessionToken(req)
    const session = await Session.findOne({ token })
    if (!session) return res.status(401).json({ message: 'Unauthorized' })

    const user = await User.findById(session.userId)
    if (!user) return res.status(401).json({ message: 'Unauthorized' })

    const body = req.body || {}
    const profile = cloneProfilePlain(user)
    const prevCity = profile.city

    if (body.fullName !== undefined) {
      const v = String(body.fullName).trim()
      if (!v) return res.status(400).json({ message: 'Full name is required.' })
      user.name = v
      profile.fullName = v
    }

    if (body.email !== undefined) {
      const normalized = String(body.email).trim().toLowerCase()
      if (!normalized) return res.status(400).json({ message: 'Email is required.' })
      if (normalized !== user.email) {
        const taken = await User.findOne({ email: normalized, _id: { $ne: user._id } })
        if (taken) return res.status(409).json({ message: 'Email already in use.' })
        user.email = normalized
      }
    }

    if (body.phone !== undefined) {
      profile.phone = String(body.phone).trim()
    }

    if (body.city !== undefined) {
      const v = String(body.city).trim()
      if (!v) return res.status(400).json({ message: 'City is required.' })
      profile.city = v
    }

    if (body.workPlatform !== undefined) {
      const v = String(body.workPlatform).trim()
      if (!v) return res.status(400).json({ message: 'Work platform is required.' })
      profile.workPlatform = v
    }

    if (body.dailyIncome !== undefined) {
      const n = Number(body.dailyIncome)
      if (!Number.isFinite(n) || n <= 0) {
        return res.status(400).json({ message: 'Daily income must be a positive number.' })
      }
      profile.dailyIncome = n
    }

    const newCity = profile.city
    if (newCity && newCity !== prevCity) {
      delete profile.dynamicPricing
      try {
        profile.weather = await fetchWeatherByCity(newCity)
      } catch {
        delete profile.weather
      }
    }

    profile.updatedAt = new Date().toISOString()
    user.profile = normalizeProfileForSave(profile)
    user.markModified('profile')
    await user.save()

    return res.json({ user: sanitizeUser(user) })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Profile update failed:', error)
    const message = error?.message || 'Could not save profile.'
    return res.status(500).json({ message })
  }
}

app.patch('/api/profile', handleProfileUpdate)
app.post('/api/profile/update', handleProfileUpdate)

app.get('/api/claims/summary', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })
  const profile = cloneProfilePlain(user)
  return res.json(buildClaimsSummary(profile))
})

/** Testing helper: run claim flow with synthetic trigger + fraud check. */
app.post('/api/claims/simulate', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })

  const trigger = String(req.body?.trigger || 'severe_aqi').toLowerCase()
  const allowed = new Set(['severe_aqi', 'extreme_heat', 'heavy_rain', 'severe_wind'])
  if (!allowed.has(trigger)) {
    return res.status(400).json({
      message: 'Invalid trigger. Use: severe_aqi, extreme_heat, heavy_rain, severe_wind',
    })
  }

  const profileBefore = cloneProfilePlain(user)
  const enteredCity = String(profileBefore?.city || '').trim()
  const synthetic = buildSyntheticExtremeWeather(trigger)
  const currentLocation = {
    latitude: toFiniteNumber(req.body?.currentLocation?.latitude),
    longitude: toFiniteNumber(req.body?.currentLocation?.longitude),
  }

  const result = await applyAutoClaimFromWeather(user, synthetic, {
    degraded: false,
    bypassDailyLimit: true,
    simulation: true,
    fraudContext: {
      currentLocation,
      enteredLocation: String(req.body?.enteredLocation || enteredCity),
      manualReviewApprove: Boolean(req.body?.manualReviewApprove),
      forceFraudBlock: Boolean(req.body?.forceFraudBlock),
    },
  })

  if (!result) {
    return res.status(400).json({
      message:
        'No claim created. Requires active subscription (after payment), selected plan, daily income, and remaining coverage.',
    })
  }

  await user.save()
  return res.json({
    ...result,
    user: sanitizeUser(user),
  })
})

/** Testing helper: clear claim history + daily lock. */
app.post('/api/claims/reset', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })

  const profile = cloneProfilePlain(user)
  profile.claims = []
  delete profile.lastAutoClaimDayUtc
  profile.updatedAt = new Date().toISOString()
  user.profile = normalizeProfileForSave({ ...profile })
  user.markModified('profile')
  await user.save()

  return res.json({
    ok: true,
    user: sanitizeUser(user),
    summary: buildClaimsSummary(cloneProfilePlain(user)),
  })
})

app.get('/api/weather/current', async (req, res) => {
  try {
    const user = await getUserFromToken(req)
    if (!user) return res.status(401).json({ message: 'Unauthorized' })

    const city = user?.profile?.city || ''
    if (!city.trim()) {
      return res.status(400).json({ message: 'User city is missing. Please complete profile first.' })
    }

    const reqLat = Number(req.query?.lat)
    const reqLon = Number(req.query?.lon)
    const currentLocation =
      Number.isFinite(reqLat) && Number.isFinite(reqLon)
        ? { latitude: reqLat, longitude: reqLon }
        : null

    const cachedWeather = user?.profile?.weather || null
    const cachedAtMs = cachedWeather?.fetchedAt ? new Date(cachedWeather.fetchedAt).getTime() : NaN
    const isFreshCache =
      isUsableWeatherSnapshot(cachedWeather) &&
      cityStringsMatchForWeatherCache(city, cachedWeather.city) &&
      Number.isFinite(cachedAtMs) &&
      Date.now() - cachedAtMs >= 0 &&
      Date.now() - cachedAtMs < WEATHER_CACHE_TTL_MS
    if (isFreshCache) {
      const autoPayout = await applyAutoClaimFromWeather(user, cachedWeather, {
        degraded: false,
        fraudContext: { currentLocation },
      })
      if (autoPayout?.claim) await user.save()
      return res.json({ weather: cachedWeather, user: sanitizeUser(user), cached: true, autoPayout })
    }

    try {
      const weather = await fetchWeatherByCity(city)
      const profile = cloneProfilePlain(user)
      profile.weather = weather
      profile.updatedAt = new Date().toISOString()
      user.profile = normalizeProfileForSave(profile)
      user.markModified('profile')
      const autoPayout = await applyAutoClaimFromWeather(user, weather, {
        degraded: false,
        fraudContext: { currentLocation },
      })
      await user.save()
      return res.json({ weather, user: sanitizeUser(user), autoPayout })
    } catch {
      if (cachedWeather && cityStringsMatchForWeatherCache(city, cachedWeather.city)) {
        const fallbackWeather = {
          ...cachedWeather,
          hourlyForecast:
            Array.isArray(cachedWeather.hourlyForecast) && cachedWeather.hourlyForecast.length > 0
              ? cachedWeather.hourlyForecast
              : buildFallbackHourlyForecastFromCurrent(
                  Number(cachedWeather.temperatureC),
                  cachedWeather.condition || 'Cloudy',
                  0
                ),
        }
        return res.json({ weather: fallbackWeather, user: sanitizeUser(user), cached: true, degraded: true })
      }

      const fallbackWeather = {
        city,
        condition: 'Cloudy',
        description: 'Weather provider temporarily unavailable',
        temperatureC: 28,
        tempMinC: 27,
        tempMaxC: 29,
        humidity: 70,
        rainMm: 0,
        precipitationMm: 0,
        aqi: 90,
        pm10: null,
        pm2_5: null,
        windSpeed: 0,
        hourlyForecast: buildFallbackHourlyForecastFromCurrent(28, 'Cloudy', 0),
        icon: 'wmo-3',
        fetchedAt: new Date().toISOString(),
      }
      return res.json({ weather: fallbackWeather, user: sanitizeUser(user), cached: false, degraded: true })
    }
  } catch (error) {
    const message = error?.message || 'Weather service unavailable right now.'
    return res.status(500).json({ message })
  }
})

app.post('/api/profile/complete-initial-plan', async (req, res) => {
  const token = getSessionToken(req)
  const session = await Session.findOne({ token })
  if (!session) return res.status(401).json({ message: 'Unauthorized' })

  const user = await User.findById(session.userId)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })

  user.needsInitialPlanChoice = false
  await user.save()

  return res.json({ user: sanitizeUser(user) })
})

app.post('/api/disruptions/record', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })

  const severity = normalizeRiskLabel(req.body?.severity)
  const reason = String(req.body?.reason || '').trim() || 'manual-entry'
  const profile = cloneProfilePlain(user)
  const disruptions = Array.isArray(profile.disruptions) ? profile.disruptions : []
  disruptions.push({
    severity,
    reason,
    createdAt: new Date().toISOString(),
  })
  profile.disruptions = disruptions.slice(-50)
  profile.updatedAt = new Date().toISOString()
  user.profile = normalizeProfileForSave(profile)
  user.markModified('profile')
  await user.save()

  return res.json({ disruptions: profile.disruptions, user: sanitizeUser(user) })
})

app.post('/api/pricing/quote', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })

  const city = String(user?.profile?.city || '').trim()
  if (!city) {
    return res.status(400).json({ message: 'City missing in profile.' })
  }

  const profileBefore = cloneProfilePlain(user)
  const cachedPricing = profileBefore?.dynamicPricing || null
  const cachedAtMs = cachedPricing?.fetchedAt ? new Date(cachedPricing.fetchedAt).getTime() : NaN
  const isFreshPricing =
    cachedPricing &&
    Number.isFinite(cachedAtMs) &&
    Date.now() - cachedAtMs >= 0 &&
    Date.now() - cachedAtMs < PRICING_CACHE_TTL_MS
  if (isFreshPricing) {
    return res.json({
      pricing: cachedPricing,
      input: {
        rainfall: cachedPricing.rainfall,
        aqi: cachedPricing.aqi,
        area_risk: cachedPricing.areaRisk,
        past_disruptions: cachedPricing.pastDisruptions,
      },
      user: sanitizeUser(user),
      cached: true,
    })
  }

  try {
    const weather = await fetchWeatherByCity(city)
    const currentRainMm = Number(weather.rainMm ?? weather.precipitationMm ?? 0)
    const hourlyForecast = Array.isArray(weather.hourlyForecast) ? weather.hourlyForecast : []
    const nextRainPercent = hourlyForecast
      .slice(0, 3)
      .reduce((max, item) => Math.max(max, Number(item?.rainPercent) || 0), 0)
    const rainfall = Math.max(nextRainPercent, Math.round(currentRainMm * 20))
    const aqi = Number.isFinite(weather.aqi) ? weather.aqi : 120

    const profile = cloneProfilePlain(user)
    const disruptions = Array.isArray(profile.disruptions) ? profile.disruptions : []
    const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 90
    const pastDisruptions = disruptions.filter((entry) => {
      const time = new Date(entry?.createdAt || 0).getTime()
      const severe = String(entry?.severity || '').toLowerCase()
      return Number.isFinite(time) && time >= recentCutoff && severe !== 'low'
    }).length

    const areaRisk = getAreaRiskFromSignals(rainfall, aqi)
    const payload = {
      rainfall: Number(rainfall.toFixed(2)),
      aqi,
      area_risk: areaRisk,
      past_disruptions: pastDisruptions,
    }

    const modelResult = await requestModelPrice(payload)
    const weeklyPrice = modelResult
      ? modelResult.weeklyPrice
      : fallbackWeeklyPrice(areaRisk, pastDisruptions, aqi, rainfall)
    const riskScore = modelResult ? modelResult.riskScore : ['low', 'medium', 'high'][Math.min(2, areaRisk)]
    const recommendedPlan = pickRecommendedPlan(weeklyPrice)

    const dynamicPricing = {
      weeklyPrice,
      riskScore,
      areaRisk,
      rainfall: payload.rainfall,
      aqi,
      pastDisruptions,
      recommendedPlan,
      fetchedAt: new Date().toISOString(),
    }

    if (riskScore !== 'low') {
      const today = new Date().toISOString().slice(0, 10)
      const alreadyLoggedToday = disruptions.some((entry) => {
        const created = String(entry?.createdAt || '')
        return created.startsWith(today) && String(entry?.reason || '') === 'auto-risk-detection'
      })
      if (!alreadyLoggedToday) {
        disruptions.push({
          severity: riskScore,
          reason: 'auto-risk-detection',
          createdAt: new Date().toISOString(),
        })
      }
    }

    user.profile = normalizeProfileForSave({
      ...profile,
      weather,
      disruptions: disruptions.slice(-50),
      dynamicPricing,
      updatedAt: new Date().toISOString(),
    })
    user.markModified('profile')
    const autoPayout = await applyAutoClaimFromWeather(user, weather, { degraded: false })
    await user.save()

    return res.json({ pricing: dynamicPricing, input: payload, user: sanitizeUser(user), autoPayout })
  } catch (err) {
    // Avoid Express/HTML 500 pages in production; return JSON + heuristic pricing when weather/model/save fails.
    // eslint-disable-next-line no-console
    console.error('[pricing/quote]', err?.message || err)
    const profile = cloneProfilePlain(user)
    const disruptions = Array.isArray(profile.disruptions) ? profile.disruptions : []
    const recentCutoff = Date.now() - 1000 * 60 * 60 * 24 * 90
    const pastDisruptions = disruptions.filter((entry) => {
      const time = new Date(entry?.createdAt || 0).getTime()
      const severe = String(entry?.severity || '').toLowerCase()
      return Number.isFinite(time) && time >= recentCutoff && severe !== 'low'
    }).length

    const rainfall = 45
    const aqi = 130
    const areaRisk = getAreaRiskFromSignals(rainfall, aqi)
    const weeklyPrice = fallbackWeeklyPrice(areaRisk, pastDisruptions, aqi, rainfall)
    const riskScore = ['low', 'medium', 'high'][Math.min(2, areaRisk)]
    const recommendedPlan = pickRecommendedPlan(weeklyPrice)
    const dynamicPricing = {
      weeklyPrice,
      riskScore,
      areaRisk,
      rainfall,
      aqi,
      pastDisruptions,
      recommendedPlan,
      fetchedAt: new Date().toISOString(),
    }

    const payload = {
      rainfall,
      aqi,
      area_risk: areaRisk,
      past_disruptions: pastDisruptions,
    }

    try {
      user.profile = normalizeProfileForSave({
        ...profile,
        dynamicPricing,
        updatedAt: new Date().toISOString(),
      })
      user.markModified('profile')
      await user.save()
    } catch (saveErr) {
      // eslint-disable-next-line no-console
      console.error('[pricing/quote] degraded save', saveErr?.message || saveErr)
    }

    return res.json({
      pricing: dynamicPricing,
      input: payload,
      user: sanitizeUser(user),
      autoPayout: null,
      degraded: true,
    })
  }
})

app.get('/api/pricing/current', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })
  return res.json({
    pricing: user?.profile?.dynamicPricing || null,
    selectedPlan: user?.profile?.selectedPlan || null,
  })
})

app.post('/api/plans/select', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })

  const tier = String(req.body?.tier || '').trim().toLowerCase()
  const planMap = {
    basic: { title: 'Basic', coverageAmount: 1500, weeklyPremium: 20 },
    standard: { title: 'Standard', coverageAmount: 2500, weeklyPremium: 40 },
    premium: { title: 'Premium', coverageAmount: 4000, weeklyPremium: 70 },
  }
  const basePlan = planMap[tier]
  if (!basePlan) return res.status(400).json({ message: 'Invalid plan tier.' })

  const profile = cloneProfilePlain(user)
  const dynamicPricing = profile.dynamicPricing || null
  const selectedPlan = {
    tier,
    title: basePlan.title,
    coverageAmount: basePlan.coverageAmount,
    weeklyPremium: Number(dynamicPricing?.weeklyPrice ?? basePlan.weeklyPremium),
    isRecommended: dynamicPricing?.recommendedPlan === tier,
    selectedAt: new Date().toISOString(),
  }

  user.profile = normalizeProfileForSave({
    ...profile,
    selectedPlan,
    updatedAt: new Date().toISOString(),
  })
  user.markModified('profile')
  await user.save()
  return res.json({ selectedPlan, user: sanitizeUser(user) })
})

app.get('/api/subscription/status', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })
  const profile = cloneProfilePlain(user)
  const snapshot = getSubscriptionSnapshot(profile.subscription)
  if (profile.subscription) {
    profile.subscription = {
      ...(profile.subscription || {}),
      ...snapshot,
    }
    user.profile = normalizeProfileForSave(profile)
    user.markModified('profile')
    await user.save()
  }
  return res.json({
    subscription: snapshot,
    selectedPlan: profile.selectedPlan || null,
    dynamicPricing: profile.dynamicPricing || null,
  })
})

app.post('/api/payments/create-order', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })

  const profile = cloneProfilePlain(user)
  const selectedPlan = profile.selectedPlan
  if (!selectedPlan) {
    return res.status(400).json({ message: 'Please select a plan before payment.' })
  }

  const weeklyPremium = Number(selectedPlan.weeklyPremium || 0)
  if (!Number.isFinite(weeklyPremium) || weeklyPremium <= 0) {
    return res.status(400).json({ message: 'Invalid plan premium for payment.' })
  }

  const rewardSnapshot = getNoClaimRewardSnapshot(profile)
  const discountPercent = rewardSnapshot.eligible ? NO_CLAIM_RENEWAL_DISCOUNT_PERCENT : 0
  const discountAmount = roundMoney((weeklyPremium * discountPercent) / 100)
  const payablePremium = roundMoney(Math.max(1, weeklyPremium - discountAmount))

  const rzp = getRazorpayClient()
  if (!rzp) {
    return res.status(503).json({
      message:
        'Payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment (.env or host).',
    })
  }

  const amountPaise = Math.round(payablePremium * 100)
  const receipt = `paynest_${String(user._id).slice(-6)}_${Date.now()}`

  const order = await rzp.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt,
    notes: {
      userId: String(user._id),
      tier: String(selectedPlan.tier || ''),
      weeklyPremium: String(weeklyPremium),
      discountAmount: String(discountAmount),
      discountPercent: String(discountPercent),
      rewardSourceOrderId: rewardSnapshot.eligibleSourceOrderId || '',
    },
  })

  const paymentIntents = Array.isArray(profile.paymentIntents) ? profile.paymentIntents : []
  paymentIntents.push({
    razorpayOrderId: order.id,
    basePremium: weeklyPremium,
    finalPremium: payablePremium,
    discountAmount,
    discountPercent,
    rewardSourceOrderId: rewardSnapshot.eligibleSourceOrderId || '',
    createdAt: new Date().toISOString(),
  })
  profile.paymentIntents = paymentIntents.slice(-100)
  profile.updatedAt = new Date().toISOString()
  user.profile = normalizeProfileForSave(profile)
  user.markModified('profile')
  await user.save()

  return res.json({
    keyId: RAZORPAY_KEY_ID,
    order: {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    },
    selectedPlan,
    paymentSummary: {
      basePremium: weeklyPremium,
      discountAmount,
      discountPercent,
      payablePremium,
      rewardApplied: discountAmount > 0,
    },
    rewards: rewardSnapshot,
    user: {
      name: user.name,
      email: user.email,
      phone: profile.phone || '',
    },
  })
})

app.post('/api/payments/verify', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })

  const {
    razorpay_order_id: razorpayOrderId = '',
    razorpay_payment_id: razorpayPaymentId = '',
    razorpay_signature: razorpaySignature = '',
  } = req.body || {}

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ message: 'Missing Razorpay verification fields.' })
  }

  if (!RAZORPAY_KEY_SECRET) {
    return res.status(503).json({
      message: 'Payment verification is not configured. Set RAZORPAY_KEY_SECRET in your environment.',
    })
  }

  const digest = createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')
  const isValid =
    digest.length === String(razorpaySignature).length &&
    timingSafeEqual(Buffer.from(digest), Buffer.from(String(razorpaySignature)))

  if (!isValid) {
    return res.status(400).json({ message: 'Payment signature verification failed.' })
  }

  const profile = cloneProfilePlain(user)
  const selectedPlan = profile.selectedPlan || null
  const paymentIntents = Array.isArray(profile.paymentIntents) ? profile.paymentIntents : []
  const intentIdx = paymentIntents.findIndex(
    (it) => String(it?.razorpayOrderId || '') === String(razorpayOrderId)
  )
  const intent = intentIdx >= 0 ? paymentIntents[intentIdx] : null
  const basePremium = Number(intent?.basePremium ?? selectedPlan?.weeklyPremium ?? 0)
  const finalPremium = Number(intent?.finalPremium ?? selectedPlan?.weeklyPremium ?? 0)
  const discountAmount = roundMoney(intent?.discountAmount || 0)
  const discountPercent = Number(intent?.discountPercent || 0)
  const rewardSourceOrderId = String(intent?.rewardSourceOrderId || '')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const payments = Array.isArray(profile.payments) ? profile.payments : []
  payments.push({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    basePremium,
    discountAmount,
    discountPercent,
    rewardSourceOrderId,
    amount: finalPremium,
    currency: 'INR',
    status: 'captured',
    tier: String(selectedPlan?.tier || ''),
    weeklyPremium: finalPremium,
    paidAt: now.toISOString(),
  })

  if (intentIdx >= 0) {
    paymentIntents.splice(intentIdx, 1)
  }
  profile.paymentIntents = paymentIntents.slice(-100)

  const rewards = profile.rewards && typeof profile.rewards === 'object' ? profile.rewards : {}
  if (discountAmount > 0 && rewardSourceOrderId) {
    rewards.lastDiscountSourceOrderId = rewardSourceOrderId
    rewards.totalDiscountUsed = roundMoney(Number(rewards.totalDiscountUsed || 0) + discountAmount)
  }
  profile.rewards = rewards

  profile.payments = payments.slice(-100)
  profile.subscription = {
    status: 'active',
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    daysLeft: 7,
    lastPaymentId: razorpayPaymentId,
    lastOrderId: razorpayOrderId,
    amountPaid: finalPremium,
  }
  profile.updatedAt = now.toISOString()

  user.profile = normalizeProfileForSave(profile)
  user.markModified('profile')
  await user.save()

  return res.json({
    ok: true,
    subscription: getSubscriptionSnapshot(profile.subscription),
    user: sanitizeUser(user),
  })
})

app.get('/api/payments/statements', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })

  const profile = cloneProfilePlain(user)
  const paymentsRaw = Array.isArray(profile.payments) ? profile.payments : []
  const payments = [...paymentsRaw]
    .sort((a, b) => new Date(b?.paidAt || 0).getTime() - new Date(a?.paidAt || 0).getTime())
    .map((payment) => ({
      paymentId: payment?.razorpayPaymentId || '',
      orderId: payment?.razorpayOrderId || '',
      basePremium: Number(payment?.basePremium || payment?.weeklyPremium || payment?.amount || 0),
      discountAmount: Number(payment?.discountAmount || 0),
      discountPercent: Number(payment?.discountPercent || 0),
      amount: Number(payment?.amount || 0),
      currency: payment?.currency || 'INR',
      status: payment?.status || 'captured',
      tier: payment?.tier || '',
      weeklyPremium: Number(payment?.weeklyPremium || payment?.amount || 0),
      paidAt: payment?.paidAt || '',
    }))

  const subscriptionSnapshot = getSubscriptionSnapshot(profile.subscription)
  const latestPayment = payments[0] || null
  const nextDisbursementAt =
    subscriptionSnapshot.status === 'active' && subscriptionSnapshot.expiresAt
      ? subscriptionSnapshot.expiresAt
      : null

  return res.json({
    nextDisbursementAt,
    latestPayment,
    statements: payments,
  })
})

app.get('/api/rewards/status', async (req, res) => {
  const user = await getUserFromToken(req)
  if (!user) return res.status(401).json({ message: 'Unauthorized' })
  const profile = cloneProfilePlain(user)
  const rewards = getNoClaimRewardSnapshot(profile)
  return res.json({
    rewards,
    selectedPlan: profile.selectedPlan || null,
    subscription: getSubscriptionSnapshot(profile.subscription),
  })
})

app.post('/api/auth/logout', async (req, res) => {
  const token = getSessionToken(req)
  if (token) await Session.deleteOne({ token })
  return res.json({ ok: true })
})

async function startServer() {
  await mongoose.connect(MONGODB_URI)
  app.listen(PORT, () => {
    console.log(`Auth API running on http://localhost:${PORT}`)
    if (FRONTEND_ORIGINS.length > 0) {
      console.log(`CORS: allowing origins from FRONTEND_ORIGINS (${FRONTEND_ORIGINS.length} configured)`)
    } else {
      console.log('CORS: reflecting request Origin (set FRONTEND_ORIGINS for an explicit allowlist)')
    }
    console.log(
      `Fraud model: ${FRAUD_MODEL_PREDICT_URL} (score threshold >= ${FRAUD_BLOCK_SCORE_THRESHOLD.toFixed(2)})`
    )
    const tr = getClaimTriggerThresholds()
    console.log(
      `Auto-claim thresholds: rain>${tr.rainMm}mm AQI>${tr.aqi} temp>${tr.tempC}°C wind>=${tr.windKmh}km/h` +
        (claimTriggersHotReloadEnabled() ? ' (PAYNEST_TRIGGERS_RELOAD_ENV: .env re-read each check)' : '')
    )
  })
}

startServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
