import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';
import { THEMES, useTheme } from '../context/ThemeContext';
import useDismissiblePopover from '../hooks/useDismissiblePopover';

export default function ThemeProfileMenu() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const {
    rootRef,
    close,
    onTriggerClick,
    onTriggerDoubleClick,
  } = useDismissiblePopover(open, setOpen);

  return (
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
        </div>
      )}
    </div>
  );
}
