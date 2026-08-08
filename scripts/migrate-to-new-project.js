/**
 * DATA & STORAGE MIGRATION SCRIPT
 * Migrates 4 tables (products, customers, orders, order_items) and storage images
 * from old Supabase project to new Supabase project.
 *
 * Environment variables required:
 *   OLD_SUPABASE_URL          (e.g., https://hvcpjupsxuwfxnyfuyzw.supabase.co)
 *   OLD_SUPABASE_SECRET_KEY   (or OLD_SUPABASE_SERVICE_ROLE_KEY / OLD_SUPABASE_KEY)
 *   NEW_SUPABASE_URL          (e.g., https://pjtpnwxajocgdseqjfvn.supabase.co)
 *   NEW_SUPABASE_SECRET_KEY   (or NEW_SUPABASE_SERVICE_ROLE_KEY / NEW_SUPABASE_KEY)
 *
 * Usage:
 *   OLD_SUPABASE_SECRET_KEY="..." NEW_SUPABASE_SECRET_KEY="..." node scripts/migrate-to-new-project.js [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';

const OLD_URL = process.env.OLD_SUPABASE_URL || 'https://hvcpjupsxuwfxnyfuyzw.supabase.co';
const OLD_KEY = process.env.OLD_SUPABASE_SECRET_KEY || process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || process.env.OLD_SUPABASE_KEY;

const NEW_URL = process.env.NEW_SUPABASE_URL || 'https://pjtpnwxajocgdseqjfvn.supabase.co';
const NEW_KEY = process.env.NEW_SUPABASE_SECRET_KEY || process.env.NEW_SUPABASE_SERVICE_ROLE_KEY || process.env.NEW_SUPABASE_KEY;

const DRY_RUN = process.argv.includes('--dry-run');

if (!OLD_KEY || !NEW_KEY) {
    console.error('❌ ERROR: Missing required environment variables.');
    console.error('  Please provide OLD_SUPABASE_SECRET_KEY and NEW_SUPABASE_SECRET_KEY.');
    console.error('  Example:');
    console.error('    OLD_SUPABASE_SECRET_KEY="xxx" NEW_SUPABASE_SECRET_KEY="yyy" node scripts/migrate-to-new-project.js');
    process.exit(1);
}

const oldClient = createClient(OLD_URL, OLD_KEY);
const newClient = createClient(NEW_URL, NEW_KEY);
const BUCKET = 'product-images';

/**
 * Her yazma hatası ölümcül.
 *
 * Önceki hali hataları console.error'layıp devam ediyordu ve betik sonunda
 * "başarıyla tamamlandı" yazıp 0 ile çıkıyordu -- yani hiçbir şey taşımamış
 * bir çalıştırma başarılı görünüyordu. Bu betik tek seferlik ve canlı veri
 * üzerinde çalışıyor; yarım kalmış bir taşımayı fark etmemek, taşımayı hiç
 * yapmamaktan daha tehlikeli.
 */
function must(label, error) {
    if (error) throw new Error(`${label} başarısız: ${error.message}`);
}

function normalizePhone(phone) {
    if (!phone) return '';
    return String(phone).replace(/\D/g, '');
}

function updateUrlRef(url, oldRef, newRef) {
    if (!url) return url;
    return url.replace(oldRef, newRef);
}

async function runMigration() {
    console.log(`🚀 Starting migration from ${OLD_URL} to ${NEW_URL}`);
    if (DRY_RUN) console.log('🔍 [DRY-RUN MODE - No data will be written]\n');

    const oldRef = OLD_URL.replace('https://', '').split('.')[0];
    const newRef = NEW_URL.replace('https://', '').split('.')[0];

    // 1. PRODUCTS MIGRATION
    console.log('📦 1/5 Migrating Products...');
    const { data: products, error: prodErr } = await oldClient.from('products').select('*');
    if (prodErr) throw new Error(`Failed to fetch products: ${prodErr.message}`);

    console.log(`   Found ${products.length} products in old database.`);
    const updatedProducts = products.map(p => ({
        ...p,
        image: updateUrlRef(p.image, oldRef, newRef),
        // Eski veritabanında extra_images kolonu YOK, yani p.extra_images
        // undefined geliyor. Anahtarı yine de yazdığımız için supabase-js onu
        // kolon listesine katıyor ama gövdeden düşürüyor; PostgREST de bunu
        // NULL olarak yorumlayıp yeni şemadaki not-null kısıtına takılıyor.
        // Boş diziye düşürerek kolonun kendi default'uyla aynı sonucu veriyoruz.
        extra_images: Array.isArray(p.extra_images)
            ? p.extra_images.map(img => updateUrlRef(img, oldRef, newRef))
            : (p.extra_images ?? [])
    }));

    if (!DRY_RUN && updatedProducts.length > 0) {
        const { error: insProdErr } = await newClient.from('products').upsert(updatedProducts);
        must('Ürün taşıma', insProdErr);
        console.log(`   ✅ Products migrated successfully.`);
    }

    // 2. CUSTOMERS MIGRATION (De-duplicating by phone)
    console.log('\n👥 2/5 Migrating Customers (De-duplicating by phone)...');
    const { data: customers, error: custErr } = await oldClient.from('customers').select('*').order('created_at', { ascending: true });
    if (custErr) throw new Error(`Failed to fetch customers: ${custErr.message}`);

    const customerPhoneMap = new Map(); // phone -> latest customer object
    const customerIdRemap = new Map();  // oldId -> targetId

    for (const c of customers) {
        const norm = normalizePhone(c.phone);
        const key = norm || `no-phone-${c.id}`;
        if (customerPhoneMap.has(key)) {
            // Kayıtlar created_at artan sırada geliyor, yani TUTULAN EN ESKİSİ.
            // Mükerrer olanların id'leri en eskisine yönlendiriliyor ki
            // siparişleri kaybolmasın.
            const existing = customerPhoneMap.get(key);
            customerIdRemap.set(c.id, existing.id);
        } else {
            customerPhoneMap.set(key, c);
            customerIdRemap.set(c.id, c.id);
        }
    }

    const uniqueCustomers = Array.from(customerPhoneMap.values());
    console.log(`   Total customers: ${customers.length} | Unique customers (after phone deduplication): ${uniqueCustomers.length}`);

    if (!DRY_RUN && uniqueCustomers.length > 0) {
        // Yeni şemada normalleştirilmiş telefon üzerinde unique indeks var.
        // Buraya bir mükerrer sızarsa sessizce geçmez, hata verir -- istenen bu.
        const { error: insCustErr } = await newClient.from('customers').upsert(uniqueCustomers);
        must('Müşteri taşıma', insCustErr);
        console.log(`   ✅ Customers migrated successfully.`);
    }

    // 3. ORDERS MIGRATION
    console.log('\n🧾 3/5 Migrating Orders...');
    const { data: orders, error: ordErr } = await oldClient.from('orders').select('*');
    if (ordErr) throw new Error(`Failed to fetch orders: ${ordErr.message}`);

    console.log(`   Found ${orders.length} orders in old database.`);
    const remappedOrders = orders.map(o => ({
        ...o,
        customer_id: customerIdRemap.get(o.customer_id) || o.customer_id
    }));

    if (!DRY_RUN && remappedOrders.length > 0) {
        const { error: insOrdErr } = await newClient.from('orders').upsert(remappedOrders);
        must('Sipariş taşıma', insOrdErr);
        console.log(`   ✅ Orders migrated successfully.`);
    }

    // 4. ORDER_ITEMS MIGRATION
    console.log('\n🛒 4/5 Migrating Order Items...');
    const { data: orderItems, error: itemsErr } = await oldClient.from('order_items').select('*');
    if (itemsErr) throw new Error(`Failed to fetch order_items: ${itemsErr.message}`);

    console.log(`   Found ${orderItems.length} order items in old database.`);

    if (!DRY_RUN && orderItems.length > 0) {
        const { error: insItemsErr } = await newClient.from('order_items').upsert(orderItems);
        must('Sipariş kalemi taşıma', insItemsErr);
        console.log(`   ✅ Order items migrated successfully.`);
    }

    // 5. STORAGE IMAGES MIGRATION
    console.log('\n🖼️ 5/5 Migrating Storage Bucket ("product-images")...');
    // Sadece bucket KÖKÜ listeleniyor, özyineleme yok. uploadProductImage
    // (src/lib/supabase.js) dosyaları düz kaydettiği için bugün doğru; ileride
    // klasör kullanılırsa burası da güncellenmeli.
    const { data: files, error: filesErr } = await oldClient.storage.from(BUCKET).list('', { limit: 1000 });
    must('Storage listeleme', filesErr);

    const realFiles = files.filter(f => !f.name.startsWith('.'));
    console.log(`   Found ${realFiles.length} images in storage bucket.`);

    let migratedImages = 0;
    const failed = [];

    for (const file of realFiles) {
        try {
            if (DRY_RUN) {
                // Kuru çalıştırmada 90+ görseli indirmenin anlamı yok.
                migratedImages++;
                continue;
            }

            const { data: blob, error: downErr } = await oldClient.storage.from(BUCKET).download(file.name);
            if (downErr) throw downErr;

            const buffer = Buffer.from(await blob.arrayBuffer());
            const { error: upErr } = await newClient.storage.from(BUCKET).upload(file.name, buffer, {
                contentType: blob.type || 'image/webp',
                upsert: true
            });
            if (upErr) throw upErr;

            migratedImages++;
        } catch (e) {
            console.error(`   ❌ Failed to migrate image ${file.name}: ${e.message}`);
            failed.push(file.name);
        }
    }

    console.log(`   Storage: ${migratedImages} copied, ${failed.length} failed.`);

    // Eksik görsel de başarısızlıktır: menüde kırık resim demek.
    if (failed.length > 0) {
        throw new Error(`${failed.length} görsel taşınamadı: ${failed.join(', ')}`);
    }

    console.log('\n🎉 Migration process completed!');
    console.log(`   products ${products.length} · customers ${uniqueCustomers.length} · orders ${orders.length} · order_items ${orderItems.length} · images ${migratedImages}`);
    if (DRY_RUN) console.log('   (kuru çalıştırma — hiçbir şey yazılmadı)');
    console.log('\n   Şimdi doğrulamayı çalıştır: node scripts/verify-migration.js');
}

runMigration().catch(err => {
    console.error(`\n❌ TAŞIMA BAŞARISIZ: ${err.message}`);
    console.error('   Yeni proje yarım kalmış olabilir. Sorunu düzeltip tekrar çalıştır:');
    console.error('   betik upsert kullanıyor, yani aynı id\'ler üzerine yazar, mükerrer kayıt oluşturmaz.');
    process.exit(1);
});
