import { History, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardSidebar from '../components/DashboardSidebar'
import DashboardTopNav from '../components/DashboardTopNav'
import { getClaimsSummary } from '../lib/api'

function ClaimsHistoryPage({ userName, onLogout, token }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!token) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const data = await getClaimsSummary(token)
        if (mounted) {
          setSummary(data)
          setError('')
        }
      } catch (err) {
        if (mounted) setError(err?.message || 'Could not load claim history.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [token])

  const claims = Array.isArray(summary?.claims) ? summary.claims : []
  const planTitle = summary?.selectedPlan?.title || null

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f3ee]">
      <DashboardTopNav userName={userName} onLogout={onLogout} />
      <div className="flex min-h-[calc(100vh-72px)]">
        <DashboardSidebar onLogout={onLogout} />

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex justify-center px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
            <section className="w-full max-w-[640px]">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e8e4da] text-[#5c5644]">
                  <History className="h-6 w-6" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-[30px] font-semibold leading-tight text-[#1f252f] sm:text-[34px] md:text-[40px]">
                    Claims history
                  </h1>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#67707d]">
                    Past automatic payouts for your account. For coverage and triggers, see{' '}
                    <Link to="/claims" className="font-semibold text-[#5f7088] underline-offset-2 hover:underline">
                      Claims
                    </Link>
                    .
                  </p>
                  {planTitle ? (
                    <p className="mt-2 text-[13px] text-[#8d949f]">
                      Current plan: <span className="font-medium text-[#4a5568]">{planTitle}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-8 rounded-[24px] border border-[#ece8df] bg-[#f7f5f0] p-4 shadow-[0_8px_20px_rgba(0,0,0,0.04)] sm:p-6">
                {error ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-800">
                    {error}
                  </p>
                ) : null}

                {loading ? (
                  <p className="text-[14px] text-[#8d949f]">Loading history…</p>
                ) : claims.length === 0 ? (
                  <p className="text-[15px] text-[#67707d]">
                    No claims yet. When severe weather triggers an automatic payout, it will appear here.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {claims.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-col gap-1 rounded-xl border border-[#e8e4dc] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-[14px] font-semibold text-[#2d3440]">{c.triggerLabel}</p>
                          <p className="text-[12px] text-[#7a808a]">
                            {c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'} ·{' '}
                            <span
                              className={
                                c.status === 'credited' ? 'text-[#2a6b3c]' : 'text-[#a85a2a]'
                              }
                            >
                              {c.status}
                            </span>
                          </p>
                          {c.razorpayPayoutId ? (
                            <p className="mt-0.5 break-all font-mono text-[10px] text-[#9a9ca3]">
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
            </section>
          </main>

          <div className="pb-5 text-center text-[11px] text-[#6d7480]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              Powered by PayNest AI Risk Engine
            </span>
          </div>

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

export default ClaimsHistoryPage
