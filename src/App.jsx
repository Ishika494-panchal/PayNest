import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ActivitiesPage from './pages/ActivitiesPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AuthPage from './pages/AuthPage'
import CheckoutPage from './pages/CheckoutPage'
import ClaimsHistoryPage from './pages/ClaimsHistoryPage'
import ClaimsPage from './pages/ClaimsPage'
import DashboardPage from './pages/DashboardPage'
import LandingPage from './pages/LandingPage'
import PlanSelectionPage from './pages/PlanSelectionPage'
import RewardsPage from './pages/RewardsPage'
import SettingsPage from './pages/SettingsPage'
import UserDetailsPage from './pages/UserDetailsPage'
import { ApiError, getAdminMe, getCurrentUser, logout as logoutApi } from './lib/api'

const USER_SNAPSHOT_KEY = 'paynest_user_snapshot'
const ADMIN_SESSION_KEY = 'paynest_admin_session'

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

function AppRoutes() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('paynest_auth_token') || '')
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('paynest_admin_token') || '')
  const [authUser, setAuthUser] = useState(null)
  const [adminSession, setAdminSession] = useState(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [isAdminChecking, setIsAdminChecking] = useState(true)
  const isLoggedIn = Boolean(authToken && authUser)
  const isAdminLoggedIn = Boolean(adminToken && adminSession)

  useEffect(() => {
    if (!authToken || !authUser) return
    try {
      sessionStorage.setItem(USER_SNAPSHOT_KEY, JSON.stringify(authUser))
    } catch {
      /* ignore quota / private mode */
    }
  }, [authToken, authUser])

  useEffect(() => {
    let isMounted = true
    const clearSnapshot = () => {
      try {
        sessionStorage.removeItem(USER_SNAPSHOT_KEY)
      } catch {
        /* ignore */
      }
    }
    const readSnapshot = () => {
      try {
        const raw = sessionStorage.getItem(USER_SNAPSHOT_KEY)
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    }

    const hydrateUser = async () => {
      if (!authToken) {
        if (isMounted) {
          setAuthUser(null)
          setIsAuthChecking(false)
        }
        return
      }

      const gapsMs = [0, 350, 500, 800, 1200]
      let lastErr = null
      for (let i = 0; i < gapsMs.length; i++) {
        if (gapsMs[i] > 0) {
          await new Promise((r) => setTimeout(r, gapsMs[i]))
        }
        try {
          const result = await getCurrentUser(authToken)
          if (isMounted) {
            setAuthUser(result.user)
            setIsAuthChecking(false)
          }
          return
        } catch (e) {
          lastErr = e
          const status = e instanceof ApiError ? e.status : 0
          if (status === 401) break
        }
      }

      if (!isMounted) return

      const status = lastErr instanceof ApiError ? lastErr.status : 0
      if (status === 401) {
        localStorage.removeItem('paynest_auth_token')
        setAuthToken('')
        setAuthUser(null)
        clearSnapshot()
      } else {
        const snap = readSnapshot()
        if (snap) setAuthUser(snap)
      }
      setIsAuthChecking(false)
    }

    hydrateUser()
    return () => {
      isMounted = false
    }
  }, [authToken])

  useEffect(() => {
    let mounted = true
    const hydrateAdmin = async () => {
      if (!adminToken) {
        if (mounted) {
          setAdminSession(null)
          setIsAdminChecking(false)
        }
        return
      }
      try {
        const result = await getAdminMe(adminToken)
        if (mounted) {
          setAdminSession(result.admin || null)
          setIsAdminChecking(false)
        }
      } catch (e) {
        const status = e instanceof ApiError ? e.status : 0
        if (!mounted) return
        if (status === 401) {
          localStorage.removeItem('paynest_admin_token')
          try {
            sessionStorage.removeItem(ADMIN_SESSION_KEY)
          } catch {
            /* ignore */
          }
          setAdminToken('')
          setAdminSession(null)
        }
        setIsAdminChecking(false)
      }
    }
    hydrateAdmin()
    return () => {
      mounted = false
    }
  }, [adminToken])

  useEffect(() => {
    if (!adminToken || !adminSession) return
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminSession))
    } catch {
      /* ignore */
    }
  }, [adminToken, adminSession])

  const handleAuthSuccess = (result) => {
    const token = result?.token || ''
    const adminUser = result?.user?.role === 'admin' ? result.user : result?.admin || null
    const user = result?.user || null
    const isAdmin = Boolean(adminUser)
    if (isAdmin) {
      localStorage.removeItem('paynest_auth_token')
      try {
        sessionStorage.removeItem(USER_SNAPSHOT_KEY)
      } catch {
        /* ignore */
      }
      setAuthToken('')
      setAuthUser(null)

      localStorage.setItem('paynest_admin_token', token)
      setAdminToken(token)
      setAdminSession(adminUser)
      return
    }

    localStorage.removeItem('paynest_admin_token')
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY)
    } catch {
      /* ignore */
    }
    setAdminToken('')
    setAdminSession(null)

    localStorage.setItem('paynest_auth_token', token)
    setAuthToken(token)
    setAuthUser(user)
  }

  const handleProfileSaved = (user) => {
    setAuthUser(user)
  }

  const handleInitialPlanCompleted = (user) => {
    setAuthUser(user)
  }

  const handleLogout = async () => {
    try {
      if (authToken) await logoutApi(authToken)
    } catch {
      /* still clear local session */
    }
    localStorage.removeItem('paynest_auth_token')
    try {
      sessionStorage.removeItem(USER_SNAPSHOT_KEY)
    } catch {
      /* ignore */
    }
    setAuthToken('')
    setAuthUser(null)
  }

  const handleAdminLogout = async () => {
    try {
      if (adminToken) await logoutApi(adminToken)
    } catch {
      /* clear local admin session regardless */
    }
    localStorage.removeItem('paynest_admin_token')
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY)
    } catch {
      /* ignore */
    }
    setAdminToken('')
    setAdminSession(null)
  }

  if (isAuthChecking || isAdminChecking) {
    return <div className="grid min-h-screen place-items-center bg-[#f4f2ee] text-[#5f6673]">Loading...</div>
  }

  const requireAuth = (element) => (isLoggedIn ? element : <Navigate to="/login" replace />)
  const requireAdminAuth = (element) => (isAdminLoggedIn ? element : <Navigate to="/login" replace />)
  const requireCompletedProfile = (element) =>
    isLoggedIn && !authUser?.profileCompleted ? <Navigate to="/userdetails" replace /> : element

  return (
    <Routes>
        <Route path="/admin/login" element={<Navigate to="/login" replace />} />
        <Route
          path="/admin"
          element={requireAdminAuth(
            <AdminDashboardPage
              admin={adminSession}
              adminToken={adminToken}
              onAdminLogout={handleAdminLogout}
            />
          )}
        />
        <Route
          path="/"
          element={
            isAdminLoggedIn ? (
              <Navigate to="/admin" replace />
            ) : isLoggedIn && !authUser?.profileCompleted ? (
              <Navigate to="/userdetails" replace />
            ) : (
              <LandingPage
                isLoggedIn={isLoggedIn}
                userName={authUser?.name || ''}
                onLogout={handleLogout}
              />
            )
          }
        />
        <Route
          path="/login"
          element={
            isAdminLoggedIn ? (
              <Navigate to="/admin" replace />
            ) : isLoggedIn ? (
              <Navigate to="/" replace />
            ) : (
              <AuthPage
                isLoggedIn={isLoggedIn}
                userName={authUser?.name || ''}
                onAuthSuccess={handleAuthSuccess}
              />
            )
          }
        />
        <Route
          path="/userdetails"
          element={requireAuth(
            <UserDetailsPage token={authToken} user={authUser} onProfileSaved={handleProfileSaved} />
          )}
        />
        <Route
          path="/checkout"
          element={requireAuth(requireCompletedProfile(<CheckoutPage token={authToken} user={authUser} />))}
        />
        <Route
          path="/dashboard"
          element={requireAuth(
            requireCompletedProfile(
              <DashboardPage
                userName={authUser?.name || ''}
                user={authUser}
                token={authToken}
                onLogout={handleLogout}
                onUserRefresh={setAuthUser}
              />
            )
          )}
        />
        <Route
          path="/claims"
          element={requireAuth(
            requireCompletedProfile(
              <ClaimsPage
                userName={authUser?.name || ''}
                user={authUser}
                token={authToken}
                onLogout={handleLogout}
                onUserRefresh={setAuthUser}
              />
            )
          )}
        />
        <Route
          path="/history"
          element={requireAuth(
            requireCompletedProfile(
              <ClaimsHistoryPage
                userName={authUser?.name || ''}
                token={authToken}
                onLogout={handleLogout}
              />
            )
          )}
        />
        <Route
          path="/activities"
          element={requireAuth(
            requireCompletedProfile(
              <ActivitiesPage
                userName={authUser?.name || ''}
                user={authUser}
                token={authToken}
                onLogout={handleLogout}
                onUserRefresh={setAuthUser}
              />
            )
          )}
        />
        <Route
          path="/settings"
          element={requireAuth(
            requireCompletedProfile(
              <SettingsPage
                userName={authUser?.name || ''}
                user={authUser}
                token={authToken}
                onProfileSaved={handleProfileSaved}
                onLogout={handleLogout}
              />
            )
          )}
        />
        <Route
          path="/rewards"
          element={requireAuth(
            requireCompletedProfile(
              <RewardsPage
                userName={authUser?.name || ''}
                token={authToken}
                user={authUser}
                onLogout={handleLogout}
              />
            )
          )}
        />
        <Route
          path="/plan-selection"
          element={requireAuth(
            requireCompletedProfile(
              <PlanSelectionPage
                isLoggedIn={isLoggedIn}
                userName={authUser?.name || ''}
                token={authToken}
                user={authUser}
                onInitialPlanCompleted={handleInitialPlanCompleted}
                onLogout={handleLogout}
              />
            )
          )}
        />
        <Route path="/dashbaord" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
