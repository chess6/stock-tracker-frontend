import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { THEMES, useTheme } from '../context/ThemeContext';

export default function ThemeProfileMenu() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="st-dropdown theme-profile-dropdown">
      <button
        type="button"
        className="btn btn-link p-0 border-0 theme-profile-toggle"
        aria-label="Profile and appearance settings"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <FontAwesomeIcon icon={faUserCircle} size="lg" />
      </button>
      {open && (
        <div className="st-dropdown-menu theme-profile-menu">
          <div className="dropdown-header">Appearance</div>
          <button
            type="button"
            className={`dropdown-item${theme === THEMES.DARK ? ' active' : ''}`}
            onClick={() => { setTheme(THEMES.DARK); setOpen(false); }}
          >
            Dark
          </button>
          <button
            type="button"
            className={`dropdown-item${theme === THEMES.LIGHT ? ' active' : ''}`}
            onClick={() => { setTheme(THEMES.LIGHT); setOpen(false); }}
          >
            Light
          </button>
        </div>
      )}
    </div>
  );
}
