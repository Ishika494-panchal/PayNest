import {
  ArrowRight,
  Bike,
  Headset,
  Lock,
  ShoppingBasket,
  UtensilsCrossed,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CitySearchField from '../components/CitySearchField'
import { saveUserDetails } from '../lib/api'

function WorkCard({ icon: Icon, label, value, selectedValue, onChange }) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name="workPlatform"
        value={value}
        required
        checked={selectedValue === value}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="flex h-[92px] flex-col items-center justify-center rounded-2xl bg-[#f1efea] text-[#313846] transition hover:bg-[#ebe8e1] peer-checked:border-2 peer-checked:border-[#c2a51b] peer-checked:bg-[#ece8dc]">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
        <span className="mt-2 text-[32px] font-semibold">{label}</span>
      </span>
    </label>
  )
}

function UserDetailsPage({ token, user, onProfileSaved }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [city, setCity] = useState('')
  const [workPlatform, setWorkPlatform] = useState('swiggy')
  const [dailyIncome, setDailyIncome] = useState('800')

  useEffect(() => {
    setFullName(user?.profile?.fullName || user?.name || '')
    setCity(user?.profile?.city || 'mumbai')
    setWorkPlatform(user?.profile?.workPlatform || 'swiggy')
    setDailyIncome(String(user?.profile?.dailyIncome || 800))
  }, [user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      fullName: fullName.trim(),
      city: city.trim(),
      workPlatform: workPlatform.trim() || 'swiggy',
      dailyIncome: Number(dailyIncome || 0),
    }

    if (!payload.fullName || !payload.city || !payload.workPlatform || payload.dailyIncome <= 0) {
      setError('Please fill all user details.')
      return
    }

    setError('')
    setIsSaving(true)
    try {
      const result = await saveUserDetails(token, payload)
      onProfileSaved(result.user)
      navigate('/plan-selection')
    } catch (saveError) {
      setError(saveError.message || 'Unable to save details.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <main className="mx-auto max-w-[1240px] px-6 pb-8 pt-6 lg:px-8">
        <section className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="pt-8">
            <p className="text-[16px] font-semibold text-[#5e6778]">PayNest</p>
            <h1 className="mt-8 max-w-[310px] text-[56px] font-semibold leading-[1.02] tracking-[-0.03em] text-[#1f232b]">
              Your Sanctuary
              <br />
              Starts Here.
            </h1>
            <p className="mt-5 max-w-[350px] text-[14px] leading-[1.5] text-[#5f6673]">
              To build your resilient coverage, we need to understand your unique
              gig-work rhythm.
            </p>
            <div className="mt-14 h-[100px] w-[100px] rounded-[28px] border-[5px] border-[#ece9e2]" />
          </div>

          <div>
            <div className="mb-6">
              <div className="flex items-center justify-between text-[14px] font-semibold text-[#6b717d]">
                <p>Onboarding Step 1 of 2</p>
                <p className="text-[#8f7e22]">50% Complete</p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[#e8e4dd]">
                <div className="h-2 w-1/2 rounded-full bg-[#c2a51b]" />
              </div>
            </div>

            <form
              className="rounded-[28px] border border-[#ece9e3] bg-[#fafafa] p-8 shadow-[0_8px_18px_rgba(0,0,0,0.05)]"
              onSubmit={handleSubmit}
            >
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[14px] font-semibold text-[#5e6572]">
                    Full Name
                  </span>
                  <input
                    name="fullName"
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                    className="h-11 w-full rounded-xl bg-[#f1efea] px-4 text-[16px] text-[#3a3f49] outline-none placeholder:text-[#9aa0aa]"
                  />
                </label>
                <CitySearchField
                  id="onboarding-city"
                  name="city"
                  label="Current City"
                  value={city}
                  onChange={setCity}
                  required
                  inputClassName="h-11 w-full rounded-xl bg-[#f1efea] px-4 text-[16px] text-[#3a3f49] outline-none placeholder:text-[#9aa0aa]"
                />
              </div>

              <p className="mt-7 text-[14px] font-semibold text-[#5e6572]">
                Where do you work?
              </p>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <WorkCard
                  icon={Bike}
                  label="Swiggy"
                  value="swiggy"
                  selectedValue={workPlatform}
                  onChange={(event) => setWorkPlatform(event.target.value)}
                />
                <WorkCard
                  icon={UtensilsCrossed}
                  label="Zomato"
                  value="zomato"
                  selectedValue={workPlatform}
                  onChange={(event) => setWorkPlatform(event.target.value)}
                />
                <WorkCard
                  icon={ShoppingBasket}
                  label="Blinkit"
                  value="blinkit"
                  selectedValue={workPlatform}
                  onChange={(event) => setWorkPlatform(event.target.value)}
                />
              </div>

              <label className="mt-7 block">
                <span className="mb-2 block text-[14px] font-semibold text-[#5e6572]">
                  Average Daily Income (₹)
                </span>
                <input
                  name="dailyIncome"
                  type="number"
                  value={dailyIncome}
                  onChange={(event) => setDailyIncome(event.target.value)}
                  min="1"
                  required
                  className="h-11 w-full rounded-xl bg-[#f1efea] px-4 text-[16px] font-semibold text-[#5a6270] outline-none"
                />
              </label>

              <p className="mt-3 text-[12px] text-[#b8b7b2]">
                This helps us calculate your personalized coverage limit.
              </p>

              <button
                type="submit"
                disabled={isSaving}
                className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e7c63f] text-[16px] font-semibold text-[#242a34] shadow-[0_5px_10px_rgba(231,198,63,0.35)]"
              >
                {isSaving ? 'Saving...' : 'Continue'} <ArrowRight className="h-5 w-5" />
              </button>

              {error ? <p className="mt-3 text-[12px] text-[#b24646]">{error}</p> : null}

              <p className="mt-4 text-center text-[12px] text-[#787e89]">
                By continuing, you agree to our{' '}
                <a href="#" className="underline underline-offset-2">
                  Terms of Service
                </a>
                .
              </p>
            </form>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl bg-[#efede7] px-5 py-4">
                <div className="rounded-full bg-white p-2.5 text-[#6a7381]">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#3b434f]">Secure Data</p>
                  <p className="text-[12px] text-[#6f7683]">Your info is never shared.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-[#dce1ea] px-5 py-4">
                <div className="rounded-full bg-white p-2.5 text-[#6a7381]">
                  <Headset className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#3b434f]">Need Help?</p>
                  <p className="text-[12px] text-[#6f7683]">Chat with an expert.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-8 border-t border-[#ebe8e2]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-6 py-5 text-[12px] text-[#676e79] md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© 2024 PayNest AI. Financial Security for the Modern Workforce.</p>
          <div className="flex gap-6">
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
        </div>
      </footer>
    </div>
  )
}

export default UserDetailsPage
