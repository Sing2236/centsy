type AuthDialogProps = {
  androidApkUrl: string
  authLoading: boolean
  authMode: 'login' | 'signup'
  centsyLogo: string
  handleLogin: () => void
  handlePasswordReset: () => void
  loginEmail: string
  loginPassword: string
  onClose: () => void
  setAuthMode: (mode: 'login' | 'signup') => void
  setLoginEmail: (value: string) => void
  setLoginPassword: (value: string) => void
  setShowPassword: (value: boolean | ((prev: boolean) => boolean)) => void
  showPassword: boolean
}

export function AuthDialog({
  androidApkUrl,
  authLoading,
  authMode,
  centsyLogo,
  handleLogin,
  handlePasswordReset,
  loginEmail,
  loginPassword,
  onClose,
  setAuthMode,
  setLoginEmail,
  setLoginPassword,
  setShowPassword,
  showPassword,
}: AuthDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal auth-shell"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="auth-brand-panel">
          <div className="auth-brand-lockup">
            <span className="auth-brand-icon">
              <img src={centsyLogo} alt="Centsy logo" />
            </span>
            <div>
              <h3>Centsy</h3>
              <p>Budget command center for real-life cash flow.</p>
            </div>
          </div>
          <div className="auth-brand-copy">
            <span className="tag">Budgeting system</span>
            <h4>Build the plan, track the month, stay ahead of the next paycheck.</h4>
            <ul className="auth-brand-points">
              <li>Dashboard-style budget visibility based on the shared Figma system.</li>
              <li>Clean access flow with one clear way into your planning workspace.</li>
              <li>Live cash flow, AI insights, and savings actions once you are in.</li>
            </ul>
          </div>
        </div>
        <div className="auth-form-panel">
          <div className="card-head auth-head">
            <div>
              <span className="tag">
                {authMode === 'signup' ? 'Create access' : 'Welcome back'}
              </span>
              <h3>{authMode === 'signup' ? 'Create your account' : 'Login to Centsy'}</h3>
            </div>
            <button className="ghost small" onClick={onClose}>
              Close
            </button>
          </div>
          <p className="muted auth-subtitle">
            {authMode === 'signup'
              ? 'Create your account to save budgets, reminders, and AI guidance.'
              : 'Sign in to continue to your budget workspace.'}
          </p>
          <div className="auth-toggle">
            <button
              className={authMode === 'login' ? 'solid small' : 'ghost small'}
              onClick={() => {
                setAuthMode('login')
                setShowPassword(false)
              }}
              type="button"
            >
              Log in
            </button>
            <button
              className={authMode === 'signup' ? 'solid small' : 'ghost small'}
              onClick={() => {
                setAuthMode('signup')
                setShowPassword(false)
              }}
              type="button"
            >
              Sign up
            </button>
          </div>
          <div className="modal-form">
            <label>
              Email
              <input
                type="email"
                placeholder="you@email.com"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
              />
            </label>
            <label className="auth-password-field">
              <span>Password</span>
              <div className="auth-password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                />
                <button
                  className="ghost small"
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
            {authMode === 'login' ? (
              <div className="auth-aux-row">
                <label className="auth-remember">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <button
                  className="ghost small"
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={authLoading}
                >
                  Forgot password?
                </button>
              </div>
            ) : null}
          </div>
          <button className="solid" onClick={handleLogin} disabled={authLoading}>
            {authLoading
              ? 'Working...'
              : authMode === 'signup'
                ? 'Create account'
                : 'Login'}
          </button>
          <a
            className="auth-apk-link"
            href={androidApkUrl}
            target="_blank"
            rel="noreferrer"
            download="centsy-mobile.apk"
          >
            Download Android APK
          </a>
          {authMode === 'signup' ? (
            <p className="muted">
              You will receive a confirmation email before you can sign in.
            </p>
          ) : (
            <p className="muted auth-register-copy">
              Don&apos;t have an account yet?{' '}
              <button
                type="button"
                className="auth-inline-button"
                onClick={() => setAuthMode('signup')}
              >
                Register here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
