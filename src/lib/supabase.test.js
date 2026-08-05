import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase JS client so fetchCustomerByPhone's real network/RPC calls
// never happen. We only care about how our code talks to the client, not the
// client's own implementation.
const { mockRpc, mockFrom } = vi.hoisted(() => ({
    mockRpc: vi.fn(),
    mockFrom: vi.fn()
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        rpc: mockRpc,
        from: mockFrom
    })
}));

import { fetchCustomerByPhone } from './supabase';

describe('fetchCustomerByPhone', () => {
    beforeEach(() => {
        mockRpc.mockReset();
        mockFrom.mockReset();
    });

    it('returns null for empty/null input without calling the RPC', async () => {
        expect(await fetchCustomerByPhone('')).toBeNull();
        expect(await fetchCustomerByPhone(null)).toBeNull();
        expect(await fetchCustomerByPhone(undefined)).toBeNull();
        expect(mockRpc).not.toHaveBeenCalled();
    });

    it('calls supabase.rpc with customer_identify and the raw phone', async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });
        await fetchCustomerByPhone('0634316902');
        expect(mockRpc).toHaveBeenCalledWith('customer_identify', { p_phone: '0634316902' });
    });

    it('returns the first row when the RPC returns rows', async () => {
        const row = { id: 'abc-123', name: 'Test Klant', phone: '0634316902', address: 'Keizersgracht 1' };
        mockRpc.mockResolvedValue({ data: [row], error: null });
        const result = await fetchCustomerByPhone('0634316902');
        expect(result).toEqual(row);
    });

    it('returns null when the RPC returns an empty array', async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });
        const result = await fetchCustomerByPhone('0600000000');
        expect(result).toBeNull();
    });

    it('returns null and does not throw when the RPC returns an error', async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
        await expect(fetchCustomerByPhone('0634316902')).resolves.toBeNull();
    });

    it('never calls supabase.from("customers") (regression guard for the PII leak)', async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });
        await fetchCustomerByPhone('0634316902');
        expect(mockFrom).not.toHaveBeenCalled();
    });
});
