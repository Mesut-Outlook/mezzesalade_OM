import { formatCurrency, formatDate } from '../hooks/useLocalStorage';
import { getOrderShortId, extractDeliveryTime, calculateSubtotal } from './orderUtils';

// Generate WhatsApp message for an order
export function generateWhatsAppMessage(order, customer, items) {
    const orderDate = formatDate(order.date);
    const orderNumber = getOrderShortId(order.id);
    const { time: deliveryTime } = extractDeliveryTime(order.notes);

    let message = `🍽️ *MEZZESALADE SİPARİŞ*\n\n`;
    message += `📋 Sipariş No: ${orderNumber}\n`;
    message += `📅 Tarih: ${orderDate}${deliveryTime ? ` @ ${deliveryTime}` : ''}\n`;
    message += `👤 Müşteri: ${customer.name}\n`;
    message += `📞 Tel: ${customer.phone}\n`;

    if (customer.address) {
        message += `📍 Adres: ${customer.address}\n`;
    }

    message += `\n────────────────────\n`;
    message += `📦 *SİPARİŞ DETAYI:*\n\n`;

    let total = 0;
    for (const item of items) {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        let itemLine = `${item.quantity}x ${item.name}`;
        if (item.variation) {
            itemLine += ` (${item.variation})`;
        }
        itemLine += ` - ${formatCurrency(itemTotal)}`;
        message += `${itemLine}\n`;
    }

    message += `\n────────────────────\n`;

    if (order.shipping && order.shipping > 0) {
        message += `💵 Ara Toplam: ${formatCurrency(total)}\n`;
        message += `🚚 Teslimat Ücreti: ${formatCurrency(order.shipping)}\n`;
        message += `\n*TOPLAM: ${formatCurrency(total + order.shipping)}*\n`;
    } else {
        message += `💰 *TOPLAM: ${formatCurrency(total)}*\n`;
    }

    if (order.notes) {
        message += `\n📝 Not: ${order.notes}\n`;
    }

    message += `\nTeşekkür ederiz! 🙏`;

    return message;
}

// Generate WhatsApp URL
export function generateWhatsAppUrl(phoneNumber, message) {
    let rawPhone = (phoneNumber || '').trim();

    // Check for explicit country codes
    const hasPlus = rawPhone.startsWith('+');
    const hasZeroZero = rawPhone.startsWith('00');

    // Clean phone number (keep only digits)
    let cleanPhone = rawPhone.replace(/\D/g, '');

    if (hasPlus) {
        // Has a '+' so it includes the country code. Just use the digits.
    } else if (hasZeroZero) {
        // Has '00'. Strip the leading zeros.
        cleanPhone = cleanPhone.replace(/^00/, '');
    } else if (cleanPhone.startsWith('0')) {
        // Likely a local number (e.g., 06...). Replace the leading '0' with '31'
        cleanPhone = '31' + cleanPhone.slice(1);
    } else if (cleanPhone.length > 0) {
        // No leading 0, no +, no 00. Assume Dutch local without prefix (e.g., 6...).
        // Note: if it's already a clean international number like '336...' without + or 00, 
        // it's tricky, but standard is to assume Dutch if no prefix.
        if (!cleanPhone.startsWith('31') && !cleanPhone.startsWith('90')) {
            cleanPhone = '31' + cleanPhone;
        }
    }

    let url = `https://wa.me/${cleanPhone}`;
    if (message) {
        url += `?text=${encodeURIComponent(message)}`;
    }
    return url;
}

// Open WhatsApp with message
export function openWhatsApp(phoneNumber, message) {
    const url = generateWhatsAppUrl(phoneNumber, message);
    window.open(url, '_blank');
}
