/**
 * products.json içindeki WordPress görsel URL'lerini, taşıma sonrası oluşan
 * image_migration_log.json eşlemesini (oldUrl → newUrl) kullanarak Supabase
 * URL'leriyle değiştirir. Diğer tüm alanlar aynen korunur.
 *
 * Çalıştırma (taşımadan SONRA):  node update_products_json_urls.js
 */
import { readFileSync, writeFileSync } from 'fs';

const log = JSON.parse(readFileSync('image_migration_log.json', 'utf8'));
let json = readFileSync('src/data/products.json', 'utf8');

let replaced = 0, missing = 0;
for (const { oldUrl, newUrl } of log) {
    if (json.includes(oldUrl)) {
        json = json.split(oldUrl).join(newUrl);
        replaced++;
    } else {
        missing++;
    }
}

writeFileSync('src/data/products.json', json);
console.log(`✅ products.json güncellendi | değiştirilen: ${replaced} | eşlemede olup json'da bulunmayan: ${missing}`);

// Kalan WP linki var mı kontrol
const left = (json.match(/mezzesalade\.nl/g) || []).length;
console.log(left === 0 ? '🎉 products.json içinde WordPress linki KALMADI' : `⚠️ Hâlâ ${left} WordPress linki var`);
