import { CircleOff, RotateCcw, Ticket, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardTopNav from '../components/DashboardTopNav'
import DashboardSidebar from '../components/DashboardSidebar'
import { getRewardsStatus } from '../lib/api'

function formatDateLabel(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString()
}

function RewardsPage({ userName = '', token, onLogout }) {
  const navigate = useNavigate()
  const [rewardsData, setRewardsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const hydrate = async () => {
      if (!token) {
        if (mounted) setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const result = await getRewardsStatus(token)
        if (mounted) setRewardsData(result)
      } catch (e) {
        if (mounted) {
          setRewardsData(null)
          setError(e?.message || 'Unable to load rewards.')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    hydrate()
    return () => {
      mounted = false
    }
  }, [token])

  const rewards = rewardsData?.rewards || null
  const claimFreeCycles = Number(rewards?.claimFreeCycles || 0)
  const claimedCycles = Number(rewards?.claimedCycles || 0)
  const totalCycles = claimFreeCycles + claimedCycles
  const streak = Number(rewards?.currentStreak || 0)
  const nextDiscountAmount = Number(rewards?.nextDiscountAmountPreview || 0)
  const discountPercent = Number(rewards?.discountPercent || 0)
  const eligible = Boolean(rewards?.eligible)
  const recentCycles = Array.isArray(rewards?.recentCycles) ? rewards.recentCycles : []
  const latestStatus = String(rewards?.latestCycleStatus || 'none')
  const streakTag = latestStatus === 'claimed' ? 'RESET' : eligible ? 'ELIGIBLE' : 'PROTECTED'
  const headline = loading
    ? 'Loading rewards...'
    : eligible
      ? 'No-claim bonus unlocked.'
      : latestStatus === 'claimed'
        ? 'Last cycle had a claim.'
        : 'Keep this cycle claim-free.'
  const subline = loading
    ? 'Reading real-time reward data from your account.'
    : eligible
      ? `Your next renewal can use ${discountPercent}% off.`
      : latestStatus === 'claimed'
        ? 'Discount is skipped for the next renewal after a claimed cycle.'
        : 'When this cycle ends without claims, discount applies on next renewal.'

  return (
    <div className="min-h-screen bg-[#f5f3ee] text-[#2f3642]">
      <DashboardTopNav userName={userName} onLogout={onLogout} />
      <div className="flex min-h-[calc(100vh-72px)]">
        <DashboardSidebar onLogout={onLogout} />

        <div className="flex flex-1 flex-col">

          <main className="px-5 pb-12 pt-8 sm:px-8">
            <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <span className="rounded-full bg-[#e7cd67] px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#3d3a2b]">
                  Weekly Achievement
                </span>
                <p className="mt-5 text-[31px] font-semibold leading-tight">
                  {headline}
                </p>
                <p className="mt-3 max-w-[560px] text-[39px] font-medium leading-[1.1] text-[#505965]">
                  {subline}
                </p>

                <div className="mt-7 grid gap-4 md:grid-cols-2">
                  <article className="relative rounded-3xl border border-[#ece8df] bg-white p-6">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f3f0e8] text-[#9e830f]">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <p className="mt-6 text-[30px] font-semibold leading-none">Weekly Cashback</p>
                    <p className="mt-2 text-[15px] leading-[1.4] text-[#6f7784]">
                      Applied when the previous cycle closes without claims.
                    </p>
                    <p className="mt-8 text-[52px] font-semibold leading-none text-[#8f7820]">
                      ₹{nextDiscountAmount.toFixed(2)}
                    </p>
                  </article>

                  <article className="rounded-3xl bg-gradient-to-br from-[#5f728d] to-[#8ea3c0] p-6 text-white">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#ffffff22]">
                      <Ticket className="h-5 w-5" />
                    </div>
                    <p className="mt-6 text-[30px] font-semibold leading-none">Renewal Reward</p>
                    <p className="mt-2 text-[15px] leading-[1.4] text-[#e6ecf5]">
                      {eligible ? 'Eligible now for next plan purchase.' : 'Not eligible in current state.'}
                    </p>
                    <p className="mt-8 text-[52px] font-semibold leading-none">
                      {eligible ? discountPercent : 0}% <span className="text-[30px]">OFF</span>
                    </p>
                  </article>
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/plan-selection')}
                    className="h-12 rounded-full bg-[#657993] px-8 text-[16px] font-semibold text-white shadow-[0_6px_12px_rgba(101,121,147,0.35)]"
                  >
                    Use On Renewal
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/activities')}
                    className="h-12 rounded-full bg-[#ece9e2] px-8 text-[16px] font-semibold text-[#555d69]"
                  >
                    View Cycles
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <article className="rounded-3xl border border-[#ece8df] bg-[#f8f6f1] p-6">
                  <p className="text-[31px] font-semibold">Reward Progress</p>
                  <div className="mx-auto mt-7 grid h-[210px] w-[210px] place-items-center rounded-full border-[10px] border-[#9d8f43]">
                    <div className="text-center">
                      <p className="text-[52px] font-semibold leading-none">
                        {streak}/{totalCycles}
                      </p>
                      <p className="mt-1 text-[13px] font-semibold tracking-[0.08em] text-[#656c77]">
                        CLAIM-FREE WEEKS
                      </p>
                    </div>
                  </div>
                </article>

                <article className="rounded-3xl border border-[#ece8df] bg-[#f8f6f1] p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-[30px] font-semibold">Streak Status</p>
                    <span className="rounded-full bg-[#dbe6f8] px-3 py-1 text-[12px] font-semibold text-[#44526a]">
                      {streakTag}
                    </span>
                  </div>
                  <p className="mt-3 text-[22px] leading-[1.35] text-[#5b6370]">
                    {streak > 0
                      ? `${streak} claim-free cycle${streak > 1 ? 's' : ''} in a row.`
                      : 'No active no-claim streak yet.'}
                  </p>
                  <p className="mt-2 text-[13px] text-[#707988]">
                    Total completed cycles: {totalCycles} | Claim-free: {claimFreeCycles} | Claimed:{' '}
                    {claimedCycles}
                  </p>
                </article>

                <article className="rounded-3xl border border-[#ece8df] bg-white p-6">
                  <p className="text-[30px] font-semibold">Recent Wins</p>
                  <div className="mt-5 space-y-4">
                    {recentCycles.length === 0 ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-[#eef2f6] text-[#7a8492]">
                            <CircleOff className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-[20px] font-semibold">No reward entry</p>
                            <p className="text-[13px] text-[#727b87]">N/A</p>
                          </div>
                        </div>
                        <p className="text-[28px] font-semibold">₹0.00</p>
                      </div>
                    ) : (
                      recentCycles.map((cycle) => {
                        const ok = cycle.status === 'claim-free'
                        return (
                          <div key={cycle.orderId || cycle.paidAt} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`grid h-10 w-10 place-items-center rounded-full ${
                                  ok
                                    ? 'bg-[#e8f4ee] text-[#2f8a53]'
                                    : 'bg-[#f3ecec] text-[#8f4a4a]'
                                }`}
                              >
                                {ok ? <RotateCcw className="h-4 w-4" /> : <CircleOff className="h-4 w-4" />}
                              </div>
                              <div>
                                <p className="text-[20px] font-semibold">
                                  {ok ? 'Claim-free cycle' : cycle.status === 'claimed' ? 'Claim used' : 'Cycle active'}
                                </p>
                                <p className="text-[13px] text-[#727b87]">
                                  Paid {formatDateLabel(cycle.paidAt)} | Claims: {cycle.claimCount}
                                </p>
                              </div>
                            </div>
                            <p className="text-[28px] font-semibold">
                              {ok && cycle.ended ? `${discountPercent}%` : '0%'}
                            </p>
                          </div>
                        )
                      })
                    )}
                  </div>
                </article>
              </div>
            </section>
          </main>

          <footer className="mt-auto border-t border-[#ebe8e2] px-6 py-6">
            <div className="flex flex-col gap-4 text-[13px] text-[#676e79] lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[34px] font-semibold text-[#434b57]">PayNest AI</p>
                <p className="mt-1">© 2024 PayNest AI. Financial Security for the Modern Workforce.</p>
              </div>
              <div className="flex gap-6">
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
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default RewardsPage
