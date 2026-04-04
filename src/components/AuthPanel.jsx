import { Lock, Mail, User } from 'lucide-react'
import { useState } from 'react'

function InputField({
  label,
  type = 'text',
  placeholder,
  icon: Icon,
  value,
  onChange,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6f7681]">
        {label}
      </span>
      <div className="flex h-12 items-center gap-3 rounded-xl border border-[#e4e5e7] bg-[#f1f0ed] px-3 text-[#6f7681]">
        <Icon className="h-4 w-4" />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full bg-transparent text-[14px] text-[#2b2f36] outline-none placeholder:text-[#8a9098]"
        />
      </div>
    </label>
  )
}

function AuthPanel({ mode, setMode, onSignup, onLogin }) {
  const isSignup = mode === 'signup'
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [loginIdentity, setLoginIdentity] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSignupSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setIsSubmitting(true)
    try {
      await onSignup({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
      })
    } catch (submissionError) {
      setError(submissionError.message || 'Signup failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await onLogin({
        identity: loginIdentity,
        password: loginPassword,
      })
    } catch (submissionError) {
      setError(submissionError.message || 'Login failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <aside className="w-full max-w-[360px] rounded-[28px] border border-[#e8e8e8] bg-[#f8f8f8] p-7 shadow-[0_10px_24px_rgba(0,0,0,0.06)]">
      <div className="mb-6 flex rounded-xl bg-[#efefef] p-1">
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`h-10 flex-1 rounded-lg text-[14px] font-semibold transition ${
            isSignup ? 'bg-white text-[#20242b] shadow-sm' : 'text-[#656c76]'
          }`}
        >
          Signup
        </button>
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`h-10 flex-1 rounded-lg text-[14px] font-semibold transition ${
            !isSignup ? 'bg-white text-[#20242b] shadow-sm' : 'text-[#656c76]'
          }`}
        >
          Login
        </button>
      </div>

      {isSignup ? (
        <>
          <h3 className="text-[40px] font-semibold tracking-[-0.02em] text-[#1c222b]">
            Signup
          </h3>
          <p className="mt-1 text-[22px] text-[#4c5360]">Create your account</p>
          <form className="mt-6 space-y-4" onSubmit={handleSignupSubmit}>
            <InputField
              label="Name"
              placeholder="Enter your name"
              icon={User}
              value={signupName}
              onChange={(event) => setSignupName(event.target.value)}
            />
            <InputField
              label="Email"
              type="email"
              placeholder="Enter your email"
              icon={Mail}
              value={signupEmail}
              onChange={(event) => setSignupEmail(event.target.value)}
            />
            <InputField
              label="Password"
              type="password"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              icon={Lock}
              value={signupPassword}
              onChange={(event) => setSignupPassword(event.target.value)}
            />
            <InputField
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              icon={Lock}
              value={signupConfirmPassword}
              onChange={(event) => setSignupConfirmPassword(event.target.value)}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 h-11 w-full rounded-xl bg-[#f0ce49] text-[16px] font-semibold text-[#22262e] shadow-[0_4px_8px_rgba(240,206,73,0.4)]"
            >
              {isSubmitting ? 'Please wait...' : 'Submit'}
            </button>
          </form>
        </>
      ) : (
        <>
          <h3 className="text-[40px] font-semibold tracking-[-0.02em] text-[#1c222b]">
            Login
          </h3>
          <p className="mt-1 text-[22px] text-[#4c5360]">Welcome back</p>
          <form className="mt-6 space-y-4" onSubmit={handleLoginSubmit}>
            <InputField
              label="Name or Email"
              placeholder="Enter name or email"
              icon={User}
              value={loginIdentity}
              onChange={(event) => setLoginIdentity(event.target.value)}
            />
            <InputField
              label="Password"
              type="password"
              placeholder="Enter your password"
              icon={Lock}
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 h-11 w-full rounded-xl bg-[#f0ce49] text-[16px] font-semibold text-[#22262e] shadow-[0_4px_8px_rgba(240,206,73,0.4)]"
            >
              {isSubmitting ? 'Please wait...' : 'Login'}
            </button>
          </form>
        </>
      )}

      {error ? <p className="mt-4 text-[13px] text-[#b24646]">{error}</p> : null}
    </aside>
  )
}

export default AuthPanel
