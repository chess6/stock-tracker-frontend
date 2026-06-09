/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: ['selector', '[data-bs-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        st: {
          bg: 'var(--st-body-bg)',
          surface: 'var(--st-surface)',
          'surface-muted': 'var(--st-surface-muted)',
          border: 'var(--st-border)',
          amber: 'var(--st-accent-amber)',
          'amber-dim': 'var(--st-accent-amber-dim)',
          blue: 'var(--st-accent-blue)',
          'blue-dim': 'var(--st-accent-blue-dim)',
          positive: 'var(--st-positive)',
          negative: 'var(--st-negative)',
          muted: 'var(--st-text-muted)',
          subtle: 'var(--st-text-subtle)',
          'grid-header': 'var(--st-grid-header-bg)',
          'grid-group': 'var(--st-grid-group-header-bg)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      boxShadow: {
        'st-panel': '0 1px 2px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.03)',
        'st-panel-light': '0 1px 2px rgba(0, 0, 0, 0.08)',
      },
      fontSize: {
        '2xs': ['0.64rem', { lineHeight: '1.2' }],
        xs: ['0.72rem', { lineHeight: '1.25' }],
        sm: ['0.8125rem', { lineHeight: '1.35' }],
      },
    },
  },
  plugins: [],
};
