import { Shield, Sparkles, Wallet, Zap } from 'lucide-react'
import coinsImage from '../assets/Coins-rafiki.png'
import deliveryBg from '../assets/Take Away-pana.svg'
import airisk from '../assets/Risk management-bro.png'

function FeaturesGrid() {
  return (
    <section className="mx-auto w-full max-w-[1240px] px-4 py-14 sm:px-6 lg:px-8">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8a857c]">
        Features
      </p>
      <h2 className="mt-3 text-[42px] font-semibold leading-[1.02] tracking-[-0.03em] text-[#1f1f1f] md:max-w-[520px] md:text-[54px]">
        Engineered for Your
        <br />
        Financial Resilience
      </h2>

      <div className="mt-9 grid gap-4 md:grid-cols-12 md:grid-rows-[auto_auto]">
        <article className="relative overflow-hidden rounded-2xl bg-[#5a6c84] p-6 text-white md:col-span-8 md:row-span-1">
          <img
            src={airisk}
            alt="Delivery analytics background"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[220px] -translate-x-1/2 -translate-y-1/2 opacity-20"
          />
          <div className="relative z-10">
            <Sparkles className="h-4 w-4" />
            <h3 className="mt-3 text-[22px] font-semibold">AI Risk Analysis</h3>
            <p className="mt-2 max-w-[520px] text-[13px] leading-[1.5] text-[#e6edf8]">
              Predictive models monitor your weekly rides and volatility to protect
              your cash flow before disruption occurs.
            </p>
            <p className="mt-3 max-w-[560px] text-[12px] leading-[1.55] text-[#d6e0ef]">
              Real-time weather alerts, demand forecasting, and trip reliability
              scoring help trigger proactive protection before income drops.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#7386a1] px-3 py-1 text-[11px] font-medium text-[#f5f8ff]">
                Weather Risk
              </span>
              <span className="rounded-full bg-[#7386a1] px-3 py-1 text-[11px] font-medium text-[#f5f8ff]">
                Demand Forecast
              </span>
              <span className="rounded-full bg-[#7386a1] px-3 py-1 text-[11px] font-medium text-[#f5f8ff]">
                Route Volatility
              </span>
            </div>
          </div>
        </article>

        <article className="rounded-2xl bg-[#f1de9c] p-6 md:col-span-4 md:row-span-1 md:min-h-[350px]">
          <Shield className="h-4 w-4 text-[#5f4b16]" />
          <h3 className="mt-3 text-[18px] font-semibold text-[#3d2f0d]">Instant Payouts</h3>
          <p className="mt-2 text-[12px] leading-[1.5] text-[#5b4a1d]">
            Claims settled in minutes.
          </p>
          <div className="mt-4 h-[200px] min-h-[240px] overflow-hidden rounded-xl bg-gradient-to-b from-[#f2e8bf] to-[#e3b94f]">
            <img
              src={coinsImage}
              alt="Coins illustration"
              className="h-[100%] w-full object-cover object-center"
            />
          </div>
        </article>

        <article className="rounded-2xl bg-white p-6 md:col-span-4 md:row-span-1 md:min-h-[190px]">
          <Wallet className="h-4 w-4 text-[#3a3a3a]" />
          <h3 className="mt-3 text-[18px] font-semibold text-[#222]">Zero Touch Claims</h3>
          <p className="mt-2 text-[12px] leading-[1.5] text-[#6f6f6f]">
            No manual paperwork required.
          </p>
          <p className="mt-2 text-[12px] leading-[1.5] text-[#7d7d7d]">
            Claims are auto-verified from trip history and recent rider activity.
          </p>
        </article>

        <article className="rounded-2xl bg-white p-6 md:col-span-4 md:row-span-1 md:min-h-[190px]">
          <Zap className="h-4 w-4 text-[#3a3a3a]" />
          <h3 className="mt-3 text-[18px] font-semibold text-[#222]">Fraud Detection</h3>
          <p className="mt-2 text-[12px] leading-[1.5] text-[#6f6f6f]">
            AI ensures every claim stays authentic.
          </p>
          <p className="mt-2 text-[12px] leading-[1.5] text-[#7d7d7d]">
            Pattern checks flag unusual claim spikes and suspicious route behavior.
          </p>
        </article>

        <article className="rounded-2xl bg-[#c5a017] p-6 md:col-span-4 md:row-span-1 md:min-h-[190px]">
          <Sparkles className="h-4 w-4 text-[#40330a]" />
          <h3 className="mt-3 text-[18px] font-semibold text-[#302507]">Weekly Rewards</h3>
          <p className="mt-2 text-[12px] leading-[1.5] text-[#4c3a09]">
            Better payouts for safe consistency.
          </p>
          <p className="mt-2 text-[12px] leading-[1.5] text-[#5c470b]">
            Maintain reliability streaks to unlock bonus credits each week.
          </p>
        </article>
      </div>
    </section>
  )
}

export default FeaturesGrid
