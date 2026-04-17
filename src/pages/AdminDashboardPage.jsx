import { RefreshCcw, Shield, UserRound, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  getAdminUserDetails,
  getAdminUsers,
  resetAdminUserClaims,
  updateAdminUser,
} from '../lib/api'

function StatCard({ label, value }) {
  return (
    <article className="rounded-2xl border border-[#e6e1d8] bg-[#f8f6f1] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#788190]">{label}</p>
      <p className="mt-2 text-[30px] font-semibold leading-none text-[#2a313d]">{value}</p>
    </article>
  )
}

function AdminDashboardPage({ admin, adminToken, onAdminLogout }) {
  const [users, setUsers] = useState([])
  const [totals, setTotals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  const [saveBusy, setSaveBusy] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    city: '',
    workPlatform: '',
    phone: '',
    dailyIncome: '',
    profileCompleted: false,
    needsInitialPlanChoice: false,
    subscriptionStatus: 'none',
  })

  const loadUsers = async () => {
    if (!adminToken) return
    setLoading(true)
    setError('')
    try {
      const result = await getAdminUsers(adminToken)
      setUsers(Array.isArray(result.users) ? result.users : [])
      setTotals(result.totals || null)
      if (!selectedUserId && Array.isArray(result.users) && result.users.length > 0) {
        setSelectedUserId(result.users[0].id)
      }
    } catch (err) {
      setError(err?.message || 'Could not load admin users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken])

  useEffect(() => {
    if (!selectedUserId || !adminToken) {
      setSelectedUser(null)
      return
    }

    let mounted = true
    const loadDetails = async () => {
      setDetailLoading(true)
      setDetailError('')
      try {
        const result = await getAdminUserDetails(adminToken, selectedUserId)
        if (!mounted) return
        const user = result.user || null
        setSelectedUser(user)
        setForm({
          name: user?.name || '',
          email: user?.email || '',
          city: user?.profile?.city || '',
          workPlatform: user?.profile?.workPlatform || '',
          phone: user?.profile?.phone || '',
          dailyIncome: user?.profile?.dailyIncome != null ? String(user.profile.dailyIncome) : '',
          profileCompleted: Boolean(user?.profileCompleted),
          needsInitialPlanChoice: Boolean(user?.needsInitialPlanChoice),
          subscriptionStatus: user?.subscription?.status || 'none',
        })
      } catch (err) {
        if (mounted) setDetailError(err?.message || 'Could not load user details.')
      } finally {
        if (mounted) setDetailLoading(false)
      }
    }
    loadDetails()
    return () => {
      mounted = false
    }
  }, [adminToken, selectedUserId])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        String(u.name || '')
          .toLowerCase()
          .includes(q) || String(u.email || '')
          .toLowerCase()
          .includes(q)
    )
  }, [search, users])

  const handleSave = async () => {
    if (!selectedUserId) return
    setSaveBusy(true)
    setActionMsg('')
    try {
      await updateAdminUser(adminToken, selectedUserId, {
        name: form.name,
        email: form.email,
        city: form.city,
        workPlatform: form.workPlatform,
        phone: form.phone,
        dailyIncome: Number(form.dailyIncome || 0),
        profileCompleted: form.profileCompleted,
        needsInitialPlanChoice: form.needsInitialPlanChoice,
        subscriptionStatus: form.subscriptionStatus,
      })
      setActionMsg('User updated successfully.')
      await loadUsers()
      const refreshed = await getAdminUserDetails(adminToken, selectedUserId)
      setSelectedUser(refreshed.user || null)
    } catch (err) {
      setActionMsg(err?.message || 'Update failed.')
    } finally {
      setSaveBusy(false)
    }
  }

  const handleResetClaims = async () => {
    if (!selectedUserId) return
    setResetBusy(true)
    setActionMsg('')
    try {
      await resetAdminUserClaims(adminToken, selectedUserId)
      setActionMsg('Claims reset for selected user.')
      await loadUsers()
      const refreshed = await getAdminUserDetails(adminToken, selectedUserId)
      setSelectedUser(refreshed.user || null)
    } catch (err) {
      setActionMsg(err?.message || 'Reset failed.')
    } finally {
      setResetBusy(false)
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f3ee] text-[#2c3441]">
      <header className="sticky top-0 z-30 border-b border-[#e8e3d9] bg-[#f5f3ee]/95 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#6f819b] text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[18px] font-semibold">PayNest Admin Dashboard</p>
              <p className="text-[12px] text-[#68717e]">{admin?.email || 'admin'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadUsers}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d8d2c4] bg-white px-3 text-[12px] font-semibold text-[#445062]"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              type="button"
              onClick={onAdminLogout}
              className="h-9 rounded-lg border border-[#d8c9be] bg-white px-3 text-[12px] font-semibold text-[#7a3f3f]"
            >
              Admin Logout
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 pb-8 pt-5 sm:px-6 lg:px-8">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Users" value={totals?.users ?? 0} />
          <StatCard label="Profile Complete" value={totals?.profileCompleted ?? 0} />
          <StatCard label="Active Subscriptions" value={totals?.activeSubscriptions ?? 0} />
          <StatCard label="Total Claims" value={totals?.totalClaims ?? 0} />
          <StatCard label="Total Payments" value={totals?.totalPayments ?? 0} />
        </section>

        {error ? <p className="mt-4 text-[13px] text-[#b24646]">{error}</p> : null}

        <section className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
          <article className="rounded-2xl border border-[#e8e2d7] bg-[#f8f6f1] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[16px] font-semibold">Users</p>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name/email"
                className="h-9 w-full max-w-[220px] rounded-lg border border-[#ddd7cc] bg-white px-3 text-[12px] outline-none"
              />
            </div>
            {loading ? (
              <p className="text-[13px] text-[#6b7483]">Loading users...</p>
            ) : (
              <div className="max-h-[560px] space-y-2 overflow-auto pr-1">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      selectedUserId === u.id
                        ? 'border-[#c5a51f] bg-[#fdf6dd]'
                        : 'border-[#e4dfd4] bg-white hover:border-[#d7d1c4]'
                    }`}
                  >
                    <p className="text-[14px] font-semibold text-[#2f3744]">{u.name || 'Unnamed user'}</p>
                    <p className="text-[12px] text-[#66707e]">{u.email}</p>
                    <p className="mt-1 text-[11px] text-[#7b8492]">
                      Claims: {u.claimsCount} · Payments: {u.paymentsCount} · Sub: {u.subscription?.status || 'none'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-[#e8e2d7] bg-[#f8f6f1] p-4">
            {!selectedUserId ? (
              <p className="text-[13px] text-[#6b7483]">Select a user to view details.</p>
            ) : detailLoading ? (
              <p className="text-[13px] text-[#6b7483]">Loading user details...</p>
            ) : detailError ? (
              <p className="text-[13px] text-[#b24646]">{detailError}</p>
            ) : selectedUser ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[18px] font-semibold text-[#2f3744]">{selectedUser.name}</p>
                    <p className="text-[12px] text-[#66707e]">{selectedUser.email}</p>
                  </div>
                  <div className="rounded-lg border border-[#ddd7cc] bg-white px-2.5 py-1 text-[11px] text-[#606977]">
                    User ID: {selectedUser.id}
                  </div>
                </div>

                <div className="rounded-xl border border-[#e4ded1] bg-white p-3">
                  <p className="text-[12px] font-semibold text-[#4b5564]">Stored Password Hash</p>
                  <p className="mt-1 break-all font-mono text-[11px] text-[#6a7381]">
                    {selectedUser.passwordHash || 'N/A'}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-[12px]">
                    <span className="mb-1 block text-[#6a7280]">Name</span>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      className="h-9 w-full rounded-lg border border-[#ddd7cc] bg-white px-2.5 outline-none"
                    />
                  </label>
                  <label className="text-[12px]">
                    <span className="mb-1 block text-[#6a7280]">Email</span>
                    <input
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      className="h-9 w-full rounded-lg border border-[#ddd7cc] bg-white px-2.5 outline-none"
                    />
                  </label>
                  <label className="text-[12px]">
                    <span className="mb-1 block text-[#6a7280]">City</span>
                    <input
                      value={form.city}
                      onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                      className="h-9 w-full rounded-lg border border-[#ddd7cc] bg-white px-2.5 outline-none"
                    />
                  </label>
                  <label className="text-[12px]">
                    <span className="mb-1 block text-[#6a7280]">Work Platform</span>
                    <input
                      value={form.workPlatform}
                      onChange={(e) => setForm((p) => ({ ...p, workPlatform: e.target.value }))}
                      className="h-9 w-full rounded-lg border border-[#ddd7cc] bg-white px-2.5 outline-none"
                    />
                  </label>
                  <label className="text-[12px]">
                    <span className="mb-1 block text-[#6a7280]">Phone</span>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      className="h-9 w-full rounded-lg border border-[#ddd7cc] bg-white px-2.5 outline-none"
                    />
                  </label>
                  <label className="text-[12px]">
                    <span className="mb-1 block text-[#6a7280]">Daily Income</span>
                    <input
                      type="number"
                      value={form.dailyIncome}
                      onChange={(e) => setForm((p) => ({ ...p, dailyIncome: e.target.value }))}
                      className="h-9 w-full rounded-lg border border-[#ddd7cc] bg-white px-2.5 outline-none"
                    />
                  </label>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="flex items-center gap-2 rounded-lg border border-[#e1dbcf] bg-white px-3 py-2 text-[12px]">
                    <input
                      type="checkbox"
                      checked={form.profileCompleted}
                      onChange={(e) => setForm((p) => ({ ...p, profileCompleted: e.target.checked }))}
                    />
                    Profile Completed
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-[#e1dbcf] bg-white px-3 py-2 text-[12px]">
                    <input
                      type="checkbox"
                      checked={form.needsInitialPlanChoice}
                      onChange={(e) => setForm((p) => ({ ...p, needsInitialPlanChoice: e.target.checked }))}
                    />
                    Needs Initial Plan
                  </label>
                  <label className="rounded-lg border border-[#e1dbcf] bg-white px-3 py-2 text-[12px]">
                    <span className="mb-1 block text-[#6a7280]">Subscription</span>
                    <select
                      value={form.subscriptionStatus}
                      onChange={(e) => setForm((p) => ({ ...p, subscriptionStatus: e.target.value }))}
                      className="w-full bg-transparent outline-none"
                    >
                      <option value="none">none</option>
                      <option value="active">active</option>
                      <option value="expired">expired</option>
                    </select>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saveBusy}
                    className="h-9 rounded-lg bg-[#c9a227] px-3 text-[12px] font-semibold text-[#22262e] disabled:opacity-60"
                  >
                    {saveBusy ? 'Saving...' : 'Save User Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetClaims}
                    disabled={resetBusy}
                    className="h-9 rounded-lg border border-[#cda9a9] bg-white px-3 text-[12px] font-semibold text-[#8b3d3d] disabled:opacity-60"
                  >
                    {resetBusy ? 'Resetting...' : 'Reset User Claims'}
                  </button>
                  {actionMsg ? <p className="text-[12px] text-[#5d6674]">{actionMsg}</p> : null}
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-[#e1dbcf] bg-white p-3">
                    <p className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#334055]">
                      <Shield className="h-4 w-4" />
                      Claims History
                    </p>
                    <div className="max-h-[220px] space-y-2 overflow-auto pr-1">
                      {(selectedUser.claims || []).length === 0 ? (
                        <p className="text-[12px] text-[#707988]">No claims recorded.</p>
                      ) : (
                        selectedUser.claims.map((c) => (
                          <div key={c.id || `${c.createdAt}-${c.amount}`} className="rounded-lg border border-[#ece7db] p-2">
                            <p className="text-[12px] font-semibold text-[#2f3744]">{c.triggerLabel || c.trigger || 'Claim'}</p>
                            <p className="text-[11px] text-[#6a7381]">
                              ₹{Number(c.amount || 0)} · {c.status || 'unknown'}
                            </p>
                            <p className="text-[11px] text-[#8a92a0]">{c.createdAt ? new Date(c.createdAt).toLocaleString() : '-'}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#e1dbcf] bg-white p-3">
                    <p className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#334055]">
                      <WalletCards className="h-4 w-4" />
                      Payment History
                    </p>
                    <div className="max-h-[220px] space-y-2 overflow-auto pr-1">
                      {(selectedUser.payments || []).length === 0 ? (
                        <p className="text-[12px] text-[#707988]">No payments recorded.</p>
                      ) : (
                        selectedUser.payments.map((p) => (
                          <div
                            key={p.razorpayPaymentId || p.razorpayOrderId || `${p.paidAt}-${p.amount}`}
                            className="rounded-lg border border-[#ece7db] p-2"
                          >
                            <p className="text-[12px] font-semibold text-[#2f3744]">
                              ₹{Number(p.amount || 0)} · {p.tier || 'N/A'} · {p.status || 'captured'}
                            </p>
                            <p className="break-all text-[11px] text-[#6a7381]">
                              Payment: {p.razorpayPaymentId || '-'}
                            </p>
                            <p className="text-[11px] text-[#8a92a0]">{p.paidAt ? new Date(p.paidAt).toLocaleString() : '-'}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-[#6b7483]">No user data available.</p>
            )}
          </article>
        </section>

        <footer className="mt-6 rounded-xl border border-[#e8e2d7] bg-[#f8f6f1] px-4 py-3 text-[12px] text-[#6b7483]">
          <p className="inline-flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5" />
            Admin can review hashed credentials, claims, payments, subscriptions, and update user account fields.
          </p>
        </footer>
      </main>
    </div>
  )
}

export default AdminDashboardPage
