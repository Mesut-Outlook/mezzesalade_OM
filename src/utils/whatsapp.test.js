import { describe, it, expect, vi } from 'vitest';

// Mock the dependency on useLocalStorage formatCurrency and formatDate
vi.mock('../hooks/useLocalStorage', () => ({
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('nl-NL', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    },
    formatDate: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}));

import { generateWhatsAppMessage, generateWhatsAppUrl } from './whatsapp';

describe('generateWhatsAppUrl', () => {
    it('handles +31 Dutch numbers', () => {
        const url = generateWhatsAppUrl('+31612345678', '');
        expect(url).toBe('https://wa.me/31612345678');
    });

    it('handles 0031 Dutch numbers', () => {
        const url = generateWhatsAppUrl('0031612345678', '');
        expect(url).toBe('https://wa.me/31612345678');
    });

    it('handles 06 local Dutch numbers (adds 31 prefix)', () => {
        const url = generateWhatsAppUrl('0612345678', '');
        expect(url).toBe('https://wa.me/31612345678');
    });

    it('handles numbers without leading 0 that start with 6 (assumes Dutch)', () => {
        const url = generateWhatsAppUrl('612345678', '');
        expect(url).toBe('https://wa.me/31612345678');
    });

    it('keeps numbers already starting with 31', () => {
        const url = generateWhatsAppUrl('31612345678', '');
        expect(url).toBe('https://wa.me/31612345678');
    });

    it('keeps numbers starting with 90 (Turkish)', () => {
        const url = generateWhatsAppUrl('905321234567', '');
        expect(url).toBe('https://wa.me/905321234567');
    });

    it('handles +90 Turkish numbers', () => {
        const url = generateWhatsAppUrl('+905321234567', '');
        expect(url).toBe('https://wa.me/905321234567');
    });

    it('strips non-digit characters from phone', () => {
        const url = generateWhatsAppUrl('+31 6-1234 5678', '');
        expect(url).toBe('https://wa.me/31612345678');
    });

    it('appends message as encoded query param', () => {
        const url = generateWhatsAppUrl('+31612345678', 'Hello World');
        expect(url).toBe('https://wa.me/31612345678?text=Hello%20World');
    });

    it('handles empty phone number', () => {
        const url = generateWhatsAppUrl('', 'test');
        expect(url).toBe('https://wa.me/?text=test');
    });

    it('handles null phone number', () => {
        const url = generateWhatsAppUrl(null, '');
        expect(url).toBe('https://wa.me/');
    });

    it('does not append text param when message is empty/falsy', () => {
        const url = generateWhatsAppUrl('+31612345678', '');
        expect(url).not.toContain('?text=');
    });
});

describe('generateWhatsAppMessage', () => {
    const order = {
        id: 'abc123def456',
        date: '2025-01-15',
        notes: '',
        shipping: 0
    };

    const customer = {
        name: 'Test Klant',
        phone: '+31612345678',
        address: ''
    };

    const items = [
        { name: 'Mercimek Çorbası', price: 8, quantity: 2, variation: null },
        { name: 'Baklava', price: 10, quantity: 1, variation: 'Fıstıklı' }
    ];

    it('includes order number from last 6 chars of id', () => {
        const msg = generateWhatsAppMessage(order, customer, items);
        expect(msg).toContain('#DEF456');
    });

    it('includes customer name and phone', () => {
        const msg = generateWhatsAppMessage(order, customer, items);
        expect(msg).toContain('Test Klant');
        expect(msg).toContain('+31612345678');
    });

    it('lists items with quantity and name', () => {
        const msg = generateWhatsAppMessage(order, customer, items);
        expect(msg).toContain('2x Mercimek Çorbası');
        expect(msg).toContain('1x Baklava');
    });

    it('shows variation in parentheses', () => {
        const msg = generateWhatsAppMessage(order, customer, items);
        expect(msg).toContain('(Fıstıklı)');
    });

    it('calculates and shows total', () => {
        const msg = generateWhatsAppMessage(order, customer, items);
        // Total = 2*8 + 1*10 = 26
        expect(msg).toContain('TOPLAM');
    });

    it('includes address when present', () => {
        const customerWithAddr = { ...customer, address: 'Keizersgracht 123' };
        const msg = generateWhatsAppMessage(order, customerWithAddr, items);
        expect(msg).toContain('Keizersgracht 123');
    });

    it('does not include address section when empty', () => {
        const msg = generateWhatsAppMessage(order, customer, items);
        expect(msg).not.toContain('Adres:');
    });

    it('shows shipping when present', () => {
        const orderWithShipping = { ...order, shipping: 8 };
        const msg = generateWhatsAppMessage(orderWithShipping, customer, items);
        expect(msg).toContain('Teslimat Ücreti');
        expect(msg).toContain('Ara Toplam');
    });

    it('does not show shipping when zero', () => {
        const msg = generateWhatsAppMessage(order, customer, items);
        expect(msg).not.toContain('Teslimat Ücreti');
    });

    it('includes notes when present', () => {
        const orderWithNotes = { ...order, notes: 'Gluten-free please' };
        const msg = generateWhatsAppMessage(orderWithNotes, customer, items);
        expect(msg).toContain('Gluten-free please');
    });

    it('extracts delivery time from notes pattern [HH:MM]', () => {
        const orderWithTime = { ...order, notes: '[14:30] Extra info' };
        const msg = generateWhatsAppMessage(orderWithTime, customer, items);
        expect(msg).toContain('14:30');
    });
});
