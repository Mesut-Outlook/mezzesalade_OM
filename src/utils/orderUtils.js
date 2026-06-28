// Shared order utility functions used across multiple components

/**
 * Calculate subtotal from order items.
 * @param {Array<{price: number, quantity: number}>} items
 * @returns {number}
 */
export function calculateSubtotal(items) {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

/**
 * Count total item quantity.
 * @param {Array<{quantity: number}>} items
 * @returns {number}
 */
export function countItems(items) {
    return items.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Get short order ID for display (last 6 chars, uppercase).
 * @param {string} orderId
 * @returns {string}
 */
export function getOrderShortId(orderId) {
    return `#${orderId.slice(-6).toUpperCase()}`;
}

/**
 * Extract delivery time from order notes.
 * Notes may start with "[HH:MM] ...".
 * @param {string} notes
 * @returns {{ time: string|null, cleanNotes: string }}
 */
export function extractDeliveryTime(notes) {
    if (!notes) return { time: null, cleanNotes: '' };
    const match = notes.match(/^\[(\d{2}:\d{2})\]\s*(.*)/s);
    if (match) {
        return { time: match[1], cleanNotes: match[2] };
    }
    return { time: null, cleanNotes: notes };
}

/**
 * Format delivery time and notes into the stored notes format.
 * @param {string} time - e.g. "14:30"
 * @param {string} notes
 * @returns {string}
 */
export function formatDeliveryTimeIntoNotes(time, notes) {
    return (time ? `[${time}] ` : '') + notes;
}

/**
 * Aggregate order items into a product summary keyed by productId[-variation].
 * Used by DailySummary and CalendarDashboard.
 * @param {Array} orders - orders with .items
 * @param {Array} products - full product list (optional, for price lookup)
 * @returns {Object} summary keyed by "productId" or "productId-variation"
 */
export function aggregateProductSummary(orders, products = []) {
    const summary = {};

    for (const order of orders) {
        for (const item of order.items) {
            const key = item.variation
                ? `${item.productId}-${item.variation}`
                : `${item.productId}`;

            if (!summary[key]) {
                let price = 0;
                if (products.length > 0) {
                    const product = products.find(p => p.id === item.productId);
                    if (product) {
                        if (item.variation) {
                            const vPrices = product.variationPrices || product.variation_prices || {};
                            price = vPrices[item.variation] || product.price;
                        } else {
                            price = product.price;
                        }
                    }
                }

                summary[key] = {
                    productId: item.productId,
                    name: item.name,
                    variation: item.variation,
                    category: item.category || 'Diğer',
                    quantity: 0,
                    price
                };
            }
            summary[key].quantity += item.quantity;
        }
    }

    return summary;
}

/**
 * Group a product summary by category, sorted by quantity descending.
 * @param {Object} productSummary - output of aggregateProductSummary
 * @returns {Object} categories -> sorted items array
 */
export function groupByCategory(productSummary) {
    const categories = {};

    for (const [key, item] of Object.entries(productSummary)) {
        if (!categories[item.category]) {
            categories[item.category] = [];
        }
        categories[item.category].push({ key, ...item });
    }

    for (const category of Object.keys(categories)) {
        categories[category].sort((a, b) => b.quantity - a.quantity);
    }

    return categories;
}

/**
 * Generate an items preview string (e.g. "2x Soup, 1x Salad +3 more").
 * @param {Array} items
 * @param {number} maxShow
 * @param {string} moreText - text for "more" suffix
 * @returns {string}
 */
export function itemsPreview(items, maxShow = 3, moreText = 'daha...') {
    const preview = items.slice(0, maxShow).map(item =>
        `${item.quantity}x ${item.name}`
    ).join(', ');
    if (items.length > maxShow) {
        return `${preview} +${items.length - maxShow} ${moreText}`;
    }
    return preview;
}
