import {
  Activity,
  Bell,
  CircleHelp,
  FileText,
  Headphones,
  History,
  LogOut,
  Menu,
  Settings,
  Shield,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import UserAvatarMenu from './UserAvatarMenu'

function DashboardTopNav({ userName = '', onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const topNavLinkClass = ({ isActive }) =>
    `pb-1.5 leading-none transition-colors hover:text-[#353b48] ${
      isActive ? 'border-b-[3px] border-[#c2a51b] text-[#2f3440]' : ''
    }`

  const sideNavItemClass = ({ isActive }) =>
    `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] transition ${
      isActive ? 'bg-[#dfe5ef] text-[#2d3542]' : 'text-[#545d69] hover:bg-[#eceff4]'
    }`

  return (
    <header className="sticky top-0 z-50 border-b border-[#ece8de] bg-[#f5f3ee]/95 backdrop-blur-sm">
      <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <p className="text-[30px] font-semibold leading-none text-[#2f3642]">PayNest</p>

        <div className="hidden items-end gap-9 text-[13px] font-medium text-[#4f5563] xl:flex">
          <NavLink
            to="/"
            end
            className={topNavLinkClass}
          >
            Home
          </NavLink>
          <NavLink
            to="/dashboard"
            className={topNavLinkClass}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/plan-selection"
            className={topNavLinkClass}
          >
            Protection
          </NavLink>
          <NavLink
            to="/history"
            className={topNavLinkClass}
          >
            History
          </NavLink>
          <NavLink
            to="/rewards"
            className={topNavLinkClass}
          >
            Rewards
          </NavLink>
        </div>

        <div className="ml-auto flex items-center gap-2 text-[#3d4551] sm:gap-4 xl:ml-0">
          <Bell className="h-[17px] w-[17px]" strokeWidth={1.9} />
          <CircleHelp className="hidden h-[17px] w-[17px] sm:block" strokeWidth={1.9} />
          <UserAvatarMenu userName={userName} onLogout={onLogout} />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle dashboard menu"
            className="grid h-9 w-9 place-items-center rounded-md text-[#2d2d2d] xl:hidden"
          >
            {menuOpen ? <X className="h-[18px] w-[18px]" strokeWidth={1.9} /> : <Menu className="h-[18px] w-[18px]" strokeWidth={1.9} />}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <div className="border-t border-[#e6e1d7] bg-[#f5f3ee] px-4 py-3 xl:hidden">
          <nav className="space-y-1">
            <NavLink to="/dashboard" className={sideNavItemClass} onClick={() => setMenuOpen(false)}>
              <FileText className="h-4 w-4" strokeWidth={1.9} />
              Analysis
            </NavLink>
            <NavLink to="/plan-selection" className={sideNavItemClass} onClick={() => setMenuOpen(false)}>
              <Shield className="h-4 w-4" strokeWidth={1.9} />
              Plans
            </NavLink>
            <NavLink to="/claims" className={sideNavItemClass} onClick={() => setMenuOpen(false)}>
              <Bell className="h-4 w-4" strokeWidth={1.9} />
              Claims
            </NavLink>
            <NavLink to="/history" className={sideNavItemClass} onClick={() => setMenuOpen(false)}>
              <History className="h-4 w-4" strokeWidth={1.9} />
              History
            </NavLink>
            <NavLink to="/activities" className={sideNavItemClass} onClick={() => setMenuOpen(false)}>
              <Activity className="h-4 w-4" strokeWidth={1.9} />
              Activities
            </NavLink>
            <NavLink to="/settings" className={sideNavItemClass} onClick={() => setMenuOpen(false)}>
              <Settings className="h-4 w-4" strokeWidth={1.9} />
              Settings
            </NavLink>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] text-[#545d69] transition hover:bg-[#eceff4]"
            >
              <Headphones className="h-4 w-4" strokeWidth={1.9} />
              Help
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                onLogout?.()
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] text-[#545d69] transition hover:bg-[#eceff4]"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.9} />
              Sign Out
            </button>
          </nav>
        </div>
      ) : null}
    </header>
  )
}

export default DashboardTopNav
