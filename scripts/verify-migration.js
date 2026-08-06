/**
 * MIGRATION VERIFICATION SCRIPT
 * Verifies data integrity after migrating from old to new Supabase project:
 *   1. Compares row counts across products, customers, orders, order_items.
 *   2. Performs HTTP HEAD / GET checks on all product image URLs.
 *
 * Environment variables required:
 *   OLD_SUPABASE_URL          (default: https://hvcpjupsxuwfxnyfuyzw.supabase.co)
 *   OLD_SUPABASE_SECRET_KEY   (or OLD_SUPABASE_SERVICE_ROLE_KEY / OLD_SUPABASE_KEY)
 *   NEW_SUPABASE_URL          (default: https://pjtpnwxajocgdseqjfvn.supabase.co)
 *   NEW_SUPABASE_SECRET_KEY   (or NEW_SUPABASE_SERVICE_ROLE_KEY / NEW_SUPABASE_KEY)
 *
 * Usage:
 *   OLD_SUPABASE_SECRET_KEY="..." NEW_SUPABASE_SECRET_KEY="..." node scripts/verify-migration.js
 */

import { createClient } from '@supabase/supabase-js';

const OLD_URL = process.env.OLD_SUPABASE_URL || 'https://hvcpjupsxuwfxnyfuyzw.supabase.co';
const OLD_KEY = process.env.OLD_SUPABASE_SECRET_KEY || process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || process.env.OLD_SUPABASE_KEY;

const NEW_URL = process.env.NEW_SUPABASE_URL || 'https://pjtpnwxajocgdseqjfvn.supabase.co';
const NEW_KEY = process.env.NEW_SUPABASE_SECRET_KEY || process.env.NEW_SUPABASE_SERVICE_ROLE_KEY || process.env.NEW_SUPABASE_KEY;

if (!OLD_KEY || !NEW_KEY) {
    console.error('❌ ERROR: Missing required environment variables.');
    console.error('  Please provide OLD_SUPABASE_SECRET_KEY and NEW_SUPABASE_SECRET_KEY.');
    process.exit(1);
}

const oldClient = createClient(OLD_URL, OLD_KEY);
const newClient = createClient(NEW_URL, NEW_KEY);

function normalizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
}

async function verifyMigration() {
    console.log('🔍 Running Migration Verification...');
    let hasError = false;

    // 1. Table row counts check
    const tables = ['products', 'customers', 'orders', 'order_items'];
    console.log('\n--- 1. Database Row Counts ---');

    for (const table of tables) {
        const { count: oldCount, error: oldErr } = await oldClient.from(table).select('*', { count: 'exact', head: true });
        const { count: newCount, error: newErr } = await newClient.from(table).select('*', { count: 'exact', head: true });

        if (oldErr || newErr) {
            console.error(`❌ Error querying table ${table}: Old (${oldErr?.message}), New (${newErr?.message})`);
            hasError = true;
            continue;
        }

        if (table === 'customers') {
            // Deduplication expected: get unique phone count from old
            const { data: custData } = await oldClient.from('customers').select('phone');
            const uniquePhones = new Set((custData || []).map(c => normalizePhone(c.phone)).filter(Boolean)).size;
            console.log(`  customers   : Old Total = ${oldCount} | Old Unique Phones = ${uniquePhones} | New Total = ${newCount}`);
            if (newCount !== uniquePhones) {
                // Uyarı değil hata: müşteri sayısı tutmuyorsa ya kayıp var ya
                // mükerrer. İkisi de taşımanın tekrar edilmesini gerektirir.
                console.error(`  ❌ Customer count (${newCount}) differs from expected unique phones count (${uniquePhones}).`);
                hasError = true;
            } else {
                console.log(`  ✅ customers match unique count!`);
            }
        } else {
            console.log(`  ${table.padEnd(12)}: Old = ${oldCount} | New = ${newCount}`);
            if (oldCount !== newCount) {
                console.error(`  ❌ Mismatch in table ${table}!`);
                hasError = true;
            } else {
                console.log(`  ✅ ${table} row counts match exactly.`);
            }
        }
    }

    // 2. Storage & Product Image HTTP 200 checks
    console.log('\n--- 2. Product Image HTTP 200 Verification ---');
    const { data: newProducts, error: prodErr } = await newClient.from('products').select('id, name, image');
    if (prodErr) {
        console.error(`❌ Failed to fetch products from new database: ${prodErr.message}`);
        hasError = true;
    } else {
        const imageUrls = (newProducts || []).map(p => p.image).filter(Boolean);
        console.log(`  Testing ${imageUrls.length} product image URLs for HTTP 200...`);
        let passed = 0;
        let failed = 0;

        for (const url of imageUrls) {
            try {
                const res = await fetch(url, { method: 'HEAD' });
                if (res.status === 200) {
                    passed++;
                } else {
                    console.error(`  ❌ Image failed (HTTP ${res.status}): ${url}`);
                    failed++;
                    hasError = true;
                }
            } catch (e) {
                console.error(`  ❌ Image network request error: ${url} (${e.message})`);
                failed++;
                hasError = true;
            }
        }
        console.log(`  Image verification complete: ${passed} passed (HTTP 200), ${failed} failed.`);
    }

    if (hasError) {
        console.error('\n❌ VERIFICATION FAILED: Issues were detected during verification.');
        process.exit(1);
    } else {
        console.log('\n🎉 ALL VERIFICATIONS PASSED CLEANLY!');
    }
}

verifyMigration().catch(err => {
    console.error('❌ Verification script crashed:', err);
    process.exit(1);
});
