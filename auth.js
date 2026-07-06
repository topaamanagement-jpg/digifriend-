// DigiFriend — shared auth utilities (Supabase v2)
// ─────────────────────────────────────────────────
// 1. Create a free project at https://supabase.com
// 2. Go to Project Settings → API
// 3. Copy "Project URL" and "anon public" key below
// ─────────────────────────────────────────────────
const SUPABASE_URL  = 'https://ciomvjbqilosttyotmcg.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpb212amJxaWxvc3R0eW90bWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NzM1ODAsImV4cCI6MjA5NzU0OTU4MH0.qoksq8dDRKqGgEZiPHbeM-S-cynlOoo1gnq7B6i1bfI'

// Detect unconfigured state — skip all network calls so pages still render locally
const SUPABASE_CONFIGURED = !SUPABASE_URL.startsWith('YOUR_')

const sb = SUPABASE_CONFIGURED
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON)
  : null

// Returns the logged-in user object, or null
async function getUser() {
  if (!SUPABASE_CONFIGURED) return null
  const { data: { user } } = await sb.auth.getUser()
  return user
}

// Call on protected pages — redirects to login if not authenticated
async function requireAuth() {
  if (!SUPABASE_CONFIGURED) return { id: 'demo', email: 'demo@digifriend.com', user_metadata: { first_name: 'Emma', last_name: 'Johnson' } }
  const user = await getUser()
  if (!user) { window.location.href = 'login.html'; return null }
  return user
}

// Call on login/signup — redirects to dashboard if already logged in
async function redirectIfLoggedIn() {
  if (!SUPABASE_CONFIGURED) return
  const user = await getUser()
  if (user) window.location.href = 'dashboard.html'
}

// Sign in with email + password
async function signIn(email, password) {
  return sb.auth.signInWithPassword({ email, password })
}

// Create a new account (meta = { first_name, last_name, ... })
async function signUp(email, password, meta = {}) {
  const emailRedirectTo = (window.location.origin || 'http://localhost:3000') + '/dashboard.html'
  return sb.auth.signUp({ email, password, options: { data: meta, emailRedirectTo } })
}

// Sign out and go to login
async function signOut() {
  if (sb) await sb.auth.signOut()
  window.location.href = 'login.html'
}

// Send password-reset email (link goes to reset.html)
async function requestPasswordReset(email) {
  if (!SUPABASE_CONFIGURED) return { error: { message: 'Supabase not configured yet.' } }
  const redirectTo = (window.location.origin || 'http://localhost:3000') + '/reset.html'
  return sb.auth.resetPasswordForEmail(email, { redirectTo })
}

// Set new password (call this after user arrives from reset email)
async function updatePassword(newPassword) {
  if (!SUPABASE_CONFIGURED) return { error: { message: 'Supabase not configured yet.' } }
  return sb.auth.updateUser({ password: newPassword })
}

// Get all calls for a user, ordered by time
async function getCalls(userId) {
  if (!SUPABASE_CONFIGURED) return []
  const { data } = await sb
    .from('calls')
    .select('*')
    .eq('member_id', userId)
    .order('scheduled_at', { ascending: true })
  return data || []
}
