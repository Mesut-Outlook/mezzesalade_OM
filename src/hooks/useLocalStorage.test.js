import { describe, it, expect } from 'vitest';
import { generateId, formatDate, formatCurrency } from './useLocalStorage';

describe('generateId', () => {
    it('returns a non-empty string', () => {
        const id = generateId();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
    });

    it('generates unique IDs on successive calls', () => {
        const ids = new Set(Array.from({ length: 100 }, () => generateId()));
        expect(ids.size).toBe(100);
    });

    it('contains alphanumeric characters', () => {
        const id = generateId();
        expect(id).toMatch(/^[a-z0-9]+$/);
    });
});

describe('formatDate', () => {
    it('formats ISO date string in Turkish locale', () => {
        const result = formatDate('2025-01-15');
        // Turkish locale: weekday, DD.MM.YYYY
        expect(result).toContain('15');
        expect(result).toContain('01');
        expect(result).toContain('2025');
    });

    it('formats date with full weekday name', () => {
        // 2025-01-15 is a Wednesday (Çarşamba in Turkish)
        const result = formatDate('2025-01-15');
        expect(result).toContain('Çarşamba');
    });

    it('handles different date strings', () => {
        const result = formatDate('2025-12-25');
        expect(result).toContain('25');
        expect(result).toContain('12');
        expect(result).toContain('2025');
    });
});

describe('formatCurrency', () => {
    it('formats amount in EUR with Dutch locale', () => {
        const result = formatCurrency(10);
        // nl-NL EUR format: "€ 10,00" (with non-breaking space)
        expect(result).toContain('€');
        expect(result).toContain('10');
    });

    it('formats decimal amounts', () => {
        const result = formatCurrency(8.50);
        expect(result).toContain('€');
        expect(result).toContain('8');
        expect(result).toContain('50');
    });

    it('formats zero', () => {
        const result = formatCurrency(0);
        expect(result).toContain('€');
        expect(result).toContain('0');
    });

    it('formats large amounts with proper grouping', () => {
        const result = formatCurrency(1234.56);
        expect(result).toContain('€');
        expect(result).toContain('1');
        expect(result).toContain('234');
    });

    it('formats negative amounts', () => {
        const result = formatCurrency(-5);
        expect(result).toContain('€');
        expect(result).toContain('5');
    });
});
