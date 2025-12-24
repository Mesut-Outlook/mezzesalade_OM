import { formatCurrency, formatDate } from '../../hooks/useLocalStorage';

/**
 * Generates a summary message for WhatsApp from aggregated product details
 * @param {Date} date - The target date
 * @param {Object} byCategory - Products grouped by category
 * @param {Number} totalItems - Total count of items
 */
export function generateDailySummaryWhatsAppMessage(date, byCategory, totalItems) {
    const formattedDate = formatDate(date);

    let message = `📊 *GÜNLÜK ÜRETİM ÖZETİ*\n`;
    message += `📅 Tarih: ${formattedDate}\n`;
    message += `📦 Toplam: ${totalItems} adet ürün\n`;
    message += `\n────────────────────\n`;

    for (const [category, items] of Object.entries(byCategory)) {
        message += `\n*${category.toUpperCase()}*\n`;
        for (const item of items) {
            let line = `• ${item.quantity}x ${item.name}`;
            if (item.variation) {
                line += ` (${item.variation})`;
            }
            message += `${line}\n`;
        }
    }

    message += `\n────────────────────\n`;
    message += `🚀 Kolay gelsin!`;

    return message;
}

export function openDailySummaryWhatsApp(date, byCategory, totalItems) {
    const message = generateDailySummaryWhatsAppMessage(date, byCategory, totalItems);
    const encodedMessage = encodeURIComponent(message);
    // Note: This opens a generic WhatsApp share since we don't have a specific recipient for summary
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
}

/**
 * Generates a menu message for customers from aggregated product details
 * @param {Date} date - The target date
 * @param {Object} byCategory - Products grouped by category
 */
export function generateCustomerMenuMessage(date, byCategory) {
    const formattedDate = formatDate(date);
    const dayName = new Date(date).toLocaleDateString('tr-TR', { weekday: 'long' });

    let message = `🍽️ *GÜNÜN MENÜSÜ & LİSTESİ*\n`;
    message += `📅 ${formattedDate} ${dayName}\n`;
    message += `\nMerhabalar, bugün mutfağımızda pişenler ve sipariş verilebilir ürünler:\n`;
    message += `\n────────────────────\n`;

    for (const [category, items] of Object.entries(byCategory)) {
        // Filter out items with 0 quantity if strictly only ordered, but usually we want to show what is available.
        // Based on user request "o gun icinde alinan siparisleri... diger musterilere gonderebilmek", 
        // implies we are showing what was ordered/produced.
        if (items.length === 0) continue;

        message += `\n*${category.toUpperCase()}*\n`;
        for (const item of items) {
            let line = `▪️ ${item.name}`;
            if (item.variation) {
                line += ` (${item.variation})`;
            }
            if (item.price) {
                line += ` - ${formatCurrency(item.price)}`;
            }
            message += `${line}\n`;
        }
    }

    message += `\n────────────────────\n`;
    message += `Sipariş için mesaj atabilirsiniz! 👩‍🍳`;

    return message;
}

export function openCustomerMenuWhatsApp(date, byCategory) {
    const message = generateCustomerMenuMessage(date, byCategory);
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
}
