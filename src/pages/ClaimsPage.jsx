import { Check, CloudRain, ShieldAlert, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import DashboardSidebar from '../components/DashboardSidebar'
import DashboardTopNav from '../components/DashboardTopNav'
import { getClaimsSummary, getCurrentWeather, resetClaimsForTesting } from '../lib/api'

function ClaimsPage({ userName, user, onLogout, token, onUserRefresh }) {
  const [summary, setSummary] = useState(null)
  const [autoPayoutBanner, setAutoPayoutBanner] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [liveWeatherSync, setLiveWeatherSync] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [resetBusy, setResetBusy] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!token) {
        setSummaryLoading(false)
        return
      }
      setSummaryLoading(true)
      try {
        const summaryResult = await getClaimsSummary(token)
        if (!mounted) return
        setSummary(summaryResult)
        setLoadError('')
      } catch (err) {
        if (mounted) setLoadError(err?.message || 'Could not load claims.')
        if (mounted) setSummaryLoading(false)
        return
      }

      if (mounted) setSummaryLoading(false)
      setLiveWeatherSync(true)
      getCurrentWeather(token)
        .then(async (weatherResult) => {
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
            try {
              const refreshed = await getClaimsSummary(token)
              if (mounted) setSummary(refreshed)
            } catch {
              /* keep prior summary */
            }
          }
        })
        .catch(() => {
          /* weather is optional for this screen */
        })
        .finally(() => {
          if (mounted) setLiveWeatherSync(false)
        })
    }
    load()
    return () => {
      mounted = false
    }
  }, [token, onUserRefresh])

  const planTitle = summary?.selectedPlan?.title || 'No plan selected'
  const claims = Array.isArray(summary?.claims) ? summary.claims : []
  const hasClaims = claims.length > 0
  const ti = summary?.triggersInfo

  const runClaimReset = async () => {
    if (!token) return
    setResetBusy(true)
    setResetMsg('')
    try {
      const r = await resetClaimsForTesting(token)
      if (r?.user && typeof onUserRefresh === 'function') {
        onUserRefresh(r.user)
      }
      if (r?.summary) setSummary(r.summary)
      setAutoPayoutBanner(null)
      setResetMsg('Claim history cleared. Full plan coverage is available again for testing.')
    } catch (err) {
      setResetMsg(err?.message || 'Reset failed (enable PAYNEST_CLAIM_SIMULATOR on the server).')
    } finally {
      setResetBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f3ee]">
      <DashboardTopNav userName={userName} onLogout={onLogout} />
      <div className="flex min-h-[calc(100vh-72px)]">
        <DashboardSidebar onLogout={onLogout} />

        <div className="flex flex-1 flex-col">
          <main className="flex justify-center px-6 pb-12 pt-10 lg:px-8">
            <section className="w-full max-w-[640px] space-y-5">
              {autoPayoutBanner ? (
                <div
                  role="status"
                  className="rounded-2xl border border-[#c9a227] bg-[#fdf6dd] px-5 py-4 text-[#3a3318] shadow-[0_8px_24px_rgba(201,162,39,0.18)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#c5a51f] text-[#1f232b]">
                      <Zap className="h-5 w-5" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold">{autoPayoutBanner.headline}</p>
                      <p className="mt-1 text-[18px] font-bold text-[#2a6b3c]">
                        {autoPayoutBanner.creditLine}
                      </p>
                      <p className="mt-1 text-[13px] text-[#5c5644]">{autoPayoutBanner.triggerLabel}</p>
                      {autoPayoutBanner.payoutId ? (
                        <p className="mt-2 font-mono text-[11px] text-[#6d6a5c]">
                          Razorpay (test): {autoPayoutBanner.payoutId}
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
                  </div>
                </div>
              ) : null}

              {loadError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
                  {loadError}
                </p>
              ) : null}

              {summaryLoading && !loadError ? (
                <p className="text-center text-[13px] text-[#8d949f]">Loading coverage…</p>
              ) : null}

              {liveWeatherSync ? (
                <p className="text-center text-[12px] text-[#8d949f]">
                  Checking live weather for auto-claims…
                </p>
              ) : null}

              <div className="rounded-[28px] border border-[#ece8df] bg-[#f7f5f0] p-7 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
                <div className="flex justify-center">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-[#c5a51f] text-[#1f232b]">
                    <Check className="h-7 w-7" strokeWidth={2.8} />
                  </div>
                </div>

                <div className="mt-5 flex justify-center">
                  <CloudRain className="h-16 w-16 text-[#d6d3cb]" strokeWidth={1.6} />
                </div>

                <p className="mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8d949f]">
                  Auto protection — zero touch
                </p>
                <h1 className="mt-4 text-center text-[40px] font-semibold leading-[0.95] text-[#1f252f] sm:text-[46px]">
                  {summaryLoading && !loadError
                    ? 'Loading…'
                    : hasClaims
                      ? 'Claims & coverage'
                      : 'No claims yet'}
                </h1>
                <p className="mx-auto mt-3 max-w-[420px] text-center text-[15px] leading-[1.45] text-[#67707d]">
                  Extreme weather (heavy rain, severe AQI, extreme heat, or severe wind) triggers an automatic
                  payout when your subscription is active. No action required.
                </p>
                {user?.name ? (
                  <p className="mt-2 text-center text-[12px] text-[#9aa0a8]">Account: {user.name}</p>
                ) : null}

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <article className="rounded-xl border-l-2 border-[#c7a725] bg-[#f2f4f6] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[#808892]">
                      Plan
                    </p>
                    <p className="mt-1 text-[14px] font-semibold text-[#2d3440]">{planTitle}</p>
                  </article>
                  <article className="rounded-xl border-l-2 border-[#414954] bg-[#f2f4f6] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[#808892]">
                      Per disruption (est.)
                    </p>
                    <p className="mt-1 text-[14px] font-semibold text-[#2d3440]">
                      ₹{Number(summary?.perClaimAmount || 0)}
                    </p>
                  </article>
                  <article className="rounded-xl border-l-2 border-[#5f7088] bg-[#f2f4f6] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[#808892]">
                      Coverage remaining
                    </p>
                    <p className="mt-1 text-[14px] font-semibold text-[#2d3440]">
                      ₹{Number(summary?.remainingCoverage ?? 0)} / ₹{Number(summary?.coverageAmount || 0)}
                    </p>
                  </article>
                  <article className="rounded-xl border-l-2 border-[#8b9aad] bg-[#f2f4f6] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[#808892]">
                      Max claims (approx.)
                    </p>
                    <p className="mt-1 text-[14px] font-semibold text-[#2d3440]">
                      {summary?.maxClaimsApprox ?? '—'}
                    </p>
                  </article>
                </div>

                {ti ? (
                  <div className="mt-6 rounded-xl border border-[#e5e2dc] bg-white/80 px-4 py-3 text-[13px] text-[#5a626e]">
                    <p className="font-semibold text-[#2d3440]">Extreme triggers (auto-evaluated)</p>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      <li>Rain above {ti.rainAboveMm} mm (current or today&apos;s sum)</li>
                      <li>AQI above {ti.aqiAbove}</li>
                      <li>Temperature above {ti.tempAboveC}°C (current or daily high)</li>
                      <li>Wind at or above {ti.windAtLeastKmh} km/h</li>
                    </ul>
                    <p className="mt-2 text-[12px] text-[#8d949f]">
                      At most one automatic payout per UTC day. Payout uses daily income × 70% (Basic), 80%
                      (Standard), or 90% (Premium), capped by remaining plan coverage.
                    </p>
                    {ti.reloadsFromEnvFile ? (
                      <p className="mt-2 text-[11px] font-medium text-[#5f7088]">
                        Server is re-reading trigger thresholds from .env on each weather check (local dev).
                      </p>
                    ) : (
                      <p className="mt-2 text-[11px] text-[#8d949f]">
                        Thresholds come from server env (PAYNEST_TRIGGER_*). Restart the API after changing .env
                        unless PAYNEST_TRIGGERS_RELOAD_ENV=true.
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="mt-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8d949f]">
                    History
                  </p>
                  {claims.length === 0 ? (
                    <p className="mt-2 text-[14px] text-[#67707d]">
                      No automatic claims recorded for this account yet.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {claims.map((c) => (
                        <li
                          key={c.id}
                          className="flex flex-col gap-1 rounded-xl border border-[#e8e4dc] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-[14px] font-semibold text-[#2d3440]">{c.triggerLabel}</p>
                            <p className="text-[12px] text-[#7a808a]">
                              {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''} ·{' '}
                              <span
                                className={
                                  c.status === 'credited' ? 'text-[#2a6b3c]' : 'text-[#a85a2a]'
                                }
                              >
                                {c.status}
                              </span>
                            </p>
                            {c.razorpayPayoutId ? (
                              <p className="mt-0.5 font-mono text-[10px] text-[#9a9ca3]">
                                {c.razorpayPayoutId}
                              </p>
                            ) : null}
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-[16px] font-bold text-[#1f252f]">₹{Number(c.amount || 0)}</p>
                            <p className="text-[11px] text-[#8d949f]">
                              Remaining after: ₹{Number(c.coverageRemainingAfter ?? 0)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            {import.meta.env.DEV ? (
              <div className="mx-auto mt-8 flex w-full max-w-[640px] justify-center px-6">
                <div className="flex w-full max-w-[280px] flex-col items-start gap-3 text-left text-[12px] text-[#4a5568]">
                  <p className="text-[11px] leading-relaxed text-[#5c6573]">
                    Local dev: clear stored claims and restore full coverage for testing. Requires{' '}
                    <code className="rounded bg-[#eceff3] px-1 font-mono text-[10px] text-[#3d4652]">
                      PAYNEST_CLAIM_SIMULATOR=true
                    </code>{' '}
                    on the API.
                  </p>
                  <button
                    type="button"
                    disabled={resetBusy || !token}
                    onClick={runClaimReset}
                    className="h-9 w-full rounded-lg border border-[#8b5a5a] bg-white px-4 text-[12px] font-semibold text-[#8b3a3a] disabled:opacity-50 sm:w-auto"
                  >
                    {resetBusy ? 'Resetting…' : 'Reset claim history'}
                  </button>
                  {resetMsg ? (
                    <p
                      className={`text-[11px] ${
                        /cleared|available again/i.test(resetMsg) ? 'text-[#2a6b3c]' : 'text-[#a34b2a]'
                      }`}
                    >
                      {resetMsg}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </main>

          <div className="pb-5 text-center text-[11px] text-[#6d7480]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              Powered by PayNest AI Risk Engine
            </span>
          </div>

          <footer className="border-t border-[#ebe8e2]">
            <div className="flex flex-col gap-4 px-6 py-5 text-[12px] text-[#676e79] md:flex-row md:items-center md:justify-between lg:px-8">
              <div className="flex gap-6">
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

export default ClaimsPage
