import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Metric = { label: string; value: string; note: string }
type Module = { name: string; status: string; description: string }
type Activity = { id: string; action: string; details?: string; createdAt: string }
type Lead = {
  id: string
  name: string
  email: string
  stage: 'New' | 'Qualified' | 'Proposal' | 'Won'
  value: number
  owner: string
}
type User = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  company?: { name: string; domain?: string }
}
type Summary = { metrics: Metric[]; modules: Module[]; activities: Activity[]; leads: Lead[] }

const API_URL = 'http://localhost:5000'
const navigation = ['Command', 'CRM', 'AI Desk', 'Reports', 'Settings']

const defaultSummary: Summary = {
  metrics: [
    { label: 'Companies', value: '1', note: 'Local tenant database' },
    { label: 'Users', value: '2', note: 'Seeded demo accounts' },
    { label: 'Pipeline', value: '$128,000', note: 'CRM forecast' },
    { label: 'Audit logs', value: '1', note: 'Security activity' },
  ],
  modules: [
    { name: 'Authentication', status: 'Live', description: 'Register, login, refresh, logout, and /me are connected.' },
    { name: 'CRM', status: 'Live', description: 'Lead creation writes to the local backend database.' },
    { name: 'Database', status: 'Live', description: 'Runs with a generated JSON database file, Docker optional.' },
    { name: 'AI Desk', status: 'Planned', description: 'Chat, reports, invoice summary, and advisor flows come next.' },
  ],
  activities: [],
  leads: [],
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('skillforge-token') ?? '')
  const [user, setUser] = useState<User | null>(null)
  const [summary, setSummary] = useState<Summary>(defaultSummary)
  const [activeView, setActiveView] = useState('Command')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [message, setMessage] = useState('Use the seeded admin account or register a new company.')
  const [loading, setLoading] = useState(false)
  const [leadForm, setLeadForm] = useState({
    name: 'Metro Foods',
    email: 'ops@metrofoods.example',
    stage: 'New' as Lead['stage'],
    value: 24000,
    owner: 'Jane Doe',
  })

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token],
  )

  const request = async <T,>(path: string, options: RequestInit = {}) => {
    let response: Response
    try {
      response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers ?? {}),
        },
        credentials: 'include',
      })
    } catch {
      throw new Error('Backend is not reachable. Start it with: npm run start:server')
    }

    const body = await response.json()
    if (!response.ok) {
      throw new Error(body.message ?? 'Request failed')
    }
    return body.data as T
  }

  const loadWorkspace = async (nextToken = token) => {
    if (!nextToken) return
    const data = await request<Summary>('/api/v1/workspace/summary', {
      headers: { Authorization: `Bearer ${nextToken}` },
    })
    setSummary(data)
  }

  useEffect(() => {
    if (!token) return
    request<{ user: User }>('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => {
        setUser(data.user)
        return loadWorkspace(token)
      })
      .catch(() => {
        localStorage.removeItem('skillforge-token')
        setToken('')
      })
  }, [token])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setLoading(true)
    setMessage('Signing in...')
    try {
      const data = await request<{ user: User; accessToken: string }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      })
      localStorage.setItem('skillforge-token', data.accessToken)
      setToken(data.accessToken)
      setUser(data.user)
      await loadWorkspace(data.accessToken)
      setMessage('Signed in. Dashboard data loaded from backend.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setLoading(true)
    setMessage('Creating company...')
    try {
      await request('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          companyName: form.get('companyName'),
          email: form.get('email'),
          password: form.get('password'),
        }),
      })
      setAuthMode('login')
      setMessage('Company created. Sign in with the same email and password.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleAddLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setMessage('Saving lead...')
    try {
      await request<{ lead: Lead }>('/api/v1/workspace/leads', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(leadForm),
      })
      await loadWorkspace()
      setMessage('Lead saved into the backend local database.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save lead')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    if (token) {
      await fetch(`${API_URL}/api/v1/auth/logout`, { method: 'POST', headers: authHeaders, credentials: 'include' }).catch(
        () => undefined,
      )
    }
    localStorage.removeItem('skillforge-token')
    setToken('')
    setUser(null)
    setMessage('Signed out.')
  }

  if (!user) {
    return (
      <main className="auth-screen">
        <section className="auth-hero">
          <div className="brand-row">
            <span className="brand-mark">SF</span>
            <strong>SkillForge AI</strong>
          </div>
          <h1>Run your business from one intelligent operating layer.</h1>
          <p>
            This runnable Phase 1 includes auth, tenant registration, local database persistence,
            dashboard APIs, CRM leads, audit logs, and a production-shaped project structure.
          </p>
          <div className="proof-grid">
            <span>API connected</span>
            <span>Database included</span>
            <span>CRM writable</span>
            <span>Responsive UI</span>
          </div>
        </section>

        <section className="auth-panel">
          <div className="mode-switch">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')} type="button">
              Login
            </button>
            <button
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => setAuthMode('register')}
              type="button"
            >
              Register
            </button>
          </div>
          {authMode === 'login' ? (
            <form onSubmit={handleLogin}>
              <label>
                Email
                <input name="email" defaultValue="admin@acme.com" />
              </label>
              <label>
                Password
                <input name="password" defaultValue="adminpassword123" type="password" />
              </label>
              <button className="primary-action" disabled={loading} type="submit">
                {loading ? 'Working...' : 'Enter dashboard'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div className="two-col">
                <label>
                  First name
                  <input name="firstName" defaultValue="Mihir" />
                </label>
                <label>
                  Last name
                  <input name="lastName" defaultValue="Jadav" />
                </label>
              </div>
              <label>
                Company
                <input name="companyName" defaultValue="SkillForge Demo" />
              </label>
              <label>
                Email
                <input name="email" defaultValue="owner@skillforge.example" />
              </label>
              <label>
                Password
                <input name="password" defaultValue="password123" type="password" />
              </label>
              <button className="primary-action" disabled={loading} type="submit">
                {loading ? 'Working...' : 'Create company'}
              </button>
            </form>
          )}
          <p className="system-message">{message}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="os-shell">
      <aside className="side-rail">
        <div className="brand-row">
          <span className="brand-mark">SF</span>
          <strong>SkillForge</strong>
        </div>
        <nav>
          {navigation.map((item) => (
            <button className={activeView === item ? 'active' : ''} key={item} onClick={() => setActiveView(item)} type="button">
              {item}
            </button>
          ))}
        </nav>
        <div className="user-card">
          <strong>
            {user.firstName} {user.lastName}
          </strong>
          <span>{user.company?.name}</span>
          <button onClick={logout} type="button">
            Logout
          </button>
        </div>
      </aside>

      <section className="workbench">
        <header className="command-bar">
          <div>
            <span className="eyebrow">Live workspace</span>
            <h1>{activeView}</h1>
          </div>
          <button className="primary-action compact" onClick={() => loadWorkspace()} type="button">
            Refresh API
          </button>
        </header>

        <p className="system-message">{message}</p>

        {activeView === 'Command' && (
          <>
            <div className="metric-grid">
              {summary.metrics.map((metric) => (
                <article className="metric-card" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.note}</small>
                </article>
              ))}
            </div>
            <div className="module-grid">
              {summary.modules.map((item) => (
                <article className="module-card" key={item.name}>
                  <span>{item.status}</span>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </>
        )}

        {activeView === 'CRM' && (
          <div className="crm-layout">
            <form className="panel" onSubmit={handleAddLead}>
              <h2>Add CRM lead</h2>
              <label>
                Lead name
                <input value={leadForm.name} onChange={(event) => setLeadForm({ ...leadForm, name: event.target.value })} />
              </label>
              <label>
                Email
                <input value={leadForm.email} onChange={(event) => setLeadForm({ ...leadForm, email: event.target.value })} />
              </label>
              <div className="two-col">
                <label>
                  Stage
                  <select
                    value={leadForm.stage}
                    onChange={(event) => setLeadForm({ ...leadForm, stage: event.target.value as Lead['stage'] })}
                  >
                    <option>New</option>
                    <option>Qualified</option>
                    <option>Proposal</option>
                    <option>Won</option>
                  </select>
                </label>
                <label>
                  Value
                  <input
                    type="number"
                    value={leadForm.value}
                    onChange={(event) => setLeadForm({ ...leadForm, value: Number(event.target.value) })}
                  />
                </label>
              </div>
              <label>
                Owner
                <input value={leadForm.owner} onChange={(event) => setLeadForm({ ...leadForm, owner: event.target.value })} />
              </label>
              <button className="primary-action" disabled={loading} type="submit">
                Save lead
              </button>
            </form>
            <section className="panel lead-list">
              <h2>Leads from backend database</h2>
              {summary.leads.map((lead) => (
                <article key={lead.id}>
                  <div>
                    <strong>{lead.name}</strong>
                    <span>{lead.email}</span>
                  </div>
                  <span>{lead.stage}</span>
                  <strong>${lead.value.toLocaleString()}</strong>
                </article>
              ))}
            </section>
          </div>
        )}

        {activeView === 'AI Desk' && (
          <section className="panel">
            <h2>AI Desk flow</h2>
            <p>
              Next phase connects OpenAI for business chatbot, report generator, invoice summaries,
              email writing, and meeting summaries. The UI route is ready and protected by auth.
            </p>
          </section>
        )}

        {activeView === 'Reports' && (
          <section className="panel">
            <h2>Audit activity</h2>
            {summary.activities.map((activity) => (
              <article className="activity-row" key={activity.id}>
                <strong>{activity.action}</strong>
                <span>{new Date(activity.createdAt).toLocaleString()}</span>
                <small>{activity.details}</small>
              </article>
            ))}
          </section>
        )}

        {activeView === 'Settings' && (
          <section className="panel">
            <h2>Run status</h2>
            <p>Frontend: Vite on port 5173. Backend: Express on port 5000. Database: server/data/skillforge-db.json.</p>
          </section>
        )}
      </section>
    </main>
  )
}

export default App
