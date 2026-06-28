// Shared constants used across multiple components

export const CATEGORY_COLORS = {
    'Mezeler': '#e94560',
    'Çorbalar': '#ff6b35',
    'Etli Yemekler': '#8b0000',
    'Zeytinyağlı Yemekler': '#228b22',
    'Börek Poğaça': '#daa520',
    'Salatalar': '#32cd32',
    'Pilavlar': '#f4a460',
    'Köfte Kebap': '#cd5c5c',
    'Dolma Sarma': '#9370db',
    'Paketler': '#ff7f50',
};

export const CATEGORY_EMOJIS = {
    'Mezeler': '🥗',
    'Çorbalar': '🍲',
    'Etli Yemekler': '🍖',
    'Zeytinyağlı Yemekler': '🫒',
    'Börek Poğaça': '🥐',
    'Salatalar': '🥬',
    'Pilavlar': '🍚',
    'Köfte Kebap': '🍢',
    'Dolma Sarma': '🫑',
    'Paketler': '🎁',
};

export const STATUS_LABELS = {
    new: 'Yeni',
    preparing: 'Hazırlanıyor',
    ready: 'Hazır',
    delivered: 'Teslim Edildi'
};

export const STATUS_OPTIONS = [
    { value: 'new', label: 'Yeni', color: 'var(--accent-primary)' },
    { value: 'preparing', label: 'Hazırlanıyor', color: 'var(--accent-warning)' },
    { value: 'ready', label: 'Hazır', color: 'var(--accent-success)' },
    { value: 'delivered', label: 'Teslim Edildi', color: 'var(--accent-info)' }
];
