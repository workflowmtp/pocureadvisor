// ═══════════════════════════════════════════════════════════════
// ProcureAdvisor — Format Utilities
// ═══════════════════════════════════════════════════════════════

export function formatCurrency(amount: number | null | undefined, currency = 'FCFA'): string {
  if (amount == null || isNaN(amount)) return '—';
  const formatted = Math.round(amount).toLocaleString('fr-FR').replace(/,/g, ' ');
  return `${formatted} ${currency}`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin}min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD < 7) return `Il y a ${diffD}j`;
  if (diffD < 30) return `Il y a ${Math.floor(diffD / 7)} sem.`;
  return formatDate(date);
}

export function truncate(str: string | null | undefined, maxLen: number): string {
  if (!str) return '—';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + '…';
}

export function scoreClass(score: number): string {
  if (score >= 80) return 'text-brand-green';
  if (score >= 60) return 'text-brand-blue';
  if (score >= 40) return 'text-brand-orange';
  return 'text-brand-red';
}

export function scoreBgClass(score: number): string {
  if (score >= 80) return 'bg-brand-green-soft text-brand-green';
  if (score >= 60) return 'bg-brand-blue-soft text-brand-blue';
  if (score >= 40) return 'bg-brand-orange-soft text-brand-orange';
  return 'bg-brand-red-soft text-brand-red';
}

export function daysUntil(date: string | Date | null | undefined): number {
  if (!date) return Infinity;
  const d = new Date(date);
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function ageDays(date: string | Date | null | undefined): number {
  if (!date) return 0;
  const d = new Date(date);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
