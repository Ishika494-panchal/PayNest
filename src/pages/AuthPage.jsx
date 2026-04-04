import { useState } from 'react'
import { BadgeCheck, Droplets } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AuthPanel from '../components/AuthPanel'
import Navbar from '../components/Navbar'
import { login, signup } from '../lib/api'

function AuthPage({ isLoggedIn, userName, onAuthSuccess }) {
  const [mode, setMode] = useState('signup')
  const navigate = useNavigate()

  const handleSignup = async (payload) => {
    const result = await signup(payload)
    onAuthSuccess(result)
    navigate('/')
  }

  const handleLogin = async (payload) => {
    const result = await login(payload)
    onAuthSuccess(result)
    navigate('/')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f2ee]">
      <Navbar isLoggedIn={isLoggedIn} userName={userName} />
      <div className="pointer-events-none absolute -left-12 -top-14 h-40 w-40 rounded-full border-[5px] border-[#efede7]" />
      <div className="pointer-events-none absolute -bottom-6 right-10 h-28 w-28 rounded-[38px] border-[5px] border-[#efede7]" />

      <main className="mx-auto flex w-full max-w-[1240px] flex-col justify-between px-5 pb-12 pt-4 md:min-h-screen md:px-8">
        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 text-[#55657e]">
              <div className="rounded-xl bg-[#667791] p-2 text-white">
                <BadgeCheck className="h-4 w-4" />
              </div>
              <span className="text-[36px] font-semibold tracking-[-0.02em] text-[#5b6577]">
                PayNest
              </span>
            </div>

            <h1 className="max-w-[640px] text-[68px] font-semibold leading-[1.04] tracking-[-0.035em] text-[#1c1f25]">
              When Work Stops,
              <br />
              <span className="text-[#6a5a0f]">Income Doesn&apos;t</span>
            </h1>
            <p className="mt-6 max-w-[620px] text-[18px] leading-[1.65] text-[#59606c]">
              The resilient sanctuary for the modern workforce. We protect your
              earnings against the volatility of gig-life, so you can focus on the
              journey ahead.
            </p>

            <div className="relative mt-8 h-[280px] max-w-[560px] overflow-hidden rounded-[30px] bg-[#2e3746] shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
              <img
                src="https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1400&q=80"
                alt="Worker protected by shield"
                className="h-full w-full object-cover"
              />
              <div className="absolute left-5 top-5 h-[180px] w-[180px] rounded-full bg-[#f5cf4b]/20 blur-[50px]" />
              <div className="absolute bottom-5 left-5 inline-flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-[0_6px_12px_rgba(0,0,0,0.12)]">
                <div className="rounded-full bg-[#f1cb45] p-2.5 text-[#21262e]">
                  <BadgeCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#20252c]">Income Secured</p>
                  <p className="text-[12px] text-[#6a7280]">Verified by PayNest AI</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-start lg:justify-end">
            <AuthPanel
              mode={mode}
              setMode={setMode}
              onSignup={handleSignup}
              onLogin={handleLogin}
            />
          </div>
        </section>

        <footer className="mt-12 flex flex-col gap-4 border-t border-[#ebe8e1] pt-6 text-[#636b77] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[18px] font-semibold text-[#566172]">PayNest AI</p>
            <p className="mt-1.5 max-w-[420px] text-[12px] leading-[1.5]">
              © 2024 PayNest AI. Financial Security for the Modern Workforce.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-7 gap-y-1.5 text-[12px]">
            <a href="#" className="hover:text-[#303641]">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-[#303641]">
              Terms of Service
            </a>
            <a href="#" className="hover:text-[#303641]">
              Risk Disclosure
            </a>
            <a href="#" className="hover:text-[#303641]">
              Contact
            </a>
          </div>
        </footer>
      </main>

      <Droplets className="pointer-events-none absolute bottom-16 right-12 h-12 w-12 text-[#ebe8e1]" />
    </div>
  )
}

export default AuthPage
