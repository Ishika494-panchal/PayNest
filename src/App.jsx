import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ActivitiesPage from './pages/ActivitiesPage'
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
import { ApiError, getCurrentUser, logout as logoutApi } from './lib/api'

const USER_SNAPSHOT_KEY = 'paynest_user_snapshot'

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

function AppRoutes() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('paynest_auth_token') || '')
  const [authUser, setAuthUser] = useState(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const isLoggedIn = Boolean(authToken && authUser)

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

  const handleAuthSuccess = ({ token, user }) => {
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

  if (isAuthChecking) {
    return <div className="grid min-h-screen place-items-center bg-[#f4f2ee] text-[#5f6673]">Loading...</div>
  }

  const requireAuth = (element) => (isLoggedIn ? element : <Navigate to="/login" replace />)
  const requireCompletedProfile = (element) =>
    isLoggedIn && !authUser?.profileCompleted ? <Navigate to="/userdetails" replace /> : element

  return (
    <Routes>
        <Route
          path="/"
          element={
            isLoggedIn && !authUser?.profileCompleted ? (
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
            isLoggedIn ? (
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
              <RewardsPage userName={authUser?.name || ''} onLogout={handleLogout} />
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
