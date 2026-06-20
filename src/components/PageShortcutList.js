import { Fragment, memo } from 'react';

function ShortcutKeys({ keys }) {
  const parts = Array.isArray(keys) ? keys : [keys];
  return parts.map((key, index) => (
    <Fragment key={`${key}-${index}`}>
      {index > 0 && <span className="st-shortcut-sep">+</span>}
      <kbd className="st-shortcut-kbd">{key}</kbd>
    </Fragment>
  ));
}

function PageShortcutList({ sections = [] }) {
  if (!sections.length) return null;

  return (
    <div className="page-shortcut-list">
      {sections.map((section) => (
        <div key={section.title || 'default'} className="page-shortcut-section">
          {section.title && (
            <div className="page-shortcut-section-title">{section.title}</div>
          )}
          <ul className="page-shortcut-items">
            {section.items.map((item) => (
              <li key={`${item.keys}-${item.label}`} className="page-shortcut-item">
                <span className="page-shortcut-keys">
                  <ShortcutKeys keys={item.keys} />
                </span>
                <span className="page-shortcut-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default memo(PageShortcutList);
