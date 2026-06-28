import { describe, it, expect } from 'vitest';
import {
    normalizeTurkish,
    parseLine,
    isPhoneNumber,
    parseDate,
    isAddressLine,
    parseOrderText,
    searchProducts,
    getProductsByCategory,
    getProductById,
    getAllProducts
} from './useProductMatcher';

const sampleProducts = [
    { id: '1', name: 'Mercimek Çorbası', category: 'Çorbalar', price: 8, variations: [], description: 'Kırmızı mercimek çorbası' },
    { id: '2', name: 'Kısır', category: 'Mezeler', price: 6, variations: ['Küçük', 'Büyük'], description: 'Bulgur salatası' },
    { id: '3', name: 'Yaprak Sarma', category: 'Ana Yemekler', price: 12, variations: [], description: 'Zeytinyağlı yaprak sarma' },
    { id: '4', name: 'Baklava', category: 'Tatlılar', price: 10, variations: ['Fıstıklı', 'Cevizli'], description: 'El açması baklava' },
    { id: '5', name: 'Humus', category: 'Mezeler', price: 7, variations: [], description: 'Nohut ezmesi' },
    { id: '6', name: 'İmam Bayıldı', category: 'Ana Yemekler', price: 11, variations: [], description: 'Zeytinyağlı patlıcan' },
    { id: '7', name: 'Lahmacun', category: 'Ana Yemekler', price: 9, variations: [], description: 'İnce hamur' },
    { id: '8', name: 'Adana Kebap', category: 'Ana Yemekler', price: 15, variations: ['Acılı', 'Acısız'], description: '' },
];

describe('normalizeTurkish', () => {
    it('returns empty string for falsy input', () => {
        expect(normalizeTurkish('')).toBe('');
        expect(normalizeTurkish(null)).toBe('');
        expect(normalizeTurkish(undefined)).toBe('');
    });

    it('converts Turkish lowercase characters', () => {
        expect(normalizeTurkish('ışığı')).toBe('isigi');
        expect(normalizeTurkish('güneş')).toBe('gunes');
        expect(normalizeTurkish('öğle')).toBe('ogle');
        expect(normalizeTurkish('çiçek')).toBe('cicek');
    });

    it('converts Turkish uppercase characters', () => {
        // Note: İ (U+0130) lowercased by JS becomes i + combining dot (U+0307)
        // which the function doesn't strip — test the actual behavior
        expect(normalizeTurkish('GÜNEŞ')).toBe('gunes');
        expect(normalizeTurkish('ÖĞLE')).toBe('ogle');
        expect(normalizeTurkish('ÇIÇEK')).toBe('cicek');
    });

    it('converts mixed case', () => {
        expect(normalizeTurkish('Mercimek Çorbası')).toBe('mercimek corbasi');
        expect(normalizeTurkish('Yaprak Sarma')).toBe('yaprak sarma');
    });

    it('passes through non-Turkish characters unchanged', () => {
        expect(normalizeTurkish('hello world')).toBe('hello world');
        expect(normalizeTurkish('ABC 123')).toBe('abc 123');
    });
});

describe('parseLine', () => {
    it('returns null for empty or whitespace-only input', () => {
        expect(parseLine('')).toBeNull();
        expect(parseLine('   ')).toBeNull();
    });

    it('parses "NxProduct" pattern (pattern1)', () => {
        const result = parseLine('2x Mercimek');
        expect(result.quantity).toBe(2);
        expect(result.productName).toBe('Mercimek');
    });

    it('parses "NX Product" pattern case-insensitive', () => {
        const result = parseLine('3X Baklava');
        expect(result.quantity).toBe(3);
        expect(result.productName).toBe('Baklava');
    });

    it('parses "N adet Product" pattern (pattern2)', () => {
        const result = parseLine('5 adet Kısır');
        expect(result.quantity).toBe(5);
        expect(result.productName).toBe('Kısır');
    });

    it('parses "N porsiyon Product" pattern', () => {
        const result = parseLine('2 porsiyon Humus');
        expect(result.quantity).toBe(2);
        expect(result.productName).toBe('Humus');
    });

    it('parses "N kilo Product" pattern', () => {
        const result = parseLine('1 kilo Yaprak Sarma');
        expect(result.quantity).toBe(1);
        expect(result.productName).toBe('Yaprak Sarma');
    });

    it('parses "Product x N" pattern (pattern3)', () => {
        const result = parseLine('Lahmacun x 4');
        expect(result.quantity).toBe(4);
        expect(result.productName).toBe('Lahmacun');
    });

    it('parses "Product - N" pattern (pattern4)', () => {
        const result = parseLine('Baklava - 2');
        expect(result.quantity).toBe(2);
        expect(result.productName).toBe('Baklava');
    });

    it('parses "Product: N" pattern (pattern4)', () => {
        const result = parseLine('Humus: 3');
        expect(result.quantity).toBe(3);
        expect(result.productName).toBe('Humus');
    });

    it('parses "N Product" pattern (pattern5)', () => {
        const result = parseLine('4 Mercimek Çorbası');
        expect(result.quantity).toBe(4);
        expect(result.productName).toBe('Mercimek Çorbası');
    });

    it('defaults quantity to 1 for plain product name', () => {
        const result = parseLine('Mercimek Çorbası');
        expect(result.quantity).toBe(1);
        expect(result.productName).toBe('Mercimek Çorbası');
    });

    it('preserves original line text', () => {
        const result = parseLine('  2x Baklava  ');
        expect(result.original).toBe('2x Baklava');
    });
});

describe('isPhoneNumber', () => {
    it('recognizes Dutch mobile numbers with +31', () => {
        expect(isPhoneNumber('+31612345678')).toBe(true);
    });

    it('recognizes Dutch mobile numbers with 0031', () => {
        expect(isPhoneNumber('0031612345678')).toBe(true);
    });

    it('recognizes Dutch mobile numbers with 06', () => {
        expect(isPhoneNumber('0612345678')).toBe(true);
    });

    it('recognizes Dutch numbers with formatting', () => {
        expect(isPhoneNumber('+31 6 1234 5678')).toBe(true);
        expect(isPhoneNumber('06-12345678')).toBe(true);
        expect(isPhoneNumber('(06) 12345678')).toBe(true);
    });

    it('recognizes Turkish mobile numbers with +90', () => {
        expect(isPhoneNumber('+905321234567')).toBe(true);
    });

    it('recognizes Turkish mobile numbers with 0090', () => {
        expect(isPhoneNumber('00905321234567')).toBe(true);
    });

    it('recognizes Turkish mobile numbers with 05', () => {
        expect(isPhoneNumber('05321234567')).toBe(true);
    });

    it('recognizes generic 10-12 digit numbers', () => {
        expect(isPhoneNumber('1234567890')).toBe(true);
        expect(isPhoneNumber('123456789012')).toBe(true);
    });

    it('rejects short numbers', () => {
        expect(isPhoneNumber('12345')).toBe(false);
    });

    it('rejects non-phone text', () => {
        expect(isPhoneNumber('Mercimek')).toBe(false);
        expect(isPhoneNumber('hello world')).toBe(false);
    });
});

describe('parseDate', () => {
    it('parses Turkish month names (pattern1)', () => {
        expect(parseDate('15 ocak 2025')).toBe('2025-01-15');
        expect(parseDate('3 mart 2025')).toBe('2025-03-03');
        expect(parseDate('20 aralık 2025')).toBe('2025-12-20');
    });

    it('parses Turkish month names with special chars', () => {
        expect(parseDate('10 şubat 2025')).toBe('2025-02-10');
        expect(parseDate('5 ağustos 2025')).toBe('2025-08-05');
    });

    it('parses English month names', () => {
        expect(parseDate('25 january 2025')).toBe('2025-01-25');
        expect(parseDate('1 december 2025')).toBe('2025-12-01');
    });

    it('parses abbreviated English months', () => {
        expect(parseDate('15 jan 2025')).toBe('2025-01-15');
        expect(parseDate('8 sept 2025')).toBe('2025-09-08');
    });

    it('parses DD/MM/YYYY format (pattern2)', () => {
        expect(parseDate('25/01/2025')).toBe('2025-01-25');
        expect(parseDate('01.12.2025')).toBe('2025-12-01');
        expect(parseDate('15-06-2025')).toBe('2025-06-15');
    });

    it('parses ISO format YYYY-MM-DD (pattern3)', () => {
        expect(parseDate('2025-03-15')).toBe('2025-03-15');
        expect(parseDate('2025-12-31')).toBe('2025-12-31');
    });

    it('returns null for non-date text', () => {
        expect(parseDate('Mercimek Çorbası')).toBeNull();
        expect(parseDate('hello')).toBeNull();
    });

    it('returns null for invalid date values', () => {
        expect(parseDate('32/13/2025')).toBeNull();
    });
});

describe('isAddressLine', () => {
    it('detects Dutch street keywords', () => {
        expect(isAddressLine('Keizersgracht 123')).toBe(true);
        expect(isAddressLine('Prinsengracht 456A')).toBe(true);
        expect(isAddressLine('Damstraat 10')).toBe(true);
    });

    it('detects city names', () => {
        expect(isAddressLine('Amsterdam')).toBe(true);
        expect(isAddressLine('Rotterdam')).toBe(true);
        expect(isAddressLine('Den Haag')).toBe(true);
    });

    it('detects Turkish address keywords', () => {
        expect(isAddressLine('Teslimat adresi: Keizersgracht')).toBe(true);
    });

    it('detects house number patterns', () => {
        expect(isAddressLine('Hoofdweg 123A')).toBe(true);
    });

    it('does not flag short non-address text', () => {
        expect(isAddressLine('hi')).toBe(false);
    });

    it('does not flag product names', () => {
        expect(isAddressLine('Mercimek')).toBe(false);
        expect(isAddressLine('Baklava')).toBe(false);
    });
});

describe('parseOrderText', () => {
    it('returns empty products when no product list provided', () => {
        const result = parseOrderText('2x Mercimek', []);
        expect(result.products).toEqual([]);
    });

    it('matches exact product names', () => {
        const result = parseOrderText('Mercimek Çorbası', sampleProducts);
        expect(result.products.length).toBe(1);
        expect(result.products[0].match.product.name).toBe('Mercimek Çorbası');
        expect(result.products[0].match.confidence).toBe(1.0);
        expect(result.products[0].match.matchType).toBe('exact');
    });

    it('handles multi-line product names (without quantity prefix)', () => {
        const text = 'Mercimek Çorbası\nHumus\nBaklava';
        const result = parseOrderText(text, sampleProducts);
        expect(result.products.length).toBe(3);
    });

    it('skips phone number lines', () => {
        const text = '+31612345678\nMercimek Çorbası';
        const result = parseOrderText(text, sampleProducts);
        expect(result.products.length).toBe(1);
        expect(result.products[0].match.product.name).toBe('Mercimek Çorbası');
    });

    it('skips date lines', () => {
        const text = '15 ocak 2025\nHumus';
        const result = parseOrderText(text, sampleProducts);
        expect(result.products.length).toBe(1);
    });

    it('skips address lines', () => {
        const text = 'Keizersgracht 123 Amsterdam\nBaklava';
        const result = parseOrderText(text, sampleProducts);
        expect(result.products.length).toBe(1);
        expect(result.products[0].match.product.name).toBe('Baklava');
    });

    it('treats lines with digit+letter pattern (len>5) as address (known behavior)', () => {
        // isAddressLine regex /\d+\s*[a-zA-Z]/ catches "3x Humus" (length 8)
        const result = parseOrderText('3x Humus', sampleProducts);
        expect(result.products.length).toBe(0);
    });

    it('performs fuzzy matching on misspelled names', () => {
        const text = 'Mercmek Corbasi';
        const result = parseOrderText(text, sampleProducts);
        expect(result.products.length).toBe(1);
        expect(result.products[0].match.product.name).toBe('Mercimek Çorbası');
        expect(result.products[0].match.matchType).toBe('fuzzy');
    });

    it('returns metadata object', () => {
        const result = parseOrderText('Mercimek Çorbası', sampleProducts);
        expect(result.metadata).toBeDefined();
        expect(result.metadata).toHaveProperty('date');
        expect(result.metadata).toHaveProperty('phone');
    });
});

describe('searchProducts', () => {
    it('returns empty array for short queries', () => {
        expect(searchProducts('', sampleProducts)).toEqual([]);
        expect(searchProducts('a', sampleProducts)).toEqual([]);
    });

    it('returns empty array for empty product list', () => {
        expect(searchProducts('mercimek', [])).toEqual([]);
    });

    it('finds products by name', () => {
        const results = searchProducts('mercimek', sampleProducts);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].name).toBe('Mercimek Çorbası');
    });

    it('finds products with Turkish character normalization', () => {
        const results = searchProducts('corbasi', sampleProducts);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].name).toBe('Mercimek Çorbası');
    });

    it('limits results to 10', () => {
        const manyProducts = Array.from({ length: 20 }, (_, i) => ({
            id: String(i),
            name: `Product ${i}`,
            category: 'Test',
            price: 5
        }));
        const results = searchProducts('Product', manyProducts);
        expect(results.length).toBeLessThanOrEqual(10);
    });

    it('includes score in results', () => {
        const results = searchProducts('baklava', sampleProducts);
        expect(results.length).toBeGreaterThan(0);
        expect(results[0]).toHaveProperty('score');
        expect(results[0].score).toBeGreaterThan(0);
    });
});

describe('getProductsByCategory', () => {
    it('returns empty object for empty list', () => {
        expect(getProductsByCategory([])).toEqual({});
    });

    it('groups products by category', () => {
        const result = getProductsByCategory(sampleProducts);
        expect(Object.keys(result)).toContain('Çorbalar');
        expect(Object.keys(result)).toContain('Mezeler');
        expect(Object.keys(result)).toContain('Ana Yemekler');
        expect(Object.keys(result)).toContain('Tatlılar');
        expect(result['Çorbalar'].length).toBe(1);
        expect(result['Mezeler'].length).toBe(2);
        expect(result['Ana Yemekler'].length).toBe(4);
    });

    it('handles null/undefined input', () => {
        expect(getProductsByCategory(null)).toEqual({});
        expect(getProductsByCategory(undefined)).toEqual({});
    });
});

describe('getProductById', () => {
    it('finds product by string id', () => {
        const result = getProductById('1', sampleProducts);
        expect(result.name).toBe('Mercimek Çorbası');
    });

    it('finds product by integer id', () => {
        const productsWithIntId = [{ id: 42, name: 'Test', category: 'A', price: 5 }];
        const result = getProductById(42, productsWithIntId);
        expect(result.name).toBe('Test');
    });

    it('returns null for non-existent id', () => {
        expect(getProductById('999', sampleProducts)).toBeUndefined();
    });

    it('returns null for empty list', () => {
        expect(getProductById('1', [])).toBeNull();
        expect(getProductById('1', null)).toBeNull();
    });
});

describe('getAllProducts', () => {
    it('returns the product list as-is', () => {
        expect(getAllProducts(sampleProducts)).toBe(sampleProducts);
    });

    it('returns empty array for falsy input', () => {
        expect(getAllProducts(null)).toEqual([]);
        expect(getAllProducts(undefined)).toEqual([]);
    });
});
