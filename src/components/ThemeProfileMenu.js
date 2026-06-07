import { useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { THEMES, useTheme } from '../context/ThemeContext';

export default function ThemeProfileMenu() {
  const { theme, setTheme, isDark } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Dropdown isOpen={open} toggle={() => setOpen((value) => !value)} direction="down">
      <DropdownToggle
        tag="button"
        className={`btn btn-link p-0 border-0 theme-profile-toggle ${isDark ? 'text-light' : 'text-dark'}`}
        aria-label="Profile and appearance settings"
      >
        <FontAwesomeIcon icon={faUserCircle} size="lg" />
      </DropdownToggle>
      <DropdownMenu end className="theme-profile-menu">
        <DropdownItem header>Appearance</DropdownItem>
        <DropdownItem
          active={theme === THEMES.DARK}
          onClick={() => setTheme(THEMES.DARK)}
        >
          Dark
        </DropdownItem>
        <DropdownItem
          active={theme === THEMES.LIGHT}
          onClick={() => setTheme(THEMES.LIGHT)}
        >
          Light
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
