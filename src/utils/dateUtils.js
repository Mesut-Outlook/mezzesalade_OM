/**
 * Tarih yardımcıları — "iş günü" (YYYY-MM-DD) ile Date nesnesi arasındaki
 * dönüşümleri tek yerde toplar.
 *
 * NEDEN: Sipariş tarihleri (orders.date) timezone'suz bir YYYY-MM-DD metnidir.
 * Bunu Date'e çevirirken JS iki farklı tuzak kurar ve ikisi de NL'de (UTC+1/+2)
 * tarihi bir gün kaydırır:
 *
 *   1. new Date('2025-06-15')      -> UTC gece yarısı olarak okunur
 *   2. new Date(2025, 5, 15)       -> YEREL gece yarısı olur,
 *      .toISOString() ise UTC'ye çevirir -> bir önceki gün çıkar
 *
 * Bu yüzden uygulamada Date -> YYYY-MM-DD dönüşümü için ASLA toISOString()
 * kullanmayın; buradaki fonksiyonları kullanın.
 */

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Bir Date'i yerel bileşenlerinden YYYY-MM-DD olarak biçimlendirir.
 * toISOString()'in aksine timezone kaydırması yapmaz.
 */
export function toDateKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * YYYY-MM-DD metnini YEREL gece yarısına denk gelen Date'e çevirir.
 * new Date(str) bunu UTC olarak okuyup kaydırdığı için onun yerine kullanılır.
 * Bu formatta olmayan girdiler new Date()'e devredilir (ör. tam timestamp).
 */
export function parseDateKey(dateString) {
    if (typeof dateString === 'string' && DATE_KEY_PATTERN.test(dateString)) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    return new Date(dateString);
}

/** Bugünün iş günü anahtarı (yerel saate göre). */
export function todayKey() {
    return toDateKey(new Date());
}

/** Dünün iş günü anahtarı. */
export function yesterdayKey() {
    return addDays(todayKey(), -1);
}

/**
 * Bir iş gününe gün ekler/çıkarır ve yine YYYY-MM-DD döner.
 * Yerel gece yarısı üzerinden çalıştığı için yaz saati geçişlerinde
 * gün atlamaz (new Date(str) + setDate ikilisi 26 Ekim'i atlıyordu).
 */
export function addDays(dateKey, amount) {
    const date = parseDateKey(dateKey);
    date.setDate(date.getDate() + amount);
    return toDateKey(date);
}

/**
 * Herhangi bir tarih değerini (YYYY-MM-DD metni, timestamp veya Date)
 * karşılaştırmada kullanılacak iş günü anahtarına indirger.
 */
export function toDateKeyFrom(value) {
    if (value instanceof Date) return toDateKey(value);
    if (typeof value === 'string' && DATE_KEY_PATTERN.test(value)) return value;
    return toDateKey(new Date(value));
}
