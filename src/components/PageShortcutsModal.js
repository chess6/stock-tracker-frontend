import { useEffect } from 'react';
import PageShortcutList from './PageShortcutList';

export default function PageShortcutsModal({
  isOpen,
  onClose,
  pageLabel,
  sections = [],
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title = pageLabel ? `Help — ${pageLabel}` : 'Help';

  return (
    <div className="st-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="st-modal st-modal-help"
        role="dialog"
        aria-modal="true"
        aria-labelledby="page-shortcuts-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="st-modal-header">
          <h2 id="page-shortcuts-modal-title" className="st-modal-title">{title}</h2>
          <button type="button" className="st-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="st-modal-body page-shortcuts-modal-body">
          <p className="page-shortcuts-modal-intro">
            Keyboard shortcuts and controls for this page. Global shortcuts work from anywhere.
          </p>
          <PageShortcutList sections={sections} />
        </div>
        <div className="st-modal-footer">
          <button type="button" className="st-btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
