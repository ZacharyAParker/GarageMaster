import { format, differenceInCalendarDays } from 'date-fns';

export function formatMoney(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
}

export function formatDate(d) {
  if (!d) return '-';
  try { return format(new Date(d), 'MMM d, yyyy'); } catch { return '-'; }
}

export function formatDateTime(d) {
  if (!d) return '-';
  try { return format(new Date(d), 'MMM d, yyyy h:mm a'); } catch { return '-'; }
}

export function timeAgo(d) {
  if (!d) return '';
  try {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  } catch { return ''; }
}

export function daysUntil(d) {
  if (!d) return null;
  try { return differenceInCalendarDays(new Date(d), new Date()); } catch { return null; }
}

export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
}
