import { formatCurrency, formatDate } from '../hooks/useLocalStorage';

// Generate WhatsApp message for an order
export function generateWhatsAppMessage(order, customer, items) {
    const orderDate = formatDate(order.date);
    const orderNumber = `#${order.id.slice(-6).toUpperCase()}`;

    let message = `🍽️ *MEZZESALADE SİPARİŞ*\n\n`;
    message += `📋 Sipariş No: ${orderNumber}\n`;
    message += `📅 Tarih: ${orderDate}\n`;
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
        message += `🚚 Kargo: ${formatCurrency(order.shipping)}\n`;
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
    // Clean phone number
    let cleanPhone = phoneNumber.replace(/\D/g, '');

    // Add country code if not present
    if (!cleanPhone.startsWith('31') && !cleanPhone.startsWith('90')) {
        // Default to Netherlands
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '31' + cleanPhone.slice(1);
        } else {
            cleanPhone = '31' + cleanPhone;
        }
    }

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

// Open WhatsApp with message
export function openWhatsApp(phoneNumber, message) {
    const url = generateWhatsAppUrl(phoneNumber, message);
    window.open(url, '_blank');
}
