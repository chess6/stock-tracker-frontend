import { Link, useLocation } from 'react-router-dom';
import StSpinner from './StSpinner';
import { useAuth } from '../context/AuthContext';

/** Renders children for the owner; visitors of a protected server get a sign-in prompt. */
export default function OwnerOnly({ children, title = 'Owner access required' }) {
  const { readOnly, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <main className="st-page px-3">
        <div className="st-spinner-wrap st-narrow-panel" aria-live="polite"><StSpinner size="sm" /> Checking session…</div>
      </main>
    );
  }
  if (!readOnly) return children;

  return (
    <main className="st-page px-3">
      <section className="st-panel st-narrow-panel st-narrow-panel-wide">
        <div className="st-panel-header">
          <h1 className="st-page-heading h5 mb-0">{title}</h1>
        </div>
        <div className="st-panel-body">
          <p className="mb-3">
            This is a read-only demo. Admin tools (data refreshes, ingestion jobs, feature flags)
            are available after the owner signs in.
          </p>
          <div className="d-flex gap-2 flex-wrap">
            <Link to="/login" state={{ from: location.pathname }} className="st-btn-primary text-decoration-none">
              Sign in
            </Link>
            <Link to="/" className="st-btn-ghost text-decoration-none">Back to the portfolio</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
