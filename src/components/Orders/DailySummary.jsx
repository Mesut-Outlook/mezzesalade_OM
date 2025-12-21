import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../../hooks/useProductMatcher';
import { openDailySummaryWhatsApp } from '../AI/SummaryGenerator';

export default function DailySummary({ orders, products = [] }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const dateParam = searchParams.get('date');

    const today = new Date();
    const [selectedDate, setSelectedDate] = useState(
        dateParam || today.toISOString().split('T')[0]
    );

    // Filter orders for selected date
    const dayOrders = useMemo(() => {
        return orders.filter(order => {
            const orderDate = new Date(order.date).toISOString().split('T')[0];
            return orderDate === selectedDate;
        });
    }, [orders, selectedDate]);

    // Aggregate products
    const productSummary = useMemo(() => {
        const summary = {};

        for (const order of dayOrders) {
            for (const item of order.items) {
                const key = item.variation
                    ? `${item.productId}-${item.variation}`
                    : `${item.productId}`;

                if (!summary[key]) {
                    summary[key] = {
                        name: item.name,
                        variation: item.variation,
                        category: item.category || 'Diğer',
                        quantity: 0,
                        checked: false
                    };
                }
                summary[key].quantity += item.quantity;
            }
        }

        return summary;
    }, [dayOrders]);

    // Group by category
    const byCategory = useMemo(() => {
        const categories = {};

        for (const [key, item] of Object.entries(productSummary)) {
            if (!categories[item.category]) {
                categories[item.category] = [];
            }
            categories[item.category].push({ key, ...item });
        }

        // Sort by quantity within each category
        for (const category of Object.keys(categories)) {
            categories[category].sort((a, b) => b.quantity - a.quantity);
        }

        return categories;
    }, [productSummary]);

    // Check state (local only, not persisted)
    const [checkedItems, setCheckedItems] = useState({});

    const toggleCheck = (key) => {
        setCheckedItems(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Total items
    const totalItems = Object.values(productSummary).reduce((sum, item) => sum + item.quantity, 0);
    const checkedCount = Object.entries(checkedItems).filter(([key, checked]) => checked && productSummary[key]).length;

    // Format date for display
    const formatDisplayDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    // Navigation
    const goToPreviousDay = () => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() - 1);
        setSelectedDate(date.toISOString().split('T')[0]);
        setCheckedItems({});
    };

    const goToNextDay = () => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + 1);
        setSelectedDate(date.toISOString().split('T')[0]);
        setCheckedItems({});
    };

    const categoryColors = {
        'Mezeler': '#e94560',
        'Çorbalar': '#ff6b35',
        'Etli Yemekler': '#8b0000',
        'Zeytinyağlı Yemekler': '#228b22',
        'Börek Poğaça': '#daa520',
        'Salatalar': '#32cd32',
        'Pilavlar': '#f4a460',
        'Köfte Kebap': '#cd5c5c',
        'Dolma Sarma': '#9370db',
    };

    return (
        <div>
            <header className="header">
                <button className="btn btn-icon btn-secondary" onClick={() => navigate('/calendar')}>
                    ←
                </button>
                <h1>📊 Günlük Özet</h1>
                <button
                    className="btn btn-icon btn-success"
                    onClick={() => openDailySummaryWhatsApp(new Date(selectedDate), byCategory, totalItems)}
                    title="WhatsApp ile Paylaş"
                >
                    📱
                </button>
            </header>

            {/* Date Navigation */}
            <div className="card mb-md">
                <div className="flex justify-between items-center">
                    <button className="btn btn-icon btn-secondary" onClick={goToPreviousDay}>
                        ◀
                    </button>
                    <div className="text-center">
                        <div className="font-bold text-lg">{formatDisplayDate(selectedDate)}</div>
                        <div className="text-muted">
                            {dayOrders.length} müşteri • {totalItems} ürün
                        </div>
                    </div>
                    <button className="btn btn-icon btn-secondary" onClick={goToNextDay}>
                        ▶
                    </button>
                </div>
            </div>

            {/* Progress */}
            {totalItems > 0 && (
                <div className="card mb-md">
                    <div className="flex justify-between items-center mb-sm">
                        <span>İlerleme</span>
                        <span className="font-bold">{checkedCount} / {Object.keys(productSummary).length}</span>
                    </div>
                    <div style={{
                        height: 8,
                        background: 'var(--bg-tertiary)',
                        borderRadius: 4,
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${(checkedCount / Object.keys(productSummary).length) * 100}%`,
                            background: 'var(--accent-success)',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>
            )}

            {/* Products by Category */}
            {dayOrders.length === 0 ? (
                <div className="empty-state">
                    <div className="icon">📦</div>
                    <p>Bu tarihte sipariş yok</p>
                </div>
            ) : (
                Object.entries(byCategory).map(([category, items]) => (
                    <div key={category} className="card mb-md">
                        <h3 style={{
                            color: categoryColors[category] || 'var(--text-primary)',
                            marginBottom: 'var(--spacing-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <span style={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                background: categoryColors[category] || 'var(--text-muted)'
                            }} />
                            {category}
                        </h3>

                        {items.map(item => (
                            <div
                                key={item.key}
                                className={`summary-item ${checkedItems[item.key] ? 'checked' : ''}`}
                                onClick={() => toggleCheck(item.key)}
                                style={{ cursor: 'pointer' }}
                            >
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    checked={checkedItems[item.key] || false}
                                    onChange={() => toggleCheck(item.key)}
                                    onClick={e => e.stopPropagation()}
                                />
                                <div style={{ flex: 1 }}>
                                    <span className="font-bold">{item.name}</span>
                                    {item.variation && (
                                        <span className="text-muted"> ({item.variation})</span>
                                    )}
                                </div>
                                <div className="font-bold text-lg" style={{
                                    background: 'var(--bg-secondary)',
                                    padding: '4px 12px',
                                    borderRadius: 'var(--radius-sm)'
                                }}>
                                    {item.quantity}
                                </div>
                            </div>
                        ))}
                    </div>
                ))
            )}

            {/* Total */}
            {totalItems > 0 && (
                <div className="card" style={{
                    position: 'sticky',
                    bottom: 100,
                    background: 'var(--bg-secondary)'
                }}>
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">Toplam Ürün</span>
                        <span className="text-2xl font-bold">{totalItems} adet</span>
                    </div>
                </div>
            )}
        </div>
    );
}
