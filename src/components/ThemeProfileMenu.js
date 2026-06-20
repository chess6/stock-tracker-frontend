import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { THEMES, useTheme } from '../context/ThemeContext';
import { resolvePageShortcuts, buildProfileShortcutSections } from '../config/pageShortcuts';
import useDismissiblePopover from '../hooks/useDismissiblePopover';
import PageShortcutsModal from './PageShortcutsModal';

export default function ThemeProfileMenu() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const {
    rootRef,
    close,
    onTriggerClick,
    onTriggerDoubleClick,
  } = useDismissiblePopover(open, setOpen);

  const pageGuide = useMemo(
    () => resolvePageShortcuts(location.pathname),
    [location.pathname],
  );
  const shortcutSections = useMemo(
    () => buildProfileShortcutSections(location.pathname),
    [location.pathname],
  );

  const openHelp = () => {
    close();
    setHelpOpen(true);
  };

  return (
    <>
      <div ref={rootRef} className="st-dropdown theme-profile-dropdown">
        <button
          type="button"
          className="btn btn-link p-0 border-0 theme-profile-toggle"
          aria-label="Profile and appearance settings"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={onTriggerClick}
          onDoubleClick={onTriggerDoubleClick}
        >
          <FontAwesomeIcon icon={faUserCircle} size="lg" />
        </button>
        {open && (
          <div className="st-dropdown-menu theme-profile-menu">
            <div className="dropdown-header">Appearance</div>
            <button
              type="button"
              className={`dropdown-item${theme === THEMES.DARK ? ' active' : ''}`}
              onClick={() => { setTheme(THEMES.DARK); close(); }}
            >
              Dark
            </button>
            <button
              type="button"
              className={`dropdown-item${theme === THEMES.LIGHT ? ' active' : ''}`}
              onClick={() => { setTheme(THEMES.LIGHT); close(); }}
            >
              Light
            </button>

            <div className="theme-profile-menu-divider" role="separator" />

            <button
              type="button"
              className="dropdown-item"
              onClick={openHelp}
            >
              Help
            </button>
          </div>
        )}
      </div>

      <PageShortcutsModal
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        pageLabel={pageGuide?.pageLabel}
        sections={shortcutSections}
      />
    </>
  );
}
