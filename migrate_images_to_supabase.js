/**
 * TEK SEFERLİK TAŞIMA + KÜÇÜLTME SCRIPTI
 * WordPress (mezzesalade.nl) üzerindeki ürün görsellerini:
 *   1. indirir
 *   2. sharp ile küçültür/sıkıştırır (max 1280px, WebP q80)
 *   3. Supabase Storage'a yükler
 *   4. ürünün `image` alanını yeni Supabase URL'iyle günceller
 * Eski→yeni URL eşlemesi image_migration_log.json'a yazılır (geri dönüş için).
 *
 * Çalıştırma:
 *   node migrate_images_to_supabase.js --dry-run   # yazma yok, sadece sıkıştırma raporu
 *   node migrate_images_to_supabase.js             # gerçek taşıma
 *
 * NOT: WordPress kapanmadan önce çalıştırılmalı (orijinaller erişilebilir olmalı).
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { writeFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const BUCKET = 'product-images';
const DRY_RUN = process.argv.includes('--dry-run');

// Küçültme ayarları
const MAX_WIDTH = 1280;   // lightbox/tam görünüm için yeterli, ekranlar için fazlasıyla yeterli
const WEBP_QUALITY = 80;  // gözle fark edilmeyen kalite/boyut dengesi

function needsMigration(url) {
    if (!url) return false;
    if (url.includes('supabase.co')) return false; // zaten taşınmış
    return url.startsWith('http');
}

async function migrate() {
    console.log(DRY_RUN ? '🔍 DRY-RUN (yazma yok)\n' : '🚀 Taşıma + küçültme başlıyor\n');

    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, image');
    if (error) { console.error('❌ Ürünler çekilemedi:', error); process.exit(1); }

    const todo = products.filter(p => needsMigration(p.image));
    console.log(`Toplam ürün: ${products.length} | Taşınacak görsel: ${todo.length}\n`);

    let ok = 0, fail = 0;
    let origTotal = 0, newTotal = 0;
    const log = [];

    for (const p of todo) {
        try {
            const resp = await fetch(p.image);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const origBuf = Buffer.from(await resp.arrayBuffer());

            // sharp ile küçült: max genişlik, içeri sığdır (büyütme yok), WebP'ye çevir
            const newBuf = await sharp(origBuf)
                .rotate() // EXIF yönünü uygula
                .resize({ width: MAX_WIDTH, withoutEnlargement: true })
                .webp({ quality: WEBP_QUALITY })
                .toBuffer();

            const origKB = origBuf.length / 1024;
            const newKB = newBuf.length / 1024;
            origTotal += origKB; newTotal += newKB;

            const pct = ((1 - newKB / origKB) * 100).toFixed(0);
            const fileName = `${p.id}_${Date.now()}.webp`;

            if (DRY_RUN) {
                console.log(`  [dry] ${p.name}: ${origKB.toFixed(0)} KB → ${newKB.toFixed(0)} KB (-${pct}%)`);
                ok++;
                continue;
            }

            const { error: upErr } = await supabase.storage
                .from(BUCKET)
                .upload(fileName, newBuf, { contentType: 'image/webp', upsert: true });
            if (upErr) throw upErr;

            const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

            const { error: updErr } = await supabase
                .from('products')
                .update({ image: pub.publicUrl })
                .eq('id', p.id);
            if (updErr) throw updErr;

            log.push({ id: p.id, name: p.name, oldUrl: p.image, newUrl: pub.publicUrl });
            console.log(`  ✅ ${p.name}: ${origKB.toFixed(0)} KB → ${newKB.toFixed(0)} KB (-${pct}%)`);
            ok++;
        } catch (e) {
            console.error(`  ❌ ${p.name} [${p.image}] → ${e.message}`);
            fail++;
        }
    }

    if (!DRY_RUN && log.length) {
        writeFileSync('image_migration_log.json', JSON.stringify(log, null, 2));
        console.log('\n📝 Eski→yeni URL eşlemesi: image_migration_log.json');
    }

    console.log(`\n--- Özet ---`);
    console.log(`Başarılı: ${ok} | Hata: ${fail}`);
    console.log(`Toplam boyut: ${(origTotal/1024).toFixed(1)} MB → ${(newTotal/1024).toFixed(1)} MB (-${((1-newTotal/origTotal)*100).toFixed(0)}%)`);
    if (fail > 0) console.log('⚠️ Hatalı görseller WordPress\'te kaldı; script tekrar çalıştırılabilir.');
}

migrate();
