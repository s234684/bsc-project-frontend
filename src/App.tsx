import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
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
  definitionJson: string
}

type QuestionDefinition = {
  key: string
  text: string
}

type ParsedDefinition = {
  questions: QuestionDefinition[]
}

type AppView = 'login' | 'home' | 'questionnaire'

const DEFAULT_DEBUG_USER = 'alice@example.com'

function App() {
  const [debugUser, setDebugUser] = useState(DEFAULT_DEBUG_USER)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireResponse[]>([])
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<QuestionnaireResponse | null>(null)
  const [questionSearch, setQuestionSearch] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [view, setView] = useState<AppView>('login')
  const [error, setError] = useState<string | null>(null)
  const [loadingLogin, setLoadingLogin] = useState(false)

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

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoadingLogin(true)
    setError(null)

    try {
      const [user, availableQuestionnaires] = await Promise.all([
        api<CurrentUser>('/api/auth/me-safe', debugUser),
        api<QuestionnaireResponse[]>('/api/questionnaire', debugUser),
      ])

      setCurrentUser(user)
      setQuestionnaires(availableQuestionnaires)
      setSelectedQuestionnaire(null)
      setAnswers({})
      setQuestionSearch('')
      setView('home')
    } catch (err) {
      setCurrentUser(null)
      setQuestionnaires([])
      setSelectedQuestionnaire(null)
      setAnswers({})
      setView('login')
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoadingLogin(false)
    }
  }

  function handleLogout() {
    setCurrentUser(null)
    setQuestionnaires([])
    setSelectedQuestionnaire(null)
    setAnswers({})
    setQuestionSearch('')
    setError(null)
    setView('login')
  }

  function parseDefinition(definitionJson: string): ParsedDefinition {
    try {
      const parsed = JSON.parse(definitionJson) as Partial<ParsedDefinition>

      if (!Array.isArray(parsed.questions)) {
        return { questions: [] }
      }

      return {
        questions: parsed.questions.filter(
          (question): question is QuestionDefinition =>
            typeof question?.key === 'string' && typeof question?.text === 'string',
        ),
      }
    } catch {
      return { questions: [] }
    }
  }

  function openQuestionnaire(questionnaire: QuestionnaireResponse) {
    setSelectedQuestionnaire(questionnaire)
    setAnswers({})
    setView('questionnaire')
  }

  function handleAnswerChange(key: string, event: ChangeEvent<HTMLTextAreaElement>) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [key]: event.target.value,
    }))
  }

  function handleFakeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  const filteredQuestionnaires = questionnaires.filter((questionnaire) =>
    questionnaire.title.toLowerCase().includes(questionSearch.trim().toLowerCase()),
  )

  const selectedDefinition = selectedQuestionnaire
    ? parseDefinition(selectedQuestionnaire.definitionJson)
    : null

  useEffect(() => {
    if (selectedQuestionnaire == null) {
      return
    }

    const refreshedSelection = questionnaires.find(
      (questionnaire) => questionnaire.id === selectedQuestionnaire.id,
    )

    if (refreshedSelection) {
      setSelectedQuestionnaire(refreshedSelection)
    }
  }, [questionnaires, selectedQuestionnaire])

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      {view === 'login' ? (
        <section className="auth-card">
          <div className="auth-copy">
            <p className="eyebrow">Questionnaire Portal</p>
            <h1>Tenant access</h1>
            <p className="lead">
              Sign in with the default mock user to open the tenant workspace and
              review available questionnaires.
            </p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="debug-user">Email</label>
            <input
              id="debug-user"
              name="debug-user"
              type="email"
              value={debugUser}
              onChange={(event) => setDebugUser(event.target.value)}
              placeholder="alice@example.com"
            />

            <button type="submit" disabled={loadingLogin}>
              {loadingLogin ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          {error ? <p className="error-banner">{error}</p> : null}
        </section>
      ) : null}

      {view === 'home' && currentUser ? (
        <section className="dashboard-shell">
          <header className="dashboard-header">
            <div>
              <p className="eyebrow">Account home</p>
              <h1>Welcome back</h1>
            </div>
            <button type="button" className="secondary-button" onClick={handleLogout}>
              Log out
            </button>
          </header>

          <section className="user-summary">
            <article>
              <span className="summary-label">Tenant</span>
              <strong>{currentUser.tenantId ?? 'No tenant assigned'}</strong>
            </article>
            <article>
              <span className="summary-label">Roles</span>
              <strong>{currentUser.roles.length > 0 ? currentUser.roles.join(', ') : 'No roles'}</strong>
            </article>
            <article>
              <span className="summary-label">Email</span>
              <strong>{currentUser.email}</strong>
            </article>
          </section>

          <section className="workspace-card">
            <div className="workspace-head">
              <div>
                <p className="section-label">Accessible submissions</p>
                <h2>Questionnaires</h2>
              </div>
              <input
                className="search-input"
                type="search"
                value={questionSearch}
                onChange={(event) => setQuestionSearch(event.target.value)}
                placeholder="Search questionnaire"
                aria-label="Search questionnaire"
              />
            </div>

            <div className="table-card">
              <div className="table-head">
                <span>Questionnaire</span>
                <span>Submission</span>
              </div>

              {filteredQuestionnaires.length === 0 ? (
                <p className="empty-state">No questionnaires match your search.</p>
              ) : (
                <div className="table-body">
                  {filteredQuestionnaires.map((questionnaire) => (
                    <button
                      key={questionnaire.id}
                      type="button"
                      className="table-row"
                      onClick={() => openQuestionnaire(questionnaire)}
                    >
                      <span className="questionnaire-title">{questionnaire.title}</span>
                      <span className="submission-badge">Not submitted</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </section>
      ) : null}

      {view === 'questionnaire' && currentUser && selectedQuestionnaire ? (
        <section className="questionnaire-shell">
          <header className="questionnaire-header">
            <div>
              <button
                type="button"
                className="back-link"
                onClick={() => setView('home')}
              >
                Back to home
              </button>
              <p className="eyebrow">Questionnaire</p>
              <h1>{selectedQuestionnaire.title}</h1>
            </div>
            <div className="questionnaire-meta">
              <span>{currentUser.email}</span>
              <span>Tenant {currentUser.tenantId ?? 'n/a'}</span>
            </div>
          </header>

          <form className="questionnaire-form" onSubmit={handleFakeSubmit}>
            {selectedDefinition?.questions.length ? (
              selectedDefinition.questions.map((question, index) => (
                <label key={question.key} className="question-card">
                  <span className="question-order">Question {index + 1}</span>
                  <span className="question-text">{question.text}</span>
                  <textarea
                    value={answers[question.key] ?? ''}
                    onChange={(event) => handleAnswerChange(question.key, event)}
                    placeholder="Write your answer here"
                    rows={5}
                  />
                </label>
              ))
            ) : (
              <p className="empty-state">This questionnaire does not contain any questions.</p>
            )}

            <div className="form-actions">
              <button type="submit">Submit</button>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}

export default App
