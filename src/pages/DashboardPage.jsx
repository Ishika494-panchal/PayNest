import {
  FileText,
  Info,
  Shield,
  Sparkles,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardSidebar from '../components/DashboardSidebar'
import DashboardTopNav from '../components/DashboardTopNav'
import { getCurrentPricing, getCurrentWeather, getSubscriptionStatus } from '../lib/api'

function DashboardPage({ userName = '', user, onLogout, token, onUserRefresh }) {
  const navigate = useNavigate()
  const weather = user?.profile?.weather || null
  const [pricing, setPricing] = useState(user?.profile?.dynamicPricing || null)
  const [subscription, setSubscription] = useState(null)
  const [autoPayoutBanner, setAutoPayoutBanner] = useState(null)
  const cityName = weather?.city || user?.profile?.city || 'your city'
  const weatherLine = weather
    ? `${weather.condition} ${Math.round(weather.temperatureC || 0)}°C in ${cityName}`
    : 'No forecast data'
  const riskLabel = pricing?.riskScore ? String(pricing.riskScore).toUpperCase() : 'N/A'
  const safetyIndex = pricing?.riskScore === 'low' ? 86 : pricing?.riskScore === 'medium' ? 61 : 34
  const monthlyPremium = Number((Number(pricing?.weeklyPrice || 0) * 4).toFixed(2))

  useEffect(() => {
    let mounted = true
    const hydrate = async () => {
      if (!token) return
      try {
        const [pricingResult, subscriptionResult] = await Promise.all([
          getCurrentPricing(token),
          getSubscriptionStatus(token),
        ])
        if (mounted) {
          setPricing(pricingResult.pricing || null)
          setSubscription(subscriptionResult.subscription || null)
        }
        getCurrentWeather(token)
          .then((weatherResult) => {
            if (!mounted) return
            if (weatherResult?.user && typeof onUserRefresh === 'function') {
              onUserRefresh(weatherResult.user)
            }
            if (weatherResult?.autoPayout?.ok) {
              setAutoPayoutBanner({
                headline: weatherResult.autoPayout.headline,
                creditLine: weatherResult.autoPayout.creditLine,
                triggerLabel: weatherResult.autoPayout.triggerLabel,
                payoutId: weatherResult.autoPayout.razorpayPayoutId,
              })
            }
          })
          .catch(() => {
            /* cached profile weather still shown */
          })
      } catch {
        /* keep fallback */
      }
    }
    hydrate()
    return () => {
      mounted = false
    }
  }, [token, onUserRefresh])

  return (
    <div className="min-h-screen bg-[#f5f3ee] text-[#2e3643]">
      <DashboardTopNav userName={userName} onLogout={onLogout} />
      <div className="flex min-h-[calc(100vh-72px)]">
        <DashboardSidebar onLogout={onLogout} />

        <div className="flex flex-1 flex-col">

          <main className="px-5 pb-8 pt-5 sm:px-8">
            {autoPayoutBanner ? (
              <div
                role="status"
                className="mb-5 rounded-2xl border border-[#c9a227] bg-[#fdf6dd] px-4 py-3 text-[#3a3318] shadow-[0_6px_20px_rgba(201,162,39,0.2)]"
              >
                <p className="text-[15px] font-semibold">{autoPayoutBanner.headline}</p>
                <p className="mt-1 text-[17px] font-bold text-[#2a6b3c]">{autoPayoutBanner.creditLine}</p>
                <p className="mt-1 text-[13px] text-[#5c5644]">{autoPayoutBanner.triggerLabel}</p>
                {autoPayoutBanner.payoutId ? (
                  <p className="mt-1 font-mono text-[11px] text-[#6d6a5c]">
                    Razorpay ref: {autoPayoutBanner.payoutId}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => setAutoPayoutBanner(null)}
                  className="mt-2 text-[12px] font-semibold text-[#5f7088] underline"
                >
                  Dismiss
                </button>
              </div>
            ) : null}
            <section>
              <p className="text-[40px] font-semibold leading-none lg:text-[44px]">Risk Analysis</p>
              <p className="mt-2 max-w-[560px] text-[15px] leading-[1.45] text-[#59616d] lg:text-[16px]">
                This section will show live risk metrics once backend analytics data
                is connected.
              </p>
            </section>

            <section className="mt-5 grid gap-3 lg:gap-4 2xl:grid-cols-[1.02fr_1fr_1.18fr]">
              <article className="rounded-3xl border border-[#e9e4da] bg-[#f8f6f1] p-5 lg:p-6">
                <p className="text-[30px] font-semibold leading-none lg:text-[32px]">Safety Index</p>
                <div className="mx-auto mt-6 grid h-[210px] w-[210px] place-items-center rounded-full border-[10px] border-[#9c8b2e] lg:h-[230px] lg:w-[230px]">
                  <div className="text-center">
                    <p className="text-[54px] font-semibold leading-none lg:text-[56px]">{safetyIndex}</p>
                    <p className="mt-1.5 text-[16px] font-semibold tracking-[0.06em] text-[#6f7682]">
                      {riskLabel}
                    </p>
                  </div>
                </div>
                <p className="mt-6 text-[20px] font-medium lg:text-[22px]">Current risk: {riskLabel}</p>
                <p className="mt-2 text-[16px] leading-[1.45] text-[#636b78] lg:text-[17px]">
                  Live index is derived from latest AQI, rainfall forecast, and disruption history.
                </p>
              </article>

              <div className="space-y-3 lg:space-y-4">
                <article className="rounded-3xl border border-[#e6e3dc] bg-white p-5 lg:p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[46px] font-semibold leading-[0.95] lg:text-[50px]">Expected Weekly</p>
                      <p className="mt-2 text-[16px] text-[#6d7480] lg:text-[17px]">{weatherLine}</p>
                    </div>
                    <span className="rounded-full bg-[#dbe6f8] px-3 py-1 text-[12px] font-semibold text-[#3f4a59]">
                      AI LIVE
                    </span>
                  </div>
                  <p className="mt-4 text-[58px] font-semibold leading-none lg:text-[62px]">
                    ₹{Number(pricing?.weeklyPrice || 0)}
                    <span className="ml-2 text-[26px] text-[#897821]">{riskLabel}</span>
                  </p>
                  <div className="mt-6 flex h-[100px] items-end gap-2 lg:h-[110px]">
                    <div className="h-[40%] w-5 rounded-t bg-[#efede7] lg:w-6" />
                    <div className="h-[54%] w-5 rounded-t bg-[#e5e2da] lg:w-6" />
                    <div className="h-[75%] w-5 rounded-t bg-[#5e6f88] lg:w-6" />
                    <div className="h-[48%] w-5 rounded-t bg-[#ece9e2] lg:w-6" />
                    <div className="h-[33%] w-5 rounded-t bg-[#efede7] lg:w-6" />
                  </div>
                </article>

                <article className="rounded-3xl border border-[#ece4cc] bg-[#f5ecd4] p-5 lg:p-6">
                  <p className="text-[42px] font-semibold leading-none lg:text-[46px]">Volatility Shield</p>
                  <p className="mt-2 text-[15px] leading-[1.45] text-[#686f7a] lg:text-[16px]">
                    {subscription?.status === 'active'
                      ? `Active subscription, ${subscription.daysLeft} day(s) left.`
                      : subscription?.status === 'expired'
                        ? 'Your 7-day subscription has expired. Renew plan from Protection tab.'
                        : 'No active subscription. Select a plan from Protection tab.'}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-[#b29926] text-white">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[18px] font-semibold">Protection Status</p>
                      <p className="text-[14px] text-[#7a808a]">
                        {weather ? `${weather.description || weather.condition} in ${cityName}` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </article>
              </div>

              <div className="space-y-3 lg:space-y-4">
                <article className="rounded-3xl bg-[#6f819b] p-5 text-white lg:p-6">
                  <Sparkles className="h-6 w-6 text-[#f2d75d]" />
                  <p className="mt-4 text-[52px] font-semibold leading-[0.95] lg:text-[56px]">Suggested Coverage</p>
                  <p className="mt-3 text-[16px] leading-[1.45] text-[#e8edf5] lg:text-[17px]">
                    Recommendation updates every time you open plan selection with latest forecast.
                  </p>
                  <p className="mt-5 text-[58px] font-semibold leading-none lg:text-[62px]">
                    ₹{Number(pricing?.weeklyPrice || 0)} <span className="text-[26px] font-normal">/week</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/plan-selection')}
                    className="mt-4 h-11 w-full rounded-xl bg-[#caa91f] text-[15px] font-semibold text-[#29313d]"
                  >
                    View Plans
                  </button>
                </article>

                <article className="rounded-3xl border border-[#e6e1d7] bg-[#f6f3ec] p-5 lg:p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-[44px] font-semibold leading-none lg:text-[48px]">Premium Estimate</p>
                    <Info className="h-5 w-5 text-[#646c78]" />
                  </div>
                  <div className="mt-4 space-y-3 text-[17px] lg:text-[18px]">
                    <div className="flex items-center justify-between">
                      <p className="text-[#626a77]">Base Rate</p>
                      <p className="font-semibold">₹{Number(pricing?.weeklyPrice || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[#626a77]">Risk Adjustment</p>
                      <p className="font-semibold text-[#5f6f89]">
                        {pricing?.riskScore === 'high' ? '+20%' : pricing?.riskScore === 'medium' ? '+10%' : '+0%'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#e5dfd3] pt-3">
                      <p className="text-[22px] font-semibold lg:text-[24px]">Monthly Premium</p>
                      <p className="text-[38px] font-semibold text-[#8b7421] lg:text-[42px]">
                        ₹{monthlyPremium.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <section className="mt-3 grid gap-3 lg:gap-4 lg:grid-cols-2">
              <article className="rounded-3xl border border-[#e7e3dc] bg-[#f7f5f0] p-5 lg:p-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eceff3] text-[#4d5768]">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[24px] font-semibold lg:text-[26px]">AI Intelligence Layer</p>
                    <p className="mt-1 text-[15px] leading-[1.45] text-[#646d79] lg:text-[16px]">
                      No intelligence signals available yet.
                    </p>
                  </div>
                </div>
              </article>
              <article className="rounded-3xl border border-[#e7e3dc] bg-[#f7f5f0] p-5 lg:p-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f1ecd8] text-[#5c636f]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[24px] font-semibold lg:text-[26px]">Historical Correlation</p>
                    <p className="mt-1 text-[15px] leading-[1.45] text-[#646d79] lg:text-[16px]">
                      Historical comparisons will appear when backend data is connected.
                    </p>
                  </div>
                </div>
              </article>
            </section>
          </main>

          <footer className="mt-auto border-t border-[#ebe8e2] px-5 py-5 sm:px-8">
            <div className="flex flex-col gap-4 text-[13px] text-[#676e79] xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-6">
                <p className="text-[28px] font-semibold text-[#3f4652]">PayNest AI</p>
                <a href="#" className="hover:text-[#2f3640]">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-[#2f3640]">
                  Terms of Service
                </a>
                <a href="#" className="hover:text-[#2f3640]">
                  Risk Disclosure
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

export default DashboardPage
