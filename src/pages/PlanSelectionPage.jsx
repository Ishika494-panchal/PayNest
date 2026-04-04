import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CircleDollarSign, ShieldCheck, TimerReset } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { completeInitialPlan, getPricingQuote, getSubscriptionStatus, selectPlan } from '../lib/api'

function PlanCard({
  tier,
  title,
  coverage,
  premium,
  points,
  featured = false,
  badge = '',
  onConfirm,
  disabled = false,
  buttonLabel = 'Confirm & Pay',
}) {
  return (
    <article
      className={`group relative flex min-h-[500px] flex-col rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(13,20,33,0.16)] ${
        featured
          ? 'border-[#9aa7be] bg-[#f8f9fc] shadow-[0_10px_24px_rgba(31,42,60,0.16)]'
          : 'border-[#cfd5de] bg-[#fcfcfd] shadow-[0_6px_14px_rgba(15,23,42,0.06)] hover:border-[#9da8b9]'
      }`}
    >
      {badge ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-[#a88f1f] bg-[#c7aa28] px-4 py-1 text-[10px] font-semibold tracking-[0.08em] text-[#1f2530] shadow-[0_6px_12px_rgba(53,43,4,0.2)]">
          {badge}
        </span>
      ) : null}
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6f7784]">
        {tier}
      </p>
      <div className="mt-1">
        <h3 className="text-[48px] font-semibold leading-none text-[#181e28]">{title}</h3>
        <div className="mt-5">
          <p className="text-[12px] font-medium text-[#667081]">Coverage Amount</p>
          <p className="mt-1 text-[54px] font-semibold leading-none text-[#101722]">
            {coverage}
            <span className="ml-1 text-[14px] font-normal text-[#778091]">/month</span>
          </p>
        </div>
        <div className="mt-5 border-l-2 border-[#d9dfe8] pl-3">
          <p className="text-[12px] font-medium text-[#667081]">Weekly Premium</p>
          <p className="mt-1 text-[52px] font-semibold leading-none text-[#101722]">{premium}</p>
        </div>
      </div>

      <ul className="mt-6 space-y-2.5 border-t border-[#e2e7ef] pt-4">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2 text-[13px] leading-[1.45] text-[#3f4756]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8a7820]" />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onConfirm}
        disabled={disabled}
        className={`mt-auto h-11 w-full rounded-full text-[14px] font-semibold transition-all duration-200 ${
          featured
            ? 'bg-[#5f7496] text-white shadow-[0_8px_16px_rgba(46,63,93,0.35)] hover:bg-[#4f6382] hover:shadow-[0_10px_20px_rgba(46,63,93,0.45)]'
            : 'border border-[#454c5c] bg-white text-[#2f3644] hover:bg-[#1f2736] hover:text-white'
        }`}
      >
        {buttonLabel}
      </button>
    </article>
  )
}

function PlanSelectionPage({ isLoggedIn, userName, token, user, onInitialPlanCompleted, onLogout }) {
  const navigate = useNavigate()
  const isFirstTimePlan = Boolean(user?.needsInitialPlanChoice)
  const [pricing, setPricing] = useState(user?.profile?.dynamicPricing || null)
  const [loadingPricing, setLoadingPricing] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [subscription, setSubscription] = useState(() => {
    const fromUser = user?.profile?.subscription || null
    if (fromUser) return fromUser
    try {
      const raw = localStorage.getItem('paynest_subscription_snapshot')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  })
  const isSubscriptionActive = subscription?.status === 'active' && Number(subscription?.daysLeft || 0) > 0
  const recommendedPlanTitle =
    pricing?.recommendedPlan === 'basic'
      ? 'Basic'
      : pricing?.recommendedPlan === 'standard'
        ? 'Standard'
        : pricing?.recommendedPlan === 'premium'
          ? 'Premium'
          : null

  const plans = useMemo(
    () => [
      {
        key: 'basic',
        tier: 'Essential',
        title: 'Basic',
        coverage: '₹1500',
        premiumBase: '₹20',
        points: [
          'Covers income loss for minor disruptions (light rain / moderate AQI)',
          'Weekly income protection up to ₹1500',
          'Access to no-claim bonus rewards',
        ],
      },
      {
        key: 'standard',
        tier: 'Popular Choice',
        title: 'Standard',
        coverage: '₹2500',
        premiumBase: '₹40',
        points: [
          'Covers income loss for moderate to high disruptions',
          'Weekly protection up to ₹2500 with faster claim processing',
          'Priority auto-claim support with better payout accuracy',
        ],
      },
      {
        key: 'premium',
        tier: 'Total Peace',
        title: 'Premium',
        coverage: '₹4000',
        premiumBase: '₹70',
        points: [
          'Covers income loss for severe weather and pollution disruptions',
          'Weekly protection up to ₹4000 with priority payout support',
          'Best fit for high-uncertainty work zones and seasons',
        ],
      },
    ],
    []
  )

  useEffect(() => {
    let mounted = true
    const hydrateQuote = async () => {
      if (!pricing) setLoadingPricing(true)
      setError('')
      try {
        let quoteUser = null
        try {
          const result = await getPricingQuote(token)
          if (mounted) {
            setPricing(result.pricing || null)
            quoteUser = result.user
          }
        } catch {
          if (mounted) setPricing(null)
        }

        try {
          const subscriptionResult = await getSubscriptionStatus(token)
          if (mounted) {
            setSubscription(subscriptionResult.subscription || null)
            localStorage.setItem(
              'paynest_subscription_snapshot',
              JSON.stringify(subscriptionResult.subscription || null)
            )
          }
        } catch {
          /* subscription banner optional */
        }

        if (mounted && quoteUser) {
          onInitialPlanCompleted(quoteUser)
        }
      } finally {
        if (mounted) setLoadingPricing(false)
      }
    }
    hydrateQuote()
    return () => {
      mounted = false
    }
    // Intentionally only re-fetch when token changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleProceed = async (tier) => {
    if (isSubscriptionActive) {
      setError('Plan change is locked until your current 7-day cycle ends.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      const selected = await selectPlan(token, { tier })
      onInitialPlanCompleted(selected.user)
      localStorage.setItem('paynest_selected_plan_tier', tier)
      localStorage.setItem('paynest_selected_plan_weekly_price', String(selected.selectedPlan.weeklyPremium))
      localStorage.setItem('paynest_selected_plan_name', selected.selectedPlan.title)
      localStorage.setItem(
        'paynest_selected_plan_coverage',
        String(selected.selectedPlan.coverageAmount)
      )
    } catch (selectError) {
      setIsSubmitting(false)
      setError(selectError.message || 'Unable to save selected plan.')
      return
    }

    if (isFirstTimePlan) {
      const result = await completeInitialPlan(token)
      onInitialPlanCompleted(result.user)
    }
    navigate('/checkout')
  }

  const handleSkipForNow = async () => {
    if (isFirstTimePlan) {
      const result = await completeInitialPlan(token)
      onInitialPlanCompleted(result.user)
    }
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <Navbar isLoggedIn={isLoggedIn} userName={userName} onLogout={onLogout} />

      <main className="mx-auto max-w-[1240px] px-6 pb-8 pt-2 lg:px-8">
        <section className="pt-8">
          <h1 className="max-w-[420px] text-[62px] font-semibold leading-[1.02] tracking-[-0.03em] text-[#1f242d]">
            Your Resilient
            <br />
            <span className="text-[#5f6e85]">Sanctuary</span>
          </h1>
          <p className="mt-5 max-w-[420px] text-[14px] leading-[1.6] text-[#5f6673]">
            Personalized pricing is generated from live weather + AQI risk around your
            city and your disruption history.
          </p>
          {loadingPricing || pricing ? (
            <div className="mt-4 rounded-2xl border border-[#e4dfd5] bg-[#f8f6f1] px-4 py-3 text-[13px] text-[#4f5866]">
              {loadingPricing ? (
                <p>Calculating dynamic weekly premium...</p>
              ) : (
                <p>
                  Weekly Price: <span className="font-semibold">₹{pricing.weeklyPrice}</span> | Risk:{' '}
                  <span className="font-semibold capitalize">{pricing.riskScore}</span> | Rainfall:{' '}
                  <span className="font-semibold">{pricing.rainfall} mm</span> | AQI:{' '}
                  <span className="font-semibold">{pricing.aqi}</span>
                </p>
              )}
            </div>
          ) : null}
          {!loadingPricing && pricing && recommendedPlanTitle ? (
            <div className="mt-4 rounded-2xl border border-[#d9e1ec] bg-[#eef3fb] px-4 py-3 text-[13px] text-[#3e4b5f]">
              <p className="font-semibold text-[#2f3a4b]">
                Why we recommend <span className="text-[#4b5f7a]">{recommendedPlanTitle}</span>
              </p>
              <p className="mt-1">
                Based on forecast and risk signals: Rain Intensity{' '}
                <span className="font-semibold">{pricing.rainfall}</span>, AQI{' '}
                <span className="font-semibold">{pricing.aqi}</span>, Area Risk{' '}
                <span className="font-semibold">{pricing.areaRisk}</span>, Past Disruptions{' '}
                <span className="font-semibold">{pricing.pastDisruptions}</span>.
              </p>
              <p className="mt-1">
                Model output weekly premium is <span className="font-semibold">₹{pricing.weeklyPrice}</span>,
                which is closest to the <span className="font-semibold">{recommendedPlanTitle}</span> tier.
              </p>
            </div>
          ) : null}

          <div className="mt-8 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => {
              const isRecommended = pricing?.recommendedPlan === plan.key
              return (
                <PlanCard
                  key={plan.key}
                  tier={plan.tier}
                  title={plan.title}
                  coverage={plan.coverage}
                  premium={
                    isRecommended && pricing?.weeklyPrice
                      ? `₹${pricing.weeklyPrice}`
                      : plan.premiumBase
                  }
                  badge={isRecommended ? 'RECOMMENDED' : ''}
                  featured={isRecommended}
                  points={plan.points}
                  disabled={isSubmitting || isSubscriptionActive}
                  buttonLabel={
                    isSubmitting
                      ? 'Saving...'
                      : isSubscriptionActive
                        ? 'Locked for Current Cycle'
                        : 'Confirm & Pay'
                  }
                  onConfirm={() => handleProceed(plan.key)}
                />
              )
            })}
          </div>
          {subscription ? (
            <div className="mt-4 rounded-2xl border border-[#e3dfd6] bg-[#f7f3ea] px-4 py-3 text-[13px] text-[#4d5766]">
              {subscription.status === 'active' ? (
                <p>
                  Current subscription is <span className="font-semibold">Active</span>. Days left:{' '}
                  <span className="font-semibold">{subscription.daysLeft}</span>. Plan purchase is locked until the
                  current cycle ends.
                </p>
              ) : subscription.status === 'expired' ? (
                <p>
                  Your 7-day subscription has <span className="font-semibold">expired</span>. Latest forecast-based
                  quote is ready above; choose a plan to renew protection now.
                </p>
              ) : (
                <p>No active subscription yet. Select a plan to start your 7-day protection cycle.</p>
              )}
            </div>
          ) : null}
          {isFirstTimePlan ? (
            <button
              type="button"
              onClick={handleSkipForNow}
              disabled={isSubmitting}
              className="mt-4 h-11 rounded-full border border-[#cfd4dd] bg-white px-6 text-[14px] font-semibold text-[#4f5968]"
            >
              Skip for now
            </button>
          ) : null}
          {error ? (
            <p className="mt-3 max-w-full text-[12px] text-[#b24646] break-words">{error}</p>
          ) : null}
        </section>

        <section className="mt-8 flex flex-col gap-4 rounded-3xl border border-[#ebe7de] bg-[#f0eee8] px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[34px] font-semibold text-[#232a34]">Flexible at the core.</h2>
            <p className="mt-2 max-w-[740px] text-[13px] leading-[1.6] text-[#5d6472]">
              Gig work is unpredictable. That&apos;s why PayNest allows you to pause or
              adjust your plan once per quarter with zero penalties. Your sanctuary,
              your rules.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-full bg-white p-3 text-[#4f5968]">
              <TimerReset className="h-4 w-4" />
            </div>
            <div className="rounded-full bg-white p-3 text-[#4f5968]">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="rounded-full bg-white p-3 text-[#4f5968]">
              <CircleDollarSign className="h-4 w-4" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#ebe8e2]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-6 py-5 text-[12px] text-[#676e79] md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex gap-6">
            <p className="font-semibold text-[#444c59]">PayNest AI</p>
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
  )
}

export default PlanSelectionPage
