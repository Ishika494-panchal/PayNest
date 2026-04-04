import { Bell, Lock, LogOut, Save, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import DashboardTopNav from '../components/DashboardTopNav'
import DashboardSidebar from '../components/DashboardSidebar'
import CitySearchField from '../components/CitySearchField'
import { updateProfile } from '../lib/api'

function SettingsPage({ userName = '', user, token, onProfileSaved, onLogout }) {

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('mumbai')
  const [workPlatform, setWorkPlatform] = useState('swiggy')
  const [dailyIncome, setDailyIncome] = useState('800')
  const [claimAlerts, setClaimAlerts] = useState(true)
  const [premiumReminders, setPremiumReminders] = useState(true)
  const [weeklyReports, setWeeklyReports] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setFullName(user?.profile?.fullName || user?.name || '')
    setEmail(user?.email || '')
    setPhone(user?.profile?.phone || '')
    setCity(user?.profile?.city || 'mumbai')
    setWorkPlatform(user?.profile?.workPlatform || 'swiggy')
    setDailyIncome(String(user?.profile?.dailyIncome ?? 800))
  }, [user])

  const handleSaveProfile = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSaving(true)
    try {
      const result = await updateProfile(token, {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city,
        workPlatform,
        dailyIncome: Number(dailyIncome || 0),
      })
      onProfileSaved(result.user)
      setSuccess('Profile saved.')
    } catch (saveError) {
      setError(saveError.message || 'Could not save profile.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    onLogout?.()
  }

  return (
    <div className="min-h-screen bg-[#f5f3ee] text-[#2e3643]">
      <DashboardTopNav userName={userName} onLogout={onLogout} />
      <div className="flex min-h-[calc(100vh-72px)]">
        <DashboardSidebar onLogout={onLogout} />

        <div className="flex flex-1 flex-col">

          <main className="px-5 pb-10 pt-7 sm:px-8">
            <h1 className="text-[42px] font-semibold leading-none">Settings</h1>
            <p className="mt-2 text-[15px] text-[#626a77]">
              Manage your account details, notifications, and session controls.
            </p>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <article className="rounded-3xl border border-[#e8e3da] bg-[#f7f5f0] p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#dbe6f8] text-[#4e5a70]">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <h2 className="text-[24px] font-semibold">Edit Profile Details</h2>
                </div>

                <form className="space-y-3" onSubmit={handleSaveProfile}>
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-[#6b717d]">
                      Full name
                    </span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      required
                      className="h-11 w-full rounded-xl bg-white px-4 text-[14px] outline-none ring-1 ring-[#e6e2d9] focus:ring-[#bfc9d9]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-[#6b717d]">Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      className="h-11 w-full rounded-xl bg-white px-4 text-[14px] outline-none ring-1 ring-[#e6e2d9] focus:ring-[#bfc9d9]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-[#6b717d]">
                      Phone number
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Optional"
                      className="h-11 w-full rounded-xl bg-white px-4 text-[14px] outline-none ring-1 ring-[#e6e2d9] focus:ring-[#bfc9d9]"
                    />
                  </label>
                  <CitySearchField
                    id="settings-city"
                    name="city"
                    label="City (for weather)"
                    value={city}
                    onChange={setCity}
                    required
                    inputClassName="h-11 w-full rounded-xl bg-white px-4 text-[14px] outline-none ring-1 ring-[#e6e2d9] focus:ring-[#bfc9d9] placeholder:text-[#9aa0aa]"
                  />
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-[#6b717d]">
                      Work platform
                    </span>
                    <select
                      value={workPlatform}
                      onChange={(event) => setWorkPlatform(event.target.value)}
                      required
                      className="h-11 w-full rounded-xl bg-white px-4 text-[14px] outline-none ring-1 ring-[#e6e2d9] focus:ring-[#bfc9d9]"
                    >
                      <option value="swiggy">Swiggy</option>
                      <option value="zomato">Zomato</option>
                      <option value="blinkit">Blinkit</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] font-semibold text-[#6b717d]">
                      Average daily income (₹)
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={dailyIncome}
                      onChange={(event) => setDailyIncome(event.target.value)}
                      required
                      className="h-11 w-full rounded-xl bg-white px-4 text-[14px] outline-none ring-1 ring-[#e6e2d9] focus:ring-[#bfc9d9]"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="mt-1 inline-flex h-10 items-center gap-2 rounded-xl bg-[#5f7088] px-4 text-[14px] font-semibold text-white disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                  {success ? <p className="text-[12px] text-[#2d6a4f]">{success}</p> : null}
                  {error ? <p className="text-[12px] text-[#b24646]">{error}</p> : null}
                </form>
              </article>

              <article className="rounded-3xl border border-[#e8e3da] bg-[#f7f5f0] p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#ece9e2] text-[#5a6270]">
                    <Bell className="h-5 w-5" />
                  </div>
                  <h2 className="text-[24px] font-semibold">Manage Notifications</h2>
                </div>

                <div className="space-y-3 text-[14px]">
                  <label className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-[#e6e2d9]">
                    Claim alerts
                    <input
                      type="checkbox"
                      checked={claimAlerts}
                      onChange={(event) => setClaimAlerts(event.target.checked)}
                      className="h-4 w-4 accent-[#5f7088]"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-[#e6e2d9]">
                    Premium reminders
                    <input
                      type="checkbox"
                      checked={premiumReminders}
                      onChange={(event) => setPremiumReminders(event.target.checked)}
                      className="h-4 w-4 accent-[#5f7088]"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-[#e6e2d9]">
                    Weekly activity reports
                    <input
                      type="checkbox"
                      checked={weeklyReports}
                      onChange={(event) => setWeeklyReports(event.target.checked)}
                      className="h-4 w-4 accent-[#5f7088]"
                    />
                  </label>
                </div>
              </article>
            </section>

            <section className="mt-4 rounded-3xl border border-[#ebdfcf] bg-[#f6ecd7] p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[22px] font-semibold">Logout</p>
                  <p className="mt-1 text-[14px] text-[#6e7682]">
                    Sign out from this device and return to the login screen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#d69a4d] px-5 text-[14px] font-semibold text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </section>

            <section className="mt-4 rounded-3xl border border-[#e8e3da] bg-[#f7f5f0] p-6">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-[#6a7380]" />
                <p className="text-[14px] text-[#646d79]">
                  Security tip: update your account password every 90 days for stronger protection.
                </p>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
