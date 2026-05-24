import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'

type CurrentUser = {
  userId: number
  tenantId: string | null
  tenantName: string | null
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

type SubmissionResponse = {
  submissionId: number
  questionnaireId: number
  tenantId: string
  userId: number
  answerJson: string
}

type AnswerErrors = Record<string, string>

type SubmissionAnswer = {
  key: string
  value: string
}

type SubmissionDetail = {
  submissionId: number
  questionnaireId: number
  userId: number
  answers: SubmissionAnswer[]
}

type GapProfileResponse = {
  id: number
  participantId: number
  questionnaireId: number
  tenantId: string
  observedLevel: number
  targetLevel: number
  gapValue: number
  gapCategory: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
}

type AppView = 'login' | 'home' | 'questionnaire' | 'submissions' | 'gapProfiles'

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
  const [loadingQuestionnaire, setLoadingQuestionnaire] = useState(false)
  const [openingQuestionnaireId, setOpeningQuestionnaireId] = useState<number | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([])
  const [answerErrors, setAnswerErrors] = useState<AnswerErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [allSubmissions, setAllSubmissions] = useState<SubmissionDetail[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [gapProfiles, setGapProfiles] = useState<GapProfileResponse[]>([])
  const [loadingGapProfiles, setLoadingGapProfiles] = useState(false)

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

  async function apiWithBody<T>(path: string, email: string, method: string, body: unknown): Promise<T> {
    const response = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-User': email,
      },
      body: JSON.stringify(body),
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
      const [user, availableQuestionnaires, userSubmissions] = await Promise.all([
        api<CurrentUser>('/api/auth/me-safe', debugUser),
        api<QuestionnaireResponse[]>('/api/questionnaire', debugUser),
        api<SubmissionResponse[]>('/api/me/submissions', debugUser),
      ])

      setSubmissions(userSubmissions)
      setCurrentUser(user)
      setQuestionnaires(availableQuestionnaires)
      setSelectedQuestionnaire(null)
      setAnswers({})
      setAnswerErrors({})
      setSubmitError(null)
      setQuestionSearch('')
      setView('home')
    } catch (err) {
      setCurrentUser(null)
      setQuestionnaires([])
      setSelectedQuestionnaire(null)
      setAnswers({})
      setAnswerErrors({})
      setSubmitError(null)
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
    setSubmissions([])
    setAnswerErrors({})
    setSubmitError(null)
    setAllSubmissions([])
    setGapProfiles([])
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

  async function openQuestionnaire(questionnaire: QuestionnaireResponse) {
    setLoadingQuestionnaire(true)
    setOpeningQuestionnaireId(questionnaire.id)
    setError(null)
    setSubmitError(null)

    try {
      const questionnaireDetails = await api<QuestionnaireResponse>(
        `/api/questionnaire/${questionnaire.id}`,
        debugUser,
      )

      setSelectedQuestionnaire(questionnaireDetails)
      setAnswers({})
      setAnswerErrors({})
      setView('questionnaire')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoadingQuestionnaire(false)
      setOpeningQuestionnaireId(null)
    }
  }

  async function viewSubmissions(questionnaire: QuestionnaireResponse) {
    setLoadingSubmissions(true)
    setError(null)
    setSelectedQuestionnaire(questionnaire)

    try {
      const submissionResponses = await api<SubmissionResponse[]>(
        `/api/questionnaire/${questionnaire.id}/submission`,
        debugUser,
      )

      const detailedSubmissions: SubmissionDetail[] = submissionResponses.map((submission) => {
        try {
          const parsed = JSON.parse(submission.answerJson) as { answers?: SubmissionAnswer[] }
          return {
            submissionId: submission.submissionId,
            questionnaireId: submission.questionnaireId,
            userId: submission.userId,
            answers: parsed.answers ?? [],
          }
        } catch {
          return {
            submissionId: submission.submissionId,
            questionnaireId: submission.questionnaireId,
            userId: submission.userId,
            answers: [],
          }
        }
      })

      setAllSubmissions(detailedSubmissions)
      setView('submissions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoadingSubmissions(false)
    }
  }

  function viewOwnSubmission(questionnaire: QuestionnaireResponse) {
    const ownSubmission = submissions.find(
      (submission) => submission.questionnaireId === questionnaire.id,
    )

    setError(null)
    setSelectedQuestionnaire(questionnaire)

    if (!ownSubmission) {
      setAllSubmissions([])
      setView('submissions')
      return
    }

    try {
      const parsed = JSON.parse(ownSubmission.answerJson) as { answers?: SubmissionAnswer[] }
      setAllSubmissions([
        {
          submissionId: ownSubmission.submissionId,
          questionnaireId: ownSubmission.questionnaireId,
          userId: ownSubmission.userId,
          answers: parsed.answers ?? [],
        },
      ])
    } catch {
      setAllSubmissions([
        {
          submissionId: ownSubmission.submissionId,
          questionnaireId: ownSubmission.questionnaireId,
          userId: ownSubmission.userId,
          answers: [],
        },
      ])
    }

    setView('submissions')
  }

  async function viewGapProfiles(questionnaire: QuestionnaireResponse, ownProfile = false) {
    setLoadingGapProfiles(true)
    setError(null)
    setSelectedQuestionnaire(questionnaire)

    try {
      if (ownProfile) {
        const ownGapProfile = await api<GapProfileResponse>(
          `/api/questionnaire/${questionnaire.id}/gapprofiles/me`,
          debugUser,
        )
        setGapProfiles([ownGapProfile])
      } else {
        const profileResponses = await api<GapProfileResponse[]>(
          `/api/questionnaire/${questionnaire.id}/gapprofiles`,
          debugUser,
        )
        setGapProfiles(profileResponses)
      }

      setView('gapProfiles')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoadingGapProfiles(false)
    }
  }

  function handleAnswerChange(key: string, event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [key]: value,
    }))

    setAnswerErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      const trimmedValue = value.trim()

      if (!trimmedValue) {
        nextErrors[key] = 'This answer is required.'
      } else if (trimmedValue.length > 255) {
        nextErrors[key] = 'Answer must be 255 characters or fewer.'
      } else {
        delete nextErrors[key]
      }

      return nextErrors
    })
  }

  function validateAnswers(questions: QuestionDefinition[], currentAnswers: Record<string, string>) {
    const errors: AnswerErrors = {}

    for (const question of questions) {
      const value = (currentAnswers[question.key] ?? '').trim()

      if (!value) {
        errors[question.key] = 'This answer is required.'
        continue
      }

      if (value.length > 255) {
        errors[question.key] = 'Answer must be 255 characters or fewer.'
      }
    }

    return errors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedDefinition || !selectedQuestionnaire) {
      return
    }

    const errors = validateAnswers(selectedDefinition.questions, answers)
    setAnswerErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    const payload = {
      answerJson: JSON.stringify({
        answers: selectedDefinition.questions.map((question) => ({
          key: question.key,
          value: (answers[question.key] ?? '').trim(),
        })),
      }),
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const savedSubmission = await apiWithBody<SubmissionResponse>(
        `/api/questionnaire/${selectedQuestionnaire.id}/submission`,
        debugUser,
        'POST',
        payload,
      )

      setSubmissions((currentSubmissions) => [...currentSubmissions, savedSubmission])
      setGapProfiles([])
      setSelectedQuestionnaire(null)
      setAnswers({})
      setAnswerErrors({})
      setView('home')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredQuestionnaires = questionnaires.filter((questionnaire) =>
    questionnaire.title.toLowerCase().includes(questionSearch.trim().toLowerCase()),
  )
  const submittedByQuestionnaireId = new Set(
    submissions.map((submission) => submission.questionnaireId),
  )

  const selectedDefinition = selectedQuestionnaire
    ? parseDefinition(selectedQuestionnaire.definitionJson)
    : null

  const isParticipant = currentUser?.roles.includes('PARTICIPANT') ?? false
  const isManager = currentUser?.roles.includes('MANAGER') ?? false
  const isInstructor = currentUser?.roles.includes('INSTRUCTOR') ?? false

  function formatScore(value: number) {
    return value.toFixed(2)
  }

  function formatCategory(category: GapProfileResponse['gapCategory']) {
    return category.charAt(0) + category.slice(1).toLowerCase()
  }

  function formatDate(value: string) {
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
  }

  function questionTextForKey(key: string) {
    return selectedDefinition?.questions.find((question) => question.key === key)?.text ?? key
  }

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
              <strong>{currentUser.tenantName ?? 'No tenant assigned'}</strong>
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
                <p className="section-label">Workspace</p>
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
                <span>Status</span>
                <span>Actions</span>
              </div>

              {filteredQuestionnaires.length === 0 ? (
                <p className="empty-state">No questionnaires match your search.</p>
              ) : (
                <div className="table-body">
                  {filteredQuestionnaires.map((questionnaire) => (
                    (() => {
                      const isSubmitted = submittedByQuestionnaireId.has(questionnaire.id)
                      const canAnswer = isParticipant && !isSubmitted

                      return (
                        <div key={questionnaire.id} className="table-row">
                          <div>
                            <span className="questionnaire-title">{questionnaire.title}</span>
                          </div>
                          <span className={`submission-badge ${isSubmitted ? 'submission-badge-complete' : ''}`}>
                            {isSubmitted ? 'Submitted' : isParticipant ? 'Not submitted' : 'Available'}
                          </span>
                          <div className="row-actions">
                            {canAnswer ? (
                              <button
                                type="button"
                                className="action-button primary-action"
                                onClick={() => void openQuestionnaire(questionnaire)}
                                disabled={loadingQuestionnaire}
                              >
                                {openingQuestionnaireId === questionnaire.id ? 'Opening...' : 'Start'}
                              </button>
                            ) : null}
                            {isParticipant && isSubmitted ? (
                              <button
                                type="button"
                                className="action-button"
                                onClick={() => viewOwnSubmission(questionnaire)}
                              >
                                View answers
                              </button>
                            ) : null}
                            {isParticipant && isSubmitted ? (
                              <button
                                type="button"
                                className="action-button"
                                onClick={() => void viewGapProfiles(questionnaire, true)}
                                disabled={loadingGapProfiles}
                              >
                                {loadingGapProfiles ? 'Loading...' : 'View gap profile'}
                              </button>
                            ) : null}
                            {isInstructor ? (
                              <button
                                type="button"
                                className="action-button"
                                onClick={() => void viewSubmissions(questionnaire)}
                                disabled={loadingSubmissions}
                              >
                                {loadingSubmissions ? 'Loading...' : 'Submissions'}
                              </button>
                            ) : null}
                            {isManager || isInstructor ? (
                              <button
                                type="button"
                                className="action-button"
                                onClick={() => void viewGapProfiles(questionnaire)}
                                disabled={loadingGapProfiles}
                              >
                                {loadingGapProfiles ? 'Loading...' : 'Gap profiles'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )
                    })()
                  ))}
                </div>
              )}
            </div>

            {error ? <p className="error-banner">{error}</p> : null}
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
              <span>{currentUser.tenantName ?? 'No tenant assigned'}</span>
            </div>
          </header>

          <form className="questionnaire-form" onSubmit={handleSubmit}>
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
                  <div className="question-feedback">
                    <span
                      className={`char-count ${
                        (answers[question.key] ?? '').trim().length > 255 ? 'char-count-over' : ''
                      }`}
                    >
                      {(answers[question.key] ?? '').length}/255
                    </span>
                    {answerErrors[question.key] ? (
                      <span className="field-error">{answerErrors[question.key]}</span>
                    ) : null}
                  </div>
                </label>
              ))
            ) : (
              <p className="empty-state">This questionnaire does not contain any questions.</p>
            )}

            {submitError ? <p className="error-banner">{submitError}</p> : null}

            <div className="form-actions">
              <button type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {view === 'submissions' && currentUser && selectedQuestionnaire ? (
        <section className="submissions-shell">
          <header className="submissions-header">
            <div>
              <button
                type="button"
                className="back-link"
                onClick={() => setView('home')}
              >
                Back to home
              </button>
              <p className="eyebrow">Submissions</p>
              <h1>{selectedQuestionnaire.title}</h1>
            </div>
            <div className="submissions-meta">
              <span>{currentUser.email}</span>
              <span>{currentUser.tenantName ?? 'No tenant assigned'}</span>
            </div>
          </header>

          <section className="submissions-list">
            {allSubmissions.length === 0 ? (
              <p className="empty-state">No submissions for this questionnaire yet.</p>
            ) : (
              <div className="submissions-grid">
                {allSubmissions.map((submission) => (
                  <article key={submission.submissionId} className="submission-card">
                    <h3>
                      {submission.userId === currentUser.userId
                        ? 'Your submission'
                        : `User ID: ${submission.userId}`}
                    </h3>
                    <div className="submission-answers">
                      {submission.answers.length > 0 ? (
                        submission.answers.map((answer) => (
                          <div key={answer.key} className="answer-item">
                            <strong className="answer-key">{questionTextForKey(answer.key)}</strong>
                            <p className="answer-value">{answer.value}</p>
                          </div>
                        ))
                      ) : (
                        <p className="empty-state">No answers recorded for this submission.</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {error ? <p className="error-banner">{error}</p> : null}
          </section>
        </section>
      ) : null}

      {view === 'gapProfiles' && currentUser && selectedQuestionnaire ? (
        <section className="submissions-shell">
          <header className="submissions-header">
            <div>
              <button
                type="button"
                className="back-link"
                onClick={() => setView('home')}
              >
                Back to home
              </button>
              <p className="eyebrow">Gap profiles</p>
              <h1>{selectedQuestionnaire.title}</h1>
            </div>
            <div className="submissions-meta">
              <span>{currentUser.email}</span>
              <span>{currentUser.tenantName ?? 'No tenant assigned'}</span>
            </div>
          </header>

          <section className="submissions-list">
            {gapProfiles.length === 0 ? (
              <p className="empty-state">No gap profiles for this questionnaire yet.</p>
            ) : (
              <div className="profile-table-card">
                <div className="profile-table-head">
                  <span>Participant</span>
                  <span>Observed</span>
                  <span>Target</span>
                  <span>Gap</span>
                  <span>Category</span>
                  <span>Created</span>
                </div>
                <div className="profile-table-body">
                  {gapProfiles.map((profile) => (
                    <div key={profile.id} className="profile-table-row">
                      <span>#{profile.participantId}</span>
                      <span>{formatScore(profile.observedLevel)}</span>
                      <span>{formatScore(profile.targetLevel)}</span>
                      <span>{formatScore(profile.gapValue)}</span>
                      <span>
                        <span className={`gap-category gap-category-${profile.gapCategory.toLowerCase()}`}>
                          {formatCategory(profile.gapCategory)}
                        </span>
                      </span>
                      <span>{formatDate(profile.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error ? <p className="error-banner">{error}</p> : null}
          </section>
        </section>
      ) : null}
    </main>
  )
}

export default App
