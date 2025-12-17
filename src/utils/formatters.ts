/**
 * Trading formatters for price, quantity, time, and P&L display.
 */

/**
 * Format a price value with optional decimal places.
 * Handles crypto (8 decimals) and equity (2 decimals) formatting.
 */
export function formatPrice(value: number, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a quantity value with optional decimal places.
 * Large quantities get comma separators.
 */
export function formatQuantity(value: number, decimals: number = 0): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a timestamp to time string.
 */
export function formatTime(timestamp: number, format: 'HH:mm:ss' | 'HH:mm:ss.SSS' = 'HH:mm:ss'): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  if (format === 'HH:mm:ss.SSS') {
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format P&L value with sign and color class.
 */
export function formatPnL(value: number, decimals: number = 2): { text: string; className: string } {
  if (value === null || value === undefined || isNaN(value)) {
    return { text: '—', className: '' };
  }

  const sign = value >= 0 ? '+' : '';
  const text = `${sign}${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

  const className = value > 0 ? 'positive' : value < 0 ? 'negative' : '';

  return { text, className };
}

/**
 * Format percentage with sign.
 */
export function formatPercent(value: number, decimals: number = 2): { text: string; className: string } {
  if (value === null || value === undefined || isNaN(value)) {
    return { text: '—', className: '' };
  }

  const sign = value >= 0 ? '+' : '';
  const text = `${sign}${value.toFixed(decimals)}%`;
  const className = value > 0 ? 'positive' : value < 0 ? 'negative' : '';

  return { text, className };
}

/**
 * Format large numbers with K/M/B suffix.
 */
export function formatCompact(value: number, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(decimals)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(decimals)}K`;
  }

  return value.toFixed(decimals);
}
