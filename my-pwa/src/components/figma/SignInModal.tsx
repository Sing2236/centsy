type SignInModalProps = {
  authLoading: boolean
  authMode: 'login' | 'signup'
  email: string
  error: string
  onClose: () => void
  onForgotPassword: () => void
  onSubmit: () => void
  password: string
  setAuthMode: (mode: 'login' | 'signup') => void
  setEmail: (value: string) => void
  setPassword: (value: string) => void
}

export function SignInModal({
  authLoading,
  authMode,
  email,
  error,
  onClose,
  onForgotPassword,
  onSubmit,
  password,
  setAuthMode,
  setEmail,
  setPassword,
}: SignInModalProps) {
  return (
    <div className="figma-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="figma-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="figma-modal-head">
          <div>
            <span className="figma-pill">Access</span>
            <h3>{authMode === 'signup' ? 'Create account' : 'Sign in'}</h3>
          </div>
          <button className="figma-icon-button" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="figma-mode-toggle">
          <button
            className={authMode === 'login' ? 'figma-primary-button small' : 'figma-secondary-button small'}
            type="button"
            onClick={() => setAuthMode('login')}
          >
            Log in
          </button>
          <button
            className={authMode === 'signup' ? 'figma-primary-button small' : 'figma-secondary-button small'}
            type="button"
            onClick={() => setAuthMode('signup')}
          >
            Sign up
          </button>
        </div>

        <label className="figma-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@email.com"
          />
        </label>

        <label className="figma-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
          />
        </label>

        {error ? <p className="figma-error">{error}</p> : null}

        <div className="figma-modal-actions">
          {authMode === 'login' ? (
            <button className="figma-secondary-button" type="button" onClick={onForgotPassword}>
              Reset password
            </button>
          ) : null}
          <button className="figma-primary-button" type="button" onClick={onSubmit} disabled={authLoading}>
            {authLoading ? 'Working...' : authMode === 'signup' ? 'Create account' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
