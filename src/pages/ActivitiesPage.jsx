import { CloudSun, MapPin, Shield, WalletCards, Wind } from 'lucide-react'
import { useEffect, useState } from 'react'
import CurrentLocationMap from '../components/CurrentLocationMap'
import DashboardTopNav from '../components/DashboardTopNav'
import DashboardSidebar from '../components/DashboardSidebar'
import {
  getCurrentPricing,
  getCurrentWeather,
  getPaymentStatements,
  getSubscriptionStatus,
} from '../lib/api'

function readBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
    )
  })
}

function ActivitiesPage({ userName = '', user, token, onLogout, onUserRefresh }) {
  const [weather, setWeather] = useState(user?.profile?.weather || null)
  const [pricing, setPricing] = useState(user?.profile?.dynamicPricing || null)
  const [subscription, setSubscription] = useState(user?.profile?.subscription || null)
  const [weatherError, setWeatherError] = useState('')
  const [nextDisbursementAt, setNextDisbursementAt] = useState(null)
  const [statements, setStatements] = useState([])
  const [showStatements, setShowStatements] = useState(false)
  const [statementLoading, setStatementLoading] = useState(false)
  const [statementError, setStatementError] = useState('')

  useEffect(() => {
    let isMounted = true
    const hydrateWeather = async () => {
      if (!token) return
      try {
        const [pricingResult, subscriptionResult, statementResult] = await Promise.all([
          getCurrentPricing(token),
          getSubscriptionStatus(token),
          getPaymentStatements(token),
        ])
        if (isMounted) {
          setPricing(pricingResult.pricing || null)
          setSubscription(subscriptionResult.subscription || null)
          setNextDisbursementAt(statementResult.nextDisbursementAt || null)
          setWeatherError('')
        }
        const browserLocation = await readBrowserLocation()
        getCurrentWeather(token, browserLocation)
          .then((weatherResult) => {
            if (!isMounted) return
            setWeather(weatherResult.weather || null)
            setWeatherError('')
            if (weatherResult?.user && typeof onUserRefresh === 'function') {
              onUserRefresh(weatherResult.user)
            }
          })
          .catch((error) => {
            if (isMounted) setWeatherError(error.message || 'Weather unavailable')
          })
      } catch (error) {
        if (isMounted) setWeatherError(error.message || 'Could not load activity data.')
      }
    }

    // Keep initial cached weather visible; refresh in background.
    setTimeout(hydrateWeather, 0)
    return () => {
      isMounted = false
    }
  }, [token, onUserRefresh])

  const weatherStatus = weather?.condition || 'N/A'
  const weatherTemp = Number.isFinite(weather?.temperatureC) ? Math.round(weather.temperatureC) : null
  const weatherHigh = Number.isFinite(weather?.tempMaxC) ? Math.round(weather.tempMaxC) : null
  const weatherLow = Number.isFinite(weather?.tempMinC) ? Math.round(weather.tempMinC) : null
  const weatherDescription = weather?.description
    ? weather.description.charAt(0).toUpperCase() + weather.description.slice(1)
    : 'Weather data not available.'
  const humidity = Number.isFinite(weather?.humidity) ? weather.humidity : null
  const aqi = Number.isFinite(weather?.aqi) ? weather.aqi : null
  const pm10 = Number.isFinite(weather?.pm10) ? weather.pm10 : null
  const pm25 = Number.isFinite(weather?.pm2_5) ? weather.pm2_5 : null
  const cityName = weather?.city || user?.profile?.city || 'your city'
  const hourlyForecast = Array.isArray(weather?.hourlyForecast) ? weather.hourlyForecast : []
  const remainingCoverage = Number(pricing?.weeklyPrice || 0)
  const daysLeft = Number(subscription?.daysLeft || 0)
  const renewalDate = subscription?.expiresAt
    ? new Date(subscription.expiresAt).toLocaleDateString()
    : 'N/A'
  const currentRiskLevel = pricing?.riskScore
    ? pricing.riskScore.charAt(0).toUpperCase() + pricing.riskScore.slice(1)
    : 'N/A'
  const nextDisbursementLabel = nextDisbursementAt
    ? new Date(nextDisbursementAt).toLocaleString()
    : 'No schedule available'

  const formatHour = (iso) => {
    if (!iso) return '--:--'
    const dt = new Date(iso)
    if (Number.isNaN(dt.getTime())) return '--:--'
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleViewStatements = async () => {
    setShowStatements(true)
    setStatementLoading(true)
    setStatementError('')
    try {
      const result = await getPaymentStatements(token)
      setStatements(Array.isArray(result.statements) ? result.statements : [])
      setNextDisbursementAt(result.nextDisbursementAt || null)
    } catch (error) {
      setStatementError(error.message || 'Unable to load statements.')
    } finally {
      setStatementLoading(false)
    }
  }

  const handleDownloadStatements = () => {
    if (!statements.length) return
    const header = ['Date', 'Payment ID', 'Order ID', 'Tier', 'Amount', 'Currency', 'Status']
    const rows = statements.map((s) => [
      s.paidAt ? new Date(s.paidAt).toLocaleString() : '',
      s.paymentId || '',
      s.orderId || '',
      s.tier || '',
      String(Number(s.amount || 0).toFixed(2)),
      s.currency || 'INR',
      s.status || '',
    ])
    const csv = [header, ...rows].map((line) => line.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `paynest-statements-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const airQualityLabel =
    aqi === null ? 'N/A' : aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy' : 'Poor'

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f3ee] text-[#2b3340]">
      <DashboardTopNav userName={userName} onLogout={onLogout} />
      <div className="flex min-h-[calc(100vh-72px)]">
        <DashboardSidebar onLogout={onLogout} />

        <div className="flex min-w-0 flex-1 flex-col">

          <main className="px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8">
            <section className="grid gap-5 xl:grid-cols-[1.9fr_0.9fr]">
              <article className="rounded-[26px] border border-[#ebe7de] bg-[#f7f5f0] p-4 sm:rounded-[30px] sm:p-6">
                <span className="rounded-full bg-[#dbe6f8] px-3 py-1 text-[12px] font-semibold text-[#425066]">
                  Protected
                </span>
                <h1 className="mt-4 text-[36px] font-semibold leading-[0.95] sm:text-[46px] lg:text-[55px]">
                  Active Coverage Overview
                </h1>
                <p className="mt-3 max-w-[720px] text-[14px] leading-[1.45] text-[#626a77] sm:text-[16px]">
                  Live activity metrics will be shown here once backend integration is complete.
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <article className="rounded-2xl bg-white p-4">
                    <p className="text-[12px] uppercase tracking-[0.1em] text-[#7d8591]">Remaining Coverage</p>
                    <p className="mt-2 text-[34px] font-semibold leading-none sm:text-[44px]">
                      ₹{remainingCoverage.toFixed(2)}
                    </p>
                    <div className="mt-4 h-1.5 rounded-full bg-[#e7e5e0]" />
                  </article>
                  <article className="rounded-2xl bg-white p-4">
                    <p className="text-[12px] uppercase tracking-[0.1em] text-[#7d8591]">Days Left</p>
                    <p className="mt-2 text-[32px] font-semibold leading-none sm:text-[42px]">{daysLeft} Days</p>
                    <p className="mt-2 text-[14px] text-[#8d7d2a]">Renewal date {renewalDate}</p>
                  </article>
                  <article className="rounded-2xl bg-white p-4">
                    <p className="text-[12px] uppercase tracking-[0.1em] text-[#7d8591]">Current Risk Level</p>
                    <p className="mt-2 inline-flex items-center gap-2 text-[30px] font-semibold leading-none sm:text-[42px]">
                      <Shield className="h-7 w-7 text-[#b79f2b]" />
                      {currentRiskLevel}
                    </p>
                    <p className="mt-2 text-[14px] text-[#6e7682]">
                      {subscription?.status === 'active'
                        ? 'Subscription active'
                        : subscription?.status === 'expired'
                          ? 'Subscription expired'
                          : 'No active subscription'}
                    </p>
                  </article>
                </div>
              </article>

              <article className="rounded-[26px] bg-[#6f819b] p-4 text-white sm:rounded-[30px] sm:p-6">
                <h2 className="text-[30px] font-semibold leading-none sm:text-[38px]">Resilience Score</h2>
                <p className="mt-3 text-[14px] leading-[1.45] text-[#e8edf5] sm:text-[15px]">
                  Score will update when backend metrics are available.
                </p>
                <div className="mx-auto mt-8 grid h-[150px] w-[150px] place-items-center rounded-full border-[10px] border-[#e1bf34] sm:h-[170px] sm:w-[170px]">
                  <div className="text-center">
                    <p className="text-[48px] font-semibold leading-none sm:text-[56px]">0</p>
                    <p className="text-[14px]">N/A</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-7 h-12 w-full rounded-xl bg-[#caa91f] text-[16px] font-semibold text-[#2f3542]"
                >
                  Get Protected
                </button>
              </article>
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-3">
              <article className="rounded-3xl border border-[#e8e3da] bg-[#f7f5f0] p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#7f8691]">
                      Weather Status
                    </p>
                    <p className="mt-1 text-[30px] font-semibold leading-none sm:text-[40px]">{weatherStatus}</p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f4d978] text-[#2f3542]">
                    <CloudSun className="h-5 w-5" />
                  </div>
                </div>
                {weatherTemp === null ? (
                  <p className="mt-6 text-[42px] font-semibold leading-none sm:text-[56px]">
                    0°C <span className="text-[18px] font-normal sm:text-[22px]">H 0° L: 0°</span>
                  </p>
                ) : (
                  <p className="mt-6 text-[42px] font-semibold leading-none sm:text-[56px]">
                    {weatherTemp}°C{' '}
                    <span className="text-[18px] font-normal sm:text-[22px]">
                      H {weatherHigh ?? weatherTemp}° L: {weatherLow ?? weatherTemp}°
                    </span>
                  </p>
                )}
                {weather?.description || weatherTemp !== null ? (
                  <p className="mt-4 text-[15px] leading-[1.45] text-[#646d7a]">
                    {weather?.description
                      ? `${weatherDescription} in ${cityName}.`
                      : `Live conditions in ${cityName}.`}
                  </p>
                ) : null}
                {weatherError ? <p className="mt-2 text-[12px] text-[#9a4343]">{weatherError}</p> : null}
              </article>

              <article className="rounded-3xl border border-[#e8e3da] bg-[#f7f5f0] p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#7f8691]">
                      Air Quality
                    </p>
                    <p className="mt-1 text-[30px] font-semibold leading-none sm:text-[40px]">{airQualityLabel}</p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#dbe6f8] text-[#4a576d]">
                    <Wind className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-6 text-[42px] font-semibold leading-none sm:text-[56px]">
                  {aqi ?? 0}{' '}
                  <span className="text-[18px] font-semibold text-[#23a26f] sm:text-[22px]">AQI</span>
                </p>
                <div className="mt-4 h-1.5 rounded-full bg-[#e6e4de]" />
                {aqi !== null || humidity !== null ? (
                  <p className="mt-4 text-[15px] leading-[1.45] text-[#646d7a]">
                    {aqi !== null
                      ? `Live AQI in ${cityName}${pm10 !== null || pm25 !== null ? ` | PM10: ${pm10 ?? '--'} | PM2.5: ${pm25 ?? '--'}` : ''}.`
                      : `Humidity ${Math.round(humidity)}% in ${cityName}.`}
                  </p>
                ) : null}
              </article>

              <article className="rounded-3xl border border-[#e8e3da] bg-[#f7f5f0] p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#7f8691]">
                      Current location
                    </p>
                    <p className="mt-1 text-[30px] font-semibold leading-none sm:text-[40px]">Live map</p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#d8b52f] text-white">
                    <MapPin className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-6 text-[13px] leading-[1.45] text-[#646d7a]">
                  Allow location access when prompted to center the map on you.
                </p>
                <div className="mt-4">
                  <CurrentLocationMap />
                </div>
              </article>
            </section>

            <section className="mt-5 rounded-3xl border border-[#e8e3da] bg-[#f0ede7] px-4 py-4 sm:px-6 sm:py-5">
              <div className="mb-5 rounded-2xl border border-[#e6e1d7] bg-[#f8f5ef] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[18px] font-semibold text-[#313846]">Weather Forecast</p>
                  <p className="text-[12px] text-[#6a7280]">{cityName}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left">
                    <thead>
                      <tr className="border-b border-[#e5dfd2] text-[12px] uppercase tracking-[0.08em] text-[#7d8591]">
                        <th className="px-2 py-2 font-semibold">Time</th>
                        <th className="px-2 py-2 font-semibold">Condition</th>
                        <th className="px-2 py-2 font-semibold">Temp</th>
                        <th className="px-2 py-2 font-semibold">Rain %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hourlyForecast.length ? (
                        hourlyForecast.map((item) => (
                          <tr key={item.time} className="border-b border-[#eee8dc] text-[13px] text-[#47505f]">
                            <td className="px-2 py-2">{formatHour(item.time)}</td>
                            <td className="px-2 py-2">{item.condition || 'N/A'}</td>
                            <td className="px-2 py-2">
                              {Number.isFinite(item.temperatureC) ? `${Math.round(item.temperatureC)}°C` : '--'}
                            </td>
                            <td className="px-2 py-2 font-semibold text-[#5f7088]">
                              {Number.isFinite(item.rainPercent) ? `${item.rainPercent}%` : '0%'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-2 py-3 text-[13px] text-[#6f7682]" colSpan={4}>
                            Forecast data is not available right now.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#606977]">
                    <WalletCards className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[26px] font-semibold leading-none sm:text-[34px]">Next Disbursement</p>
                    <p className="mt-1 break-words text-[14px] text-[#666f7c] sm:text-[15px]">{nextDisbursementLabel}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleViewStatements}
                    className="h-11 rounded-xl bg-white px-6 text-[15px] font-semibold text-[#3e4654]"
                  >
                    View Statements
                  </button>
                </div>
              </div>
              {showStatements ? (
                <div className="mt-4 rounded-2xl border border-[#dfd8ca] bg-[#faf8f3] p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[16px] font-semibold text-[#384151]">Current Statements</p>
                    <button
                      type="button"
                      onClick={handleDownloadStatements}
                      disabled={!statements.length}
                      className="rounded-lg border border-[#d0d7e2] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#4a566a] disabled:opacity-50"
                    >
                      Download CSV
                    </button>
                  </div>
                  {statementLoading ? (
                    <p className="text-[13px] text-[#5f6774]">Loading statements...</p>
                  ) : statementError ? (
                    <p className="text-[13px] text-[#b24646]">{statementError}</p>
                  ) : statements.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[680px] text-left text-[13px]">
                        <thead>
                          <tr className="border-b border-[#e6dfd3] text-[#6f7784]">
                            <th className="px-2 py-2 font-semibold">Date</th>
                            <th className="px-2 py-2 font-semibold">Plan</th>
                            <th className="px-2 py-2 font-semibold">Amount</th>
                            <th className="px-2 py-2 font-semibold">Payment ID</th>
                            <th className="px-2 py-2 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statements.map((s) => (
                            <tr key={s.paymentId || s.orderId} className="border-b border-[#eee8dc] text-[#465062]">
                              <td className="px-2 py-2">{s.paidAt ? new Date(s.paidAt).toLocaleString() : '-'}</td>
                              <td className="px-2 py-2 capitalize">{s.tier || '-'}</td>
                              <td className="px-2 py-2">₹{Number(s.amount || 0).toFixed(2)}</td>
                              <td className="px-2 py-2">{s.paymentId || '-'}</td>
                              <td className="px-2 py-2 capitalize">{s.status || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-[13px] text-[#5f6774]">No statements found yet.</p>
                  )}
                </div>
              ) : null}
            </section>
          </main>

          <footer className="border-t border-[#ebe8e2]">
            <div className="flex flex-col gap-4 px-4 py-5 text-[12px] text-[#676e79] md:flex-row md:items-center md:justify-between sm:px-6 lg:px-8">
              <div className="flex flex-wrap gap-4 sm:gap-6">
                <p className="font-semibold text-[#444c59]">PayNest AI</p>
                <a href="#" className="hover:text-[#2f3640]">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-[#2f3640]">
                  Terms of Service
                </a>
                <a href="#" className="hover:text-[#2f3640]">
                  Contact
                </a>
              </div>
              <p>© 2024 PayNest AI. Financial Security for the Modern Workforce.</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default ActivitiesPage
