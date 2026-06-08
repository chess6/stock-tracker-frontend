import { marginHeatStyle, piotroskiHeatStyle, altmanZHeatStyle } from './heatMap';

export { marginHeatStyle, piotroskiHeatStyle, altmanZHeatStyle };

function isDarkTheme() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-bs-theme') === 'dark';
}

export function beneishHeatStyle(value) {
  if (value == null || Number.isNaN(Number(value))) return {};
  const num = Number(value);
  const dark = isDarkTheme();
  if (num > -1.78) {
    return {
      backgroundColor: 'rgba(220, 53, 69, 0.35)',
      color: dark ? '#f8c2c8' : '#842029',
      fontVariantNumeric: 'tabular-nums',
    };
  }
  return {
    backgroundColor: 'rgba(40, 167, 69, 0.18)',
    color: dark ? '#c8f5d8' : '#155724',
    fontVariantNumeric: 'tabular-nums',
  };
}

export function survivabilityHeatStyle(value) {
  if (value == null || Number.isNaN(Number(value))) return {};
  const num = Number(value);
  const dark = isDarkTheme();
  if (num >= 75) {
    return {
      backgroundColor: 'rgba(40, 167, 69, 0.45)',
      color: dark ? '#d4f8e0' : '#0f4419',
      fontVariantNumeric: 'tabular-nums',
    };
  }
  if (num >= 55) {
    return {
      backgroundColor: 'rgba(40, 167, 69, 0.22)',
      color: dark ? '#c8f5d8' : '#155724',
      fontVariantNumeric: 'tabular-nums',
    };
  }
  if (num >= 35) {
    return {
      backgroundColor: 'rgba(255, 193, 7, 0.28)',
      color: dark ? '#fff3cd' : '#664d03',
      fontVariantNumeric: 'tabular-nums',
    };
  }
  if (num >= 20) {
    return {
      backgroundColor: 'rgba(255, 152, 0, 0.32)',
      color: dark ? '#ffe8cc' : '#653208',
      fontVariantNumeric: 'tabular-nums',
    };
  }
  return {
    backgroundColor: 'rgba(220, 53, 69, 0.35)',
    color: dark ? '#f8c2c8' : '#842029',
    fontVariantNumeric: 'tabular-nums',
  };
}
