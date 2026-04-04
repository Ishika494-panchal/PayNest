import {
  Activity,
  Bell,
  FileText,
  Headphones,
  History,
  LogOut,
  Settings,
  Shield,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

function NavItem({ icon: Icon, label, to }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] transition ${
          isActive ? 'bg-[#dfe5ef] text-[#2d3542]' : 'text-[#545d69] hover:bg-[#eceff4]'
        }`
      }
    >
      <Icon className="h-4 w-4" strokeWidth={1.9} />
      <span>{label}</span>
    </NavLink>
  )
}

function DashboardSidebar({ onLogout }) {
  const navigate = useNavigate()

  return (
    <aside className="hidden w-[270px] shrink-0 xl:block">
      <div className="fixed left-0 top-[72px] flex h-[calc(100vh-72px)] w-[270px] flex-col justify-between border-r border-[#e8e4dc] bg-[#f0ede6]">
        <nav className="px-4 pt-5">
          <div className="space-y-1">
            <NavItem icon={FileText} label="Analysis" to="/dashboard" />
            <NavItem icon={Shield} label="Plans" to="/plan-selection" />
            <NavItem icon={Bell} label="Claims" to="/claims" />
            <NavItem icon={History} label="History" to="/history" />
            <NavItem icon={Activity} label="Activities" to="/activities" />
            <NavItem icon={Settings} label="Settings" to="/settings" />
          </div>
        </nav>

        <div className="px-4 pb-5">
          <button
            type="button"
            onClick={() => navigate('/plan-selection')}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5f7088] to-[#8ea3c0] text-[14px] font-semibold text-white shadow-[0_6px_14px_rgba(95,112,136,0.3)] transition hover:brightness-105"
          >
            Get Protected
          </button>
          <div className="mt-5 space-y-1.5 text-[14px] text-[#59616d]">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition hover:bg-[#e8e4dc]/80"
            >
              <Headphones className="h-4 w-4 shrink-0" />
              Help
            </button>
            <button
              type="button"
              onClick={() => onLogout?.()}
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition hover:bg-[#e8e4dc]/80"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default DashboardSidebar
