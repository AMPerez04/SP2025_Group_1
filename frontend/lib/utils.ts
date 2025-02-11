// condiitonally applies Tailwind CSS styling + merges/resolves conflicting Tailwind CSS classes
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeTime(dateStr: string): number {
  if (!dateStr) return 0;
  const utcDate = new Date(dateStr + 'Z');
  const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
  return Math.floor(localDate.getTime() / 1000);
}


export type Period = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'ytd' | 'max';
export type Interval = '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1wk' | '1mo';

export function getYtdIntervals(): Interval[] {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const daysYtd = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));

    if (daysYtd <= 7) {
        return ["1m", "5m", "15m", "30m", "1h", "1d"] as Interval[];
    } else if (daysYtd <= 60) {
        return ["5m", "15m", "30m", "1h", "1d"] as Interval[];
    } else {
        return ["1d", "1wk"] as Interval[];
    }
}

export const periodIntervalMap: Record<Period, readonly Interval[]> = {
    "1d": ["1m", "5m", "15m", "30m", "1h"],
    "5d": ["5m", "15m", "30m", "1h"],
    "1mo": ["1h", "1d"],
    "3mo": ["1d", "1wk"],
    "6mo": ["1d", "1wk"],
    "1y": ["1d", "1wk", "1mo"],
    "2y": ["1wk", "1mo"],
    "5y": ["1wk", "1mo"],
    "10y": ["1mo"],
    "max": ["1mo"],
    get ytd() { return getYtdIntervals(); }
} as const;