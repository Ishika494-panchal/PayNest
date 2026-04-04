import { Bell, CircleHelp } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import UserAvatarMenu from './UserAvatarMenu'

function DashboardTopNav({ userName = '', onLogout }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#ece8de] bg-[#f5f3ee]/95 backdrop-blur-sm">
      <div className="flex w-full items-center justify-between px-5 py-4 sm:px-8">
        <p className="text-[30px] font-semibold leading-none text-[#2f3642]">PayNest</p>

        <div className="hidden items-end gap-9 text-[13px] font-medium text-[#4f5563] md:flex">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `pb-1.5 leading-none transition-colors hover:text-[#353b48] ${
                isActive ? 'border-b-[3px] border-[#c2a51b] text-[#2f3440]' : ''
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `pb-1.5 leading-none transition-colors hover:text-[#353b48] ${
                isActive ? 'border-b-[3px] border-[#c2a51b] text-[#2f3440]' : ''
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/plan-selection"
            className={({ isActive }) =>
              `pb-1.5 leading-none transition-colors hover:text-[#353b48] ${
                isActive ? 'border-b-[3px] border-[#c2a51b] text-[#2f3440]' : ''
              }`
            }
          >
            Protection
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `pb-1.5 leading-none transition-colors hover:text-[#353b48] ${
                isActive ? 'border-b-[3px] border-[#c2a51b] text-[#2f3440]' : ''
              }`
            }
          >
            History
          </NavLink>
          <NavLink
            to="/rewards"
            className={({ isActive }) =>
              `pb-1.5 leading-none transition-colors hover:text-[#353b48] ${
                isActive ? 'border-b-[3px] border-[#c2a51b] text-[#2f3440]' : ''
              }`
            }
          >
            Rewards
          </NavLink>
        </div>

        <div className="ml-auto flex items-center gap-5 text-[#3d4551] md:ml-0">
          <Bell className="h-[17px] w-[17px]" strokeWidth={1.9} />
          <CircleHelp className="h-[17px] w-[17px]" strokeWidth={1.9} />
          <UserAvatarMenu userName={userName} onLogout={onLogout} />
        </div>
      </div>
    </header>
  )
}

export default DashboardTopNav
