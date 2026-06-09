import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function StIcon({ icon, className = '', title }) {
  if (!icon) return null;
  return (
    <FontAwesomeIcon
      icon={icon}
      className={`st-icon ${className}`.trim()}
      title={title}
      aria-hidden={title ? undefined : true}
    />
  );
}
