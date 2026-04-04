import { ArrowRight, BadgeCheck, Shield } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPaymentOrder, getCurrentPricing, getSubscriptionStatus, verifyPayment } from '../lib/api'

function CheckoutPage({ token, user }) {
  const [selectedPlan, setSelectedPlan] = useState(user?.profile?.selectedPlan || null)
  const [pricing, setPricing] = useState(user?.profile?.dynamicPricing || null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const hydrate = async () => {
      setLoading(true)
      try {
        const [pricingResult, subscriptionResult] = await Promise.all([
          getCurrentPricing(token),
          getSubscriptionStatus(token),
        ])
        if (mounted) {
          setSelectedPlan(pricingResult.selectedPlan || null)
          setPricing(pricingResult.pricing || null)
          setSubscription(subscriptionResult.subscription || null)
        }
      } catch {
        /* local fallback is handled below */
      } finally {
        if (mounted) setLoading(false)
      }
    }
    hydrate()
    return () => {
      mounted = false
    }
  }, [token])

  const fallbackPlan = useMemo(
    () => ({
      title: localStorage.getItem('paynest_selected_plan_name') || 'Standard',
      weeklyPremium: Number(localStorage.getItem('paynest_selected_plan_weekly_price') || 40),
      coverageAmount: Number(localStorage.getItem('paynest_selected_plan_coverage') || 2500),
    }),
    []
  )

  const activePlan = selectedPlan || fallbackPlan
  const basePremium = Number(activePlan.weeklyPremium || 0)
  const discount = 0
  const total = Number((basePremium - discount).toFixed(2))
  const hasActiveSubscription = subscription?.status === 'active' && Number(subscription?.daysLeft || 0) > 0

  const loadRazorpayScript = async () => {
    if (window.Razorpay) return true
    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handlePayNow = async () => {
    setError('')
    setPaying(true)
    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Unable to load Razorpay checkout.')

      const orderResult = await createPaymentOrder(token)
      const options = {
        key: orderResult.keyId,
        amount: orderResult.order.amount,
        currency: orderResult.order.currency,
        name: 'PayNest',
        description: `${activePlan.title} weekly protection plan`,
        order_id: orderResult.order.id,
        prefill: {
          name: orderResult.user?.name || '',
          email: orderResult.user?.email || '',
          contact: orderResult.user?.phone || '',
        },
        theme: { color: '#e7c63f' },
        handler: async (response) => {
          try {
            const verify = await verifyPayment(token, response)
            setSubscription(verify.subscription || null)
            localStorage.setItem(
              'paynest_subscription_snapshot',
              JSON.stringify(verify.subscription || null)
            )
            setPaying(false)
          } catch (verifyError) {
            setError(verifyError.message || 'Payment verification failed.')
            setPaying(false)
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      }
      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (payError) {
      setError(payError.message || 'Unable to start payment.')
      setPaying(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <header className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-6 pb-6 pt-6 lg:px-8">
        <div className="flex items-center gap-2 text-[#4e5d73]">
          <Shield className="h-4 w-4" />
          <span className="text-[34px] font-semibold text-[#5a6578]">PayNest</span>
        </div>
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#2d3440]">
          <Shield className="h-3.5 w-3.5" />
          Secure Checkout
        </p>
      </header>

      <main className="mx-auto w-full max-w-[760px] px-6 pb-10 lg:px-8">
        <section className="space-y-4">
          <article className="rounded-[28px] border border-[#ebe7de] bg-[#f0eee8] p-6">
            <h2 className="text-[36px] font-semibold text-[#1f242d]">Order Summary</h2>
            <div className="mt-5 rounded-2xl bg-[#f8f8f8] p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[22px] font-semibold text-[#2a303a]">{activePlan.title}</p>
                  <p className="text-[13px] text-[#646c78]">
                    Coverage up to ₹{activePlan.coverageAmount} | Risk{' '}
                    <span className="capitalize">{pricing?.riskScore || 'medium'}</span>
                    {loading ? ' | refreshing...' : ''}
                  </p>
                </div>
                <span className="rounded-full bg-[#f2edd6] px-2 py-0.5 text-[10px] font-semibold text-[#8f7e22]">
                  {hasActiveSubscription ? 'ACTIVE' : 'PENDING'}
                </span>
              </div>

              <div className="mt-5 space-y-2.5 text-[14px] text-[#4b5360]">
                <div className="flex items-center justify-between">
                  <span>Base Premium</span>
                  <span>₹{basePremium.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between font-medium text-[#8d7c24]">
                  <span>Discount Applied</span>
                  <span>₹{discount.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 border-t border-[#ece8e1] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[16px] font-semibold text-[#2b313b]">Total Amount</span>
                  <span className="text-[36px] font-semibold text-[#1f242d]">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {hasActiveSubscription ? (
              <p className="mt-5 rounded-xl border border-[#d3d9e4] bg-[#eef3fb] px-4 py-3 text-[13px] text-[#425069]">
                Subscription active. Days left: <span className="font-semibold">{subscription.daysLeft}</span>
              </p>
            ) : null}
            <button
              onClick={handlePayNow}
              disabled={paying}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e7c63f] text-[16px] font-semibold text-[#242a34] shadow-[0_5px_10px_rgba(231,198,63,0.35)] disabled:opacity-60"
            >
              {paying ? 'Processing...' : `Pay ₹${total.toFixed(2)}`} <ArrowRight className="h-4 w-4" />
            </button>
            {error ? <p className="mt-2 text-[12px] text-[#b24646]">{error}</p> : null}

            <div className="mt-6 flex justify-center gap-2">
              <span className="h-2 w-6 rounded-full bg-[#adb4c0]" />
              <span className="h-2 w-2 rounded-full bg-[#ccd1d9]" />
              <span className="h-2 w-2 rounded-full bg-[#ccd1d9]" />
              <span className="h-2 w-2 rounded-full bg-[#ccd1d9]" />
            </div>
          </article>

          <article className="rounded-2xl border border-[#ebe7de] bg-[#f0eee8] p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-white p-2 text-[#5f6978]">
                <BadgeCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#323a46]">PCI DSS Compliant</p>
                <p className="mt-1 text-[13px] leading-[1.5] text-[#646c78]">
                  Your data is encrypted with 256-bit SSL security. PayNest never stores
                  your card CVV or UPI PIN.
                </p>
              </div>
            </div>
          </article>
        </section>
      </main>

      <footer className="border-t border-[#ebe8e2]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-6 py-5 text-[12px] text-[#676e79] md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© 2024 PayNest AI. Financial Security for the Modern Workforce.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#2f3640]">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-[#2f3640]">
              Terms of Service
            </a>
            <a href="#" className="hover:text-[#2f3640]">
              Contact Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default CheckoutPage
