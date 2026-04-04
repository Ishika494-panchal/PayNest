import { CircleOff, RotateCcw, Ticket, Trophy } from 'lucide-react'
import DashboardTopNav from '../components/DashboardTopNav'
import DashboardSidebar from '../components/DashboardSidebar'

function RewardsPage({ userName = '', onLogout }) {

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
                  Rewards data pending.
                </p>
                <p className="mt-3 max-w-[560px] text-[39px] font-medium leading-[1.1] text-[#505965]">
                  No rewards available yet.
                </p>

                <div className="mt-7 grid gap-4 md:grid-cols-2">
                  <article className="relative rounded-3xl border border-[#ece8df] bg-white p-6">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f3f0e8] text-[#9e830f]">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <p className="mt-6 text-[30px] font-semibold leading-none">Weekly Cashback</p>
                    <p className="mt-2 text-[15px] leading-[1.4] text-[#6f7784]">Awaiting backend data.</p>
                    <p className="mt-8 text-[52px] font-semibold leading-none text-[#8f7820]">₹0.00</p>
                  </article>

                  <article className="rounded-3xl bg-gradient-to-br from-[#5f728d] to-[#8ea3c0] p-6 text-white">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#ffffff22]">
                      <Ticket className="h-5 w-5" />
                    </div>
                    <p className="mt-6 text-[30px] font-semibold leading-none">Renewal Reward</p>
                    <p className="mt-2 text-[15px] leading-[1.4] text-[#e6ecf5]">Awaiting backend data.</p>
                    <p className="mt-8 text-[52px] font-semibold leading-none">
                      0% <span className="text-[30px]">OFF</span>
                    </p>
                  </article>
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    className="h-12 rounded-full bg-[#657993] px-8 text-[16px] font-semibold text-white shadow-[0_6px_12px_rgba(101,121,147,0.35)]"
                  >
                    Claim Now
                  </button>
                  <button
                    type="button"
                    className="h-12 rounded-full bg-[#ece9e2] px-8 text-[16px] font-semibold text-[#555d69]"
                  >
                    View Balance
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <article className="rounded-3xl border border-[#ece8df] bg-[#f8f6f1] p-6">
                  <p className="text-[31px] font-semibold">Reward Progress</p>
                  <div className="mx-auto mt-7 grid h-[210px] w-[210px] place-items-center rounded-full border-[10px] border-[#9d8f43]">
                    <div className="text-center">
                    <p className="text-[52px] font-semibold leading-none">0/0</p>
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
                      PROTECTED
                    </span>
                  </div>
                  <p className="mt-3 text-[22px] leading-[1.35] text-[#5b6370]">
                    No streak data yet.
                  </p>
                </article>

                <article className="rounded-3xl border border-[#ece8df] bg-white p-6">
                  <p className="text-[30px] font-semibold">Recent Wins</p>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#eef2f6] text-[#7a8492]">
                          <RotateCcw className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[20px] font-semibold">No reward entry</p>
                          <p className="text-[13px] text-[#727b87]">N/A</p>
                        </div>
                      </div>
                      <p className="text-[28px] font-semibold">₹0.00</p>
                    </div>
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
