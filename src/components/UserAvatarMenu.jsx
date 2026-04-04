import { LogOut, Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function UserAvatarMenu({ userName = '', onLogout, buttonClassName = '' }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const avatarLetter = userName.trim().charAt(0).toUpperCase() || 'A'

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const goToSettings = () => {
    setIsOpen(false)
    navigate('/settings')
  }

  const handleLogout = async () => {
    setIsOpen(false)
    await onLogout?.()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`grid h-9 w-9 place-items-center rounded-full bg-[#e3d5b5] text-[15px] font-semibold text-[#2f3642] transition hover:brightness-95 ${buttonClassName}`}
      >
        {avatarLetter}
      </button>
      {isOpen ? (
        <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-[#e5dfd4] bg-white p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
          <button
            type="button"
            onClick={goToSettings}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[#374151] hover:bg-[#f3f4f6]"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[#9f2f2f] hover:bg-[#fff2f2]"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default UserAvatarMenu
