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
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dayName = d.toLocaleDateString('tr-TR', { weekday: 'long' });
    const dateStr = `${day}.${month}.${year} ${dayName}`;

    let message = `🍽️ GÜNÜN MENÜSÜ\n`;
    message += `📅 ${dateStr}\n\n`;

    const allItems = [];
    for (const items of Object.values(byCategory)) {
        if (items.length > 0) {
            allItems.push(...items);
        }
    }

    // Optional: Sort items alphabetically if desired, or keep category order?
    // User example seemed incidental, but keeping category order is safer/logical.
    // However, since we remove headers, it's just a long list.

    for (const item of allItems) {
        let line = `▪️ ${item.name}`;
        if (item.variation) {
            line += ` (${item.variation})`;
        }
        if (item.price) {
            line += ` - ${formatCurrency(item.price)}`;
        }
        message += `${line}\n`;
    }

    message += `\n👩‍🍳 Sipariş için mesaj atabilirsiniz!`;

    return message;
}

export function openCustomerMenuWhatsApp(date, byCategory) {
    const message = generateCustomerMenuMessage(date, byCategory);
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
}
