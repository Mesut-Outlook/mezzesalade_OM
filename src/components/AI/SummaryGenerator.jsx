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
