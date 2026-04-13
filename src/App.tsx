import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type CurrentUser = {
  userId: number
  tenantId: string | null
  email: string
  roles: string[]
}

type QuestionnaireResponse = {
  id: number
  title: string
  tenantId: string
  creatorId: number | null
}

const DEFAULT_DEBUG_USER = 'alice@example.com'

function App() {
  const [debugUser, setDebugUser] = useState(DEFAULT_DEBUG_USER)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingUser, setLoadingUser] = useState(false)
  const [loadingQuestionnaires, setLoadingQuestionnaires] = useState(false)

  async function api<T>(path: string, email: string): Promise<T> {
    const response = await fetch(path, {
      headers: {
        'X-Debug-User': email,
      },
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(message || `Request failed for ${path}`)
    }

    return response.json() as Promise<T>
  }

  async function loadCurrentUser(email: string) {
    setLoadingUser(true)
    setError(null)

    try {
      const data = await api<CurrentUser>('/api/auth/me-safe', email)
      setCurrentUser(data)
    } catch (err) {
      setCurrentUser(null)
      setQuestionnaires([])
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoadingUser(false)
    }
  }

  async function loadQuestionnaires(email: string) {
    setLoadingQuestionnaires(true)
    setError(null)

    try {
      const data = await api<QuestionnaireResponse[]>('/api/questionnaire', email)
      setQuestionnaires(data)
    } catch (err) {
      setQuestionnaires([])
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoadingQuestionnaires(false)
    }
  }

  useEffect(() => {
    void loadCurrentUser(DEFAULT_DEBUG_USER)
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void loadCurrentUser(debugUser)
  }

  function handleLoadQuestionnaires() {
    void loadQuestionnaires(debugUser)
  }

  return (
    <main className="app-shell">
      <section className="panel">
        <p className="eyebrow">Mock auth + questionnaire slice</p>
        <h1>Backend identity check</h1>
        <p className="lead">
          This screen sends an <code>X-Debug-User</code> header to the backend,
          verifies the current user, and then loads tenant-scoped questionnaires
          through the same mock identity.
        </p>

        <form className="debug-form" onSubmit={handleSubmit}>
          <label htmlFor="debug-user">Debug user email</label>
          <div className="row">
            <input
              id="debug-user"
              name="debug-user"
              type="email"
              value={debugUser}
              onChange={(event) => setDebugUser(event.target.value)}
              placeholder="alice@example.com"
            />
            <button type="submit" disabled={loadingUser}>
              {loadingUser ? 'Loading user...' : 'Load current user'}
            </button>
          </div>
        </form>

        <div className="status-grid">
          <article className="card">
            <h2>Auth request</h2>
            <p>
              <code>GET /api/auth/me-safe</code>
            </p>
          </article>
          <article className="card">
            <h2>Header used</h2>
            <p>
              <code>X-Debug-User: {debugUser || '(empty)'}</code>
            </p>
          </article>
        </div>

        {error ? (
          <section className="result error">
            <h2>Backend response</h2>
            <p>{error}</p>
          </section>
        ) : (
          <section className="result">
            <h2>Resolved current user</h2>
            <pre>{currentUser ? JSON.stringify(currentUser, null, 2) : 'No user loaded yet.'}</pre>
          </section>
        )}

        <section className="result questionnaires">
          <div className="section-heading">
            <h2>Tenant questionnaires</h2>
            <button
              type="button"
              onClick={handleLoadQuestionnaires}
              disabled={loadingQuestionnaires || !currentUser}
            >
              {loadingQuestionnaires ? 'Loading...' : 'Load questionnaires'}
            </button>
          </div>

          {questionnaires.length === 0 ? (
            <p>No questionnaires loaded yet.</p>
          ) : (
            <ul className="questionnaire-list">
              {questionnaires.map((questionnaire) => (
                <li key={questionnaire.id}>
                  <strong>{questionnaire.title}</strong>
                  <span>Id: {questionnaire.id}</span>
                  <span>Tenant: {questionnaire.tenantId}</span>
                  <span>Creator: {questionnaire.creatorId ?? 'None'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
