import { describe, it, expect } from 'vitest';
import { getThumbnail } from './imageUtils';

describe('getThumbnail', () => {
    it('returns placeholder for empty/null/undefined imageUrl', () => {
        expect(getThumbnail('')).toBe('https://via.placeholder.com/300');
        expect(getThumbnail(null)).toBe('https://via.placeholder.com/300');
        expect(getThumbnail(undefined)).toBe('https://via.placeholder.com/300');
    });

    describe('Supabase URLs', () => {
        const supabaseUrl = 'https://abc.supabase.co/storage/v1/object/public/product-images/photo.jpg';

        it('transforms Supabase public URLs to render/image path', () => {
            const result = getThumbnail(supabaseUrl);
            expect(result).toContain('/render/image/public/');
            expect(result).not.toContain('/object/public/');
        });

        it('appends width, height, resize query params', () => {
            const result = getThumbnail(supabaseUrl);
            expect(result).toContain('?width=300&height=300&resize=cover');
        });

        it('uses custom dimensions', () => {
            const result = getThumbnail(supabaseUrl, { width: 100, height: 200, resize: 'contain' });
            expect(result).toContain('?width=100&height=200&resize=contain');
        });
    });

    describe('Non-Supabase URLs (wsrv.nl proxy)', () => {
        const externalUrl = 'https://example.com/images/product.jpg';

        it('proxies through wsrv.nl', () => {
            const result = getThumbnail(externalUrl);
            expect(result).toContain('https://wsrv.nl/?url=');
        });

        it('encodes the original URL', () => {
            const result = getThumbnail(externalUrl);
            expect(result).toContain(encodeURIComponent(externalUrl));
        });

        it('appends default size params', () => {
            const result = getThumbnail(externalUrl);
            expect(result).toContain('&w=300&h=300');
            expect(result).toContain('&fit=cover');
            expect(result).toContain('&q=80');
        });

        it('uses contain fit when resize is not cover', () => {
            const result = getThumbnail(externalUrl, { width: 150, height: 150, resize: 'contain' });
            expect(result).toContain('&w=150&h=150');
            expect(result).toContain('&fit=contain');
        });

        it('handles WordPress URLs', () => {
            const wpUrl = 'https://mezzesalade.nl/wp-content/uploads/2023/photo.jpg';
            const result = getThumbnail(wpUrl);
            expect(result).toContain('https://wsrv.nl/?url=');
            expect(result).toContain(encodeURIComponent(wpUrl));
        });

        it('handles URLs with special characters', () => {
            const specialUrl = 'https://example.com/path/image name (1).jpg';
            const result = getThumbnail(specialUrl);
            expect(result).toContain('https://wsrv.nl/?url=');
        });
    });
});
