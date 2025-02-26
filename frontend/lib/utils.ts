//frontend/lib/utils.ts
// condiitonally applies Tailwind CSS styling + merges/resolves conflicting Tailwind CSS classes
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function convertToNYCDisplay(timestamp: number): number {
    const date = new Date(timestamp * 1000);
    const nyDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const utcDate = new Date(Date.UTC(
        nyDate.getFullYear(),
        nyDate.getMonth(),
        nyDate.getDate(),
        nyDate.getHours(),
        nyDate.getMinutes(),
        nyDate.getSeconds()
    ));
    return Math.floor(utcDate.getTime() / 1000);
}

// Update existing normalizeTime to use the new function
export function normalizeTime(dateStr: string): number {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    return convertToNYCDisplay(Math.floor(date.getTime() / 1000));
}

// Add a helper function for consistent timezone formatting
export function formatChartTime(timestamp: number, interval: Interval): string {
    const date = new Date(timestamp * 1000);
    if (interval.endsWith('m') || interval.endsWith('h')) {
        return date.toLocaleTimeString('en-US', {
            timeZone: 'America/New_York',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }
    return date.toLocaleDateString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        year: interval === '1mo' ? 'numeric' : undefined
    });
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

