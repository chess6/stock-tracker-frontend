export default function StSpinner({ size }) {
  return (
    <span
      className={`spinner-border${size === 'sm' ? ' spinner-border-sm' : ''}`}
      role="status"
      aria-hidden="true"
    />
  );
}
