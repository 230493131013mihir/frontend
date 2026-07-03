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
type Employee = {
  id: string
  name: string
  email: string
  department: string
  role: string
  status: 'Active' | 'On Leave' | 'Inactive'
}
type Product = {
  id: string
  name: string
  sku: string
  category: string
  stock: number
  price: number
}
type Invoice = {
  id: string
  customer: string
  amount: number
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue'
  dueDate: string
}
type WorkTask = {
  id: string
  title: string
  owner: string
  priority: 'Low' | 'Medium' | 'High'
  status: 'Todo' | 'In Progress' | 'Done'
}
type User = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  company?: { name: string; domain?: string }
}
type Summary = {
  metrics: Metric[]
  modules: Module[]
  activities: Activity[]
  leads: Lead[]
  employees: Employee[]
  products: Product[]
  invoices: Invoice[]
  tasks: WorkTask[]
}

const API_URL = 'http://localhost:5000'
const navigation = ['Command', 'CRM', 'HR', 'Inventory', 'Finance', 'Tasks', 'AI Desk', 'Reports', 'Settings']

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
  employees: [],
  products: [],
  invoices: [],
  tasks: [],
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
  const [employeeForm, setEmployeeForm] = useState({
    name: 'Riya Patel',
    email: 'riya@acme.example',
    department: 'HR',
    role: 'HR Executive',
    status: 'Active' as Employee['status'],
  })
  const [productForm, setProductForm] = useState({
    name: 'Cloud POS License',
    sku: 'POS-SUB-01',
    category: 'Software',
    stock: 120,
    price: 79,
  })
  const [invoiceForm, setInvoiceForm] = useState({
    customer: 'Metro Foods',
    amount: 24000,
    status: 'Draft' as Invoice['status'],
    dueDate: '2026-07-30',
  })
  const [taskForm, setTaskForm] = useState({
    title: 'Follow up with new CRM lead',
    owner: 'Jane Doe',
    priority: 'High' as WorkTask['priority'],
    status: 'Todo' as WorkTask['status'],
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

  const saveModuleRecord = async <T,>(
    event: FormEvent<HTMLFormElement>,
    path: string,
    payload: T,
    successMessage: string,
  ) => {
    event.preventDefault()
    setLoading(true)
    setMessage('Saving record...')
    try {
      await request(path, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      })
      await loadWorkspace()
      setMessage(successMessage)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save record')
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

        {activeView === 'HR' && (
          <div className="crm-layout">
            <form
              className="panel"
              onSubmit={(event) =>
                saveModuleRecord(event, '/api/v1/workspace/employees', employeeForm, 'Employee saved into HR records.')
              }
            >
              <h2>Add employee</h2>
              <label>
                Name
                <input value={employeeForm.name} onChange={(event) => setEmployeeForm({ ...employeeForm, name: event.target.value })} />
              </label>
              <label>
                Email
                <input value={employeeForm.email} onChange={(event) => setEmployeeForm({ ...employeeForm, email: event.target.value })} />
              </label>
              <div className="two-col">
                <label>
                  Department
                  <input
                    value={employeeForm.department}
                    onChange={(event) => setEmployeeForm({ ...employeeForm, department: event.target.value })}
                  />
                </label>
                <label>
                  Role
                  <input value={employeeForm.role} onChange={(event) => setEmployeeForm({ ...employeeForm, role: event.target.value })} />
                </label>
              </div>
              <label>
                Status
                <select
                  value={employeeForm.status}
                  onChange={(event) => setEmployeeForm({ ...employeeForm, status: event.target.value as Employee['status'] })}
                >
                  <option>Active</option>
                  <option>On Leave</option>
                  <option>Inactive</option>
                </select>
              </label>
              <button className="primary-action" disabled={loading} type="submit">
                Save employee
              </button>
            </form>
            <section className="panel lead-list">
              <h2>Employees</h2>
              {summary.employees.map((employee) => (
                <article key={employee.id}>
                  <div>
                    <strong>{employee.name}</strong>
                    <span>{employee.email}</span>
                  </div>
                  <span>{employee.department}</span>
                  <strong>{employee.status}</strong>
                </article>
              ))}
            </section>
          </div>
        )}

        {activeView === 'Inventory' && (
          <div className="crm-layout">
            <form
              className="panel"
              onSubmit={(event) =>
                saveModuleRecord(event, '/api/v1/workspace/products', productForm, 'Product saved into inventory.')
              }
            >
              <h2>Add product</h2>
              <label>
                Product
                <input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} />
              </label>
              <label>
                SKU
                <input value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} />
              </label>
              <div className="two-col">
                <label>
                  Category
                  <input
                    value={productForm.category}
                    onChange={(event) => setProductForm({ ...productForm, category: event.target.value })}
                  />
                </label>
                <label>
                  Stock
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(event) => setProductForm({ ...productForm, stock: Number(event.target.value) })}
                  />
                </label>
              </div>
              <label>
                Price
                <input
                  type="number"
                  value={productForm.price}
                  onChange={(event) => setProductForm({ ...productForm, price: Number(event.target.value) })}
                />
              </label>
              <button className="primary-action" disabled={loading} type="submit">
                Save product
              </button>
            </form>
            <section className="panel lead-list">
              <h2>Products</h2>
              {summary.products.map((product) => (
                <article key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.sku}</span>
                  </div>
                  <span>{product.stock} units</span>
                  <strong>${product.price.toLocaleString()}</strong>
                </article>
              ))}
            </section>
          </div>
        )}

        {activeView === 'Finance' && (
          <div className="crm-layout">
            <form
              className="panel"
              onSubmit={(event) =>
                saveModuleRecord(event, '/api/v1/workspace/invoices', invoiceForm, 'Invoice saved into finance records.')
              }
            >
              <h2>Create invoice</h2>
              <label>
                Customer
                <input
                  value={invoiceForm.customer}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, customer: event.target.value })}
                />
              </label>
              <div className="two-col">
                <label>
                  Amount
                  <input
                    type="number"
                    value={invoiceForm.amount}
                    onChange={(event) => setInvoiceForm({ ...invoiceForm, amount: Number(event.target.value) })}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={invoiceForm.status}
                    onChange={(event) => setInvoiceForm({ ...invoiceForm, status: event.target.value as Invoice['status'] })}
                  >
                    <option>Draft</option>
                    <option>Sent</option>
                    <option>Paid</option>
                    <option>Overdue</option>
                  </select>
                </label>
              </div>
              <label>
                Due date
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(event) => setInvoiceForm({ ...invoiceForm, dueDate: event.target.value })}
                />
              </label>
              <button className="primary-action" disabled={loading} type="submit">
                Save invoice
              </button>
            </form>
            <section className="panel lead-list">
              <h2>Invoices</h2>
              {summary.invoices.map((invoice) => (
                <article key={invoice.id}>
                  <div>
                    <strong>{invoice.customer}</strong>
                    <span>Due {invoice.dueDate}</span>
                  </div>
                  <span>{invoice.status}</span>
                  <strong>${invoice.amount.toLocaleString()}</strong>
                </article>
              ))}
            </section>
          </div>
        )}

        {activeView === 'Tasks' && (
          <div className="crm-layout">
            <form
              className="panel"
              onSubmit={(event) => saveModuleRecord(event, '/api/v1/workspace/tasks', taskForm, 'Task saved into work queue.')}
            >
              <h2>Create task</h2>
              <label>
                Title
                <input value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} />
              </label>
              <label>
                Owner
                <input value={taskForm.owner} onChange={(event) => setTaskForm({ ...taskForm, owner: event.target.value })} />
              </label>
              <div className="two-col">
                <label>
                  Priority
                  <select
                    value={taskForm.priority}
                    onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value as WorkTask['priority'] })}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </label>
                <label>
                  Status
                  <select
                    value={taskForm.status}
                    onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value as WorkTask['status'] })}
                  >
                    <option>Todo</option>
                    <option>In Progress</option>
                    <option>Done</option>
                  </select>
                </label>
              </div>
              <button className="primary-action" disabled={loading} type="submit">
                Save task
              </button>
            </form>
            <section className="panel lead-list">
              <h2>Tasks</h2>
              {summary.tasks.map((task) => (
                <article key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.owner}</span>
                  </div>
                  <span>{task.priority}</span>
                  <strong>{task.status}</strong>
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
