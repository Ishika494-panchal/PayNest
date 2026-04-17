import { Bell, Menu } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import UserAvatarMenu from './UserAvatarMenu'

function Navbar({ isLoggedIn = false, userName = '', onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navLinkClass = ({ isActive }) =>
    `pb-1.5 leading-none transition-colors hover:text-[#353b48] ${
      isActive ? 'border-b-[3px] border-[#c2a51b] text-[#2f3440]' : ''
    }`

  return (
    <header className="sticky top-0 z-50 border-b border-[#ebe8e2] bg-[#f4f2ee]/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-4 pb-5 pt-7 sm:px-6 lg:px-8">
        <div className="text-[22px] font-semibold tracking-[-0.04em] text-[#1f1f1f]">
          PayNest
        </div>
        <nav className="hidden items-end gap-10 text-[13px] font-medium text-[#4f5563] md:flex">
        <NavLink
          to="/"
          end
          className={navLinkClass}
        >
          Home
        </NavLink>
        <NavLink
          to="/dashboard"
          className={navLinkClass}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/plan-selection"
          className={navLinkClass}
        >
          Protection
        </NavLink>
        <NavLink
          to="/history"
          className={navLinkClass}
        >
          History
        </NavLink>
        <NavLink
          to="/rewards"
          className={navLinkClass}
        >
          Rewards
        </NavLink>
        </nav>
        {isLoggedIn ? (
          <div className="flex items-center gap-3 text-[#2d2d2d] sm:gap-4">
            <Bell className="h-[17px] w-[17px] shrink-0" strokeWidth={1.9} />
            <span className="hidden h-7 w-px bg-[#50545d] sm:block" />
            <UserAvatarMenu
              userName={userName}
              onLogout={onLogout}
              buttonClassName="!h-10 !w-10 !min-h-[2.5rem] !min-w-[2.5rem] !text-[16px] bg-[#d8c9a1] text-[#2d3138] hover:brightness-[0.97]"
            />
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="grid h-9 w-9 place-items-center rounded-md text-[#2d2d2d] md:hidden"
            >
              <Menu className="h-[17px] w-[17px]" strokeWidth={1.9} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="grid h-9 w-9 place-items-center rounded-md text-[#2d2d2d] md:hidden"
            >
              <Menu className="h-[17px] w-[17px]" strokeWidth={1.9} />
            </button>
            <Link
              to="/login"
              className="rounded-full bg-[#f0ce49] px-5 py-2 text-[12px] font-semibold tracking-[0.02em] text-[#22262e] shadow-[0_4px_8px_rgba(240,206,73,0.35)]"
            >
              Login / Signup
            </Link>
          </div>
        )}
      </div>
      {mobileMenuOpen ? (
        <div className="border-t border-[#e4dfd6] bg-[#f4f2ee] px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-3 text-[14px] font-medium text-[#424955]">
            <NavLink to="/" end className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              Dashboard
            </NavLink>
            <NavLink to="/plan-selection" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              Protection
            </NavLink>
            <NavLink to="/history" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              History
            </NavLink>
            <NavLink to="/rewards" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              Rewards
            </NavLink>
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  onLogout?.()
                }}
                className="mt-1 h-9 rounded-md border border-[#d7d1c4] px-3 text-left text-[13px] font-semibold text-[#4d5562]"
              >
                Sign Out
              </button>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  )
}

export default Navbar
