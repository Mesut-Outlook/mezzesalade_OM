import { describe, it, expect, vi, afterEach } from 'vitest';
import { toDateKey, parseDateKey, todayKey, yesterdayKey, addDays, toDateKeyFrom } from './dateUtils';

// Bu testler timezone'a duyarlıdır: eski toISOString() tabanlı kod UTC'de
// geçip NL'de (UTC+1/+2) bir gün kaydığı için hatalar üretimde gözden kaçmıştı.
describe('toDateKey', () => {
    it('formats a local Date without UTC shifting', () => {
        expect(toDateKey(new Date(2025, 5, 15))).toBe('2025-06-15');
        expect(toDateKey(new Date(2025, 0, 1))).toBe('2025-01-01');
        expect(toDateKey(new Date(2025, 11, 31))).toBe('2025-12-31');
    });

    it('zero-pads month and day', () => {
        expect(toDateKey(new Date(2025, 2, 3))).toBe('2025-03-03');
    });

    it('keeps the calendar day for a local midnight date', () => {
        // toISOString() burada 2025-06-14 üretiyordu.
        const midnight = new Date(2025, 5, 15, 0, 0, 0);
        expect(toDateKey(midnight)).toBe('2025-06-15');
    });

    it('keeps the calendar day just after local midnight', () => {
        expect(toDateKey(new Date(2025, 5, 15, 0, 30))).toBe('2025-06-15');
    });

    it('keeps the calendar day just before local midnight', () => {
        expect(toDateKey(new Date(2025, 5, 15, 23, 59))).toBe('2025-06-15');
    });
});

describe('parseDateKey', () => {
    it('parses YYYY-MM-DD to local midnight, not UTC midnight', () => {
        const date = parseDateKey('2025-06-15');
        expect(date.getFullYear()).toBe(2025);
        expect(date.getMonth()).toBe(5);
        expect(date.getDate()).toBe(15);
        expect(date.getHours()).toBe(0);
    });

    it('round-trips with toDateKey', () => {
        for (const key of ['2025-01-01', '2025-06-15', '2025-12-31', '2024-02-29']) {
            expect(toDateKey(parseDateKey(key))).toBe(key);
        }
    });

    it('falls back to Date parsing for non date-key input', () => {
        const parsed = parseDateKey('2025-06-15T10:30:00Z');
        expect(parsed.getTime()).toBe(new Date('2025-06-15T10:30:00Z').getTime());
    });
});

describe('addDays', () => {
    it('adds and subtracts days', () => {
        expect(addDays('2025-06-15', 1)).toBe('2025-06-16');
        expect(addDays('2025-06-15', -1)).toBe('2025-06-14');
        expect(addDays('2025-06-15', 0)).toBe('2025-06-15');
    });

    it('crosses month and year boundaries', () => {
        expect(addDays('2025-06-30', 1)).toBe('2025-07-01');
        expect(addDays('2025-07-01', -1)).toBe('2025-06-30');
        expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
        expect(addDays('2025-01-01', -1)).toBe('2024-12-31');
    });

    it('handles leap days', () => {
        expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
        expect(addDays('2025-02-28', 1)).toBe('2025-03-01');
    });

    it('does not skip a day across the DST boundary', () => {
        // NL yaz saati 26 Ekim 2025'te bitiyor; eski kod bu günü atlıyordu.
        expect(addDays('2025-10-27', -1)).toBe('2025-10-26');
        expect(addDays('2025-10-26', -1)).toBe('2025-10-25');
        expect(addDays('2025-10-25', 1)).toBe('2025-10-26');
        // Yaz saatinin başladığı gün (30 Mart 2025).
        expect(addDays('2025-03-30', -1)).toBe('2025-03-29');
        expect(addDays('2025-03-29', 1)).toBe('2025-03-30');
        expect(addDays('2025-03-30', 1)).toBe('2025-03-31');
    });
});

describe('todayKey / yesterdayKey', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns the local calendar day just after midnight', () => {
        // Eski kod bu saatte dünün tarihini döndürüyordu.
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2025, 5, 15, 0, 30));
        expect(todayKey()).toBe('2025-06-15');
        expect(yesterdayKey()).toBe('2025-06-14');
    });

    it('returns the local calendar day just before midnight', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2025, 5, 15, 23, 30));
        expect(todayKey()).toBe('2025-06-15');
        expect(yesterdayKey()).toBe('2025-06-14');
    });

    it('yesterday is always one day before today', () => {
        expect(addDays(todayKey(), -1)).toBe(yesterdayKey());
    });
});

describe('toDateKeyFrom', () => {
    it('passes through an existing date key untouched', () => {
        expect(toDateKeyFrom('2025-06-15')).toBe('2025-06-15');
    });

    it('accepts a Date', () => {
        expect(toDateKeyFrom(new Date(2025, 5, 15))).toBe('2025-06-15');
    });

    it('reduces a timestamp to its local calendar day', () => {
        expect(toDateKeyFrom(new Date(2025, 5, 15, 18, 45).toString())).toBe('2025-06-15');
    });
});
