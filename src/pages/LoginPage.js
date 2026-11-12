import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import StSpinner from '../components/StSpinner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const {
    authRequired, authenticated, status, login, logout,
  } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const returnTo = typeof location.state?.from === 'string' ? location.state.from : '/';

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await login(password);
      showToast('Signed in. You can now make changes.', 'success');
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  let body;
  if (status === 'loading') {
    body = <div className="st-spinner-wrap" aria-live="polite"><StSpinner size="sm" /> Checking session…</div>;
  } else if (!authRequired) {
    body = (
      <div className="st-alert-secondary">
        Sign-in isn&apos;t enabled on this server, so everything is editable.
        {' '}<Link to="/">Back to the portfolio</Link>
      </div>
    );
  } else if (authenticated) {
    body = (
      <>
        <p className="mb-3">You&apos;re signed in as the owner.</p>
        <div className="d-flex gap-2">
          <Link to="/" className="st-btn-primary text-decoration-none">Go to portfolio</Link>
          <button type="button" className="st-btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </>
    );
  } else {
    body = (
      <form onSubmit={onSubmit} noValidate>
        <p className="st-page-subtitle mb-3">
          Visitors can explore everything read-only. Sign in as the owner to edit the
          portfolio, watchlists and screens, or to run admin jobs.
        </p>
        {error && <div className="st-alert-danger mb-3" role="alert">{error}</div>}
        <div className="mb-3">
          <label className="st-label d-block mb-1" htmlFor="ownerPassword">Owner password</label>
          <input
            id="ownerPassword"
            type="password"
            className="st-input w-100"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- the page's only task is entering this field
            autoFocus
            required
          />
        </div>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <button type="submit" className="st-btn-primary" disabled={!password || submitting}>
            {submitting ? <><StSpinner size="sm" /> Signing in…</> : 'Sign in'}
          </button>
          <Link to="/" className="st-btn-ghost text-decoration-none">Continue read-only</Link>
        </div>
      </form>
    );
  }

  return (
    <main className="st-page px-3">
      <section className="st-panel st-narrow-panel">
        <div className="st-panel-header">
          <h1 className="st-page-heading h5 mb-0">Owner sign-in</h1>
        </div>
        <div className="st-panel-body">{body}</div>
      </section>
    </main>
  );
}
