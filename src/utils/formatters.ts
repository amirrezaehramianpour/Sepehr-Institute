const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number): string {
  const str = String(input);
  return str.replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(Math.round(value));
}

export function formatToman(value: number): string {
  return `${formatNumber(value)} تومان`;
}

export function formatScore(value: number): string {
  return toPersianDigits(value.toFixed(2));
}

export function getTodayJalali(): string {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const y = parts.find((p) => p.type === 'year')?.value ?? '1405';
    const m = parts.find((p) => p.type === 'month')?.value ?? '09';
    const d = parts.find((p) => p.type === 'day')?.value ?? '01';
    return `${y}/${m}/${d}`;
  } catch {
    return '1405/09/01';
  }
}

export function getTodayPersianLabel(): string {
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  } catch {
    return 'یکشنبه ۱ آذر ۱۴۰۵';
  }
}

export const JALALI_MONTH_NAMES: Record<string, string> = {
  '01': 'فروردین',
  '02': 'اردیبهشت',
  '03': 'خرداد',
  '04': 'تیر',
  '05': 'مرداد',
  '06': 'شهریور',
  '07': 'مهر',
  '08': 'آبان',
  '09': 'آذر',
  '10': 'دی',
  '11': 'بهمن',
  '12': 'اسفند',
};

export function getJalaliMonthLabel(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length < 2) return dateStr;
  const year = toPersianDigits(parts[0]);
  const monthName = JALALI_MONTH_NAMES[parts[1]] ?? parts[1];
  return `${monthName} ${year}`;
}

export function getJalaliMonthKey(dateStr: string): string {
  const parts = dateStr.split('/');
  if (parts.length < 2) return '0000/00';
  return `${parts[0]}/${parts[1]}`;
}

export function calculateFinalTuition(
  baseTuition: number,
  discountType: 'none' | 'percent' | 'amount',
  discountValue: number,
): number {
  if (discountType === 'percent') {
    const pct = Math.min(100, Math.max(0, discountValue));
    return Math.max(0, Math.round(baseTuition * (1 - pct / 100)));
  }
  if (discountType === 'amount') {
    return Math.max(0, Math.round(baseTuition - Math.max(0, discountValue)));
  }
  return Math.max(0, Math.round(baseTuition));
}

export function calculateWeightedScore(
  scores: {
    midterm: number;
    finalExam: number;
    practical: number;
    classActivity: number;
  },
  weights: {
    midterm: number;
    finalExam: number;
    practical: number;
    classActivity: number;
  },
): number {
  const totalWeight =
    weights.midterm + weights.finalExam + weights.practical + weights.classActivity;
  if (totalWeight <= 0) return 0;
  const weighted =
    (scores.midterm * weights.midterm +
      scores.finalExam * weights.finalExam +
      scores.practical * weights.practical +
      scores.classActivity * weights.classActivity) /
    totalWeight;
  return Number(Math.min(20, Math.max(0, weighted)).toFixed(2));
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
