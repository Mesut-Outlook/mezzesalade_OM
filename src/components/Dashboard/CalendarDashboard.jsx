import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../hooks/useLocalStorage';
import { useLanguage } from '../../context/LanguageContext';

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
    'Paketler': '#ff7f50',
};

function getCalendarDays(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Get first day of week (0 = Sunday, 1 = Monday, ...)
    // Convert to Monday = 0
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];

    // Empty days before first day of month
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push({ empty: true });
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
        days.push({
            date: new Date(year, month, day),
            day
        });
    }

    return days;
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
}

function formatDisplayDate(dateStr, lang) {
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === 'tr' ? 'tr-TR' : (lang === 'en' ? 'en-US' : 'nl-NL'), {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
}

export default function CalendarDashboard({ orders, customers }) {
    const navigate = useNavigate();
    const { lang, t } = useLanguage();
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState(null);
    const [showSummaryModal, setShowSummaryModal] = useState(false);

    const MONTHS = t('months');
    const DAYS = t('days_short');

    const calendarDays = useMemo(() =>
        getCalendarDays(currentYear, currentMonth),
        [currentYear, currentMonth]
    );

    // Group orders by date
    const ordersByDate = useMemo(() => {
        const grouped = {};
        for (const order of orders) {
            const dateKey = new Date(order.date).toDateString();
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(order);
        }
        return grouped;
    }, [orders]);

    // Get orders for selected date
    const selectedDateOrders = useMemo(() => {
        if (!selectedDate) return [];
        const dateKey = selectedDate.toDateString();
        return ordersByDate[dateKey] || [];
    }, [selectedDate, ordersByDate]);

    // Get product summary for selected date
    const productSummary = useMemo(() => {
        const summary = {};

        for (const order of selectedDateOrders) {
            for (const item of order.items) {
                const key = item.variation
                    ? `${item.productId}-${item.variation}`
                    : `${item.productId}`;

                if (!summary[key]) {
                    summary[key] = {
                        name: item.name,
                        variation: item.variation,
                        category: item.category || 'Diğer',
                        quantity: 0
                    };
                }
                summary[key].quantity += item.quantity;
            }
        }

        return summary;
    }, [selectedDateOrders]);

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

    // Total items for selected date
    const totalItems = Object.values(productSummary).reduce((sum, item) => sum + item.quantity, 0);

    // Calculate stats for each day
    const getDayStats = (date) => {
        const dateKey = date.toDateString();
        const dayOrders = ordersByDate[dateKey] || [];

        if (dayOrders.length === 0) return null;

        let totalItems = 0;
        for (const order of dayOrders) {
            for (const item of order.items) {
                totalItems += item.quantity;
            }
        }

        return {
            customers: dayOrders.length,
            items: totalItems
        };
    };

    const goToPreviousMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleDayClick = (date) => {
        setSelectedDate(date);
        setShowSummaryModal(false);
    };

    const getCustomerName = (customerId) => {
        const customer = customers.find(c => String(c.id) === String(customerId));
        return customer?.name || t('unknown');
    };

    const getTotalPrice = (order) => {
        return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    return (
        <div>
            {/* Quick Actions */}
            <div className="flex gap-sm mb-md">
                <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => navigate('/admin/ai-parser')}
                >
                    🤖 {t('whatsapp_import')}
                </button>
                <button
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => navigate('/admin/new-order')}
                >
                    📝 {t('manual_order')}
                </button>
            </div>

            <div className="calendar">
                <div className="calendar-header">
                    <button
                        className="btn btn-icon btn-secondary"
                        onClick={goToPreviousMonth}
                    >
                        ◀
                    </button>
                    <h2>{MONTHS[currentMonth]} {currentYear}</h2>
                    <button
                        className="btn btn-icon btn-secondary"
                        onClick={goToNextMonth}
                    >
                        ▶
                    </button>
                </div>

                <div className="calendar-grid">
                    {DAYS.map(day => (
                        <div key={day} className="calendar-day-header">
                            {day}
                        </div>
                    ))}

                    {calendarDays.map((dayInfo, index) => {
                        if (dayInfo.empty) {
                            return <div key={`empty-${index}`} className="calendar-day empty" />;
                        }

                        const isToday = isSameDay(dayInfo.date, today);
                        const isSelected = selectedDate && isSameDay(dayInfo.date, selectedDate);
                        const stats = getDayStats(dayInfo.date);
                        const hasOrders = stats !== null;

                        return (
                            <div
                                key={dayInfo.day}
                                className={`calendar-day ${isToday ? 'today' : ''} ${hasOrders ? 'has-orders' : ''} ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleDayClick(dayInfo.date)}
                            >
                                <span className="date">{dayInfo.day}</span>
                                {stats && (
                                    <div className="stats">
                                        <span>👥 {stats.customers}</span>
                                        <span>📦 {stats.items}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Details */}
            {selectedDate && (
                <div className="card mt-lg">
                    <div className="flex justify-between items-center mb-md">
                        <h3>📅 {formatDisplayDate(selectedDate, lang)}</h3>
                        {selectedDateOrders.length > 0 && (
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowSummaryModal(true)}
                            >
                                📊 {t('daily_summary')}
                            </button>
                        )}
                    </div>

                    {selectedDateOrders.length === 0 ? (
                        <p className="text-muted">{t('no_order_date')}</p>
                    ) : (
                        <div>
                            <div className="text-muted mb-md">
                                {selectedDateOrders.length} {t('all_orders').toLowerCase()} • {totalItems} {t('items')}
                            </div>

                            {/* Order List */}
                            {selectedDateOrders.map(order => {
                                const totalOrderItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
                                const totalPrice = getTotalPrice(order);

                                return (
                                    <div
                                        key={order.id}
                                        className="order-item"
                                        onClick={() => navigate(`/admin/order/${order.id}`)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div>
                                            <div className="font-bold">{getCustomerName(order.customerId)}</div>
                                            <div className="text-muted text-sm">
                                                {totalOrderItems} {t('items')}
                                                {order.notes && order.notes.match(/^\[(\d{2}:\d{2})\]/) && (
                                                    <span className="ml-xs">⏰ {order.notes.match(/^\[(\d{2}:\d{2})\]/)[1]}</span>
                                                )}
                                                {order.notes && (
                                                    <span> • {order.notes.replace(/^\[\d{2}:\d{2}\]\s*/, '')}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-success">€{totalPrice.toFixed(2)}</div>
                                            <span className={`badge badge-${order.status}`}>{t(`status_${order.status}`)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Summary Modal */}
            {showSummaryModal && selectedDate && (
                <div className="modal-overlay" onClick={() => setShowSummaryModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📊 Ürün Özeti</h2>
                            <button className="modal-close" onClick={() => setShowSummaryModal(false)}>×</button>
                        </div>

                        <div className="text-center mb-md">
                            <div className="font-bold">{formatDisplayDate(selectedDate)}</div>
                            <div className="text-muted">{selectedDateOrders.length} sipariş • {totalItems} ürün</div>
                        </div>

                        {Object.entries(byCategory).map(([category, items]) => (
                            <div key={category} className="mb-md">
                                <h4 style={{
                                    color: categoryColors[category] || 'var(--text-primary)',
                                    marginBottom: 'var(--spacing-sm)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}>
                                    <span style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        background: categoryColors[category] || 'var(--text-muted)'
                                    }} />
                                    {category}
                                </h4>

                                {items.map(item => (
                                    <div
                                        key={item.key}
                                        className="summary-item"
                                    >
                                        <div style={{ flex: 1 }}>
                                            <span className="font-bold">{item.name}</span>
                                            {item.variation && (
                                                <span className="text-muted"> ({item.variation})</span>
                                            )}
                                        </div>
                                        <div className="font-bold text-lg" style={{
                                            background: 'var(--bg-tertiary)',
                                            padding: '4px 12px',
                                            borderRadius: 'var(--radius-sm)'
                                        }}>
                                            {item.quantity}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}

                        {/* Total */}
                        <div style={{
                            padding: 'var(--spacing-md)',
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            marginTop: 'var(--spacing-md)'
                        }}>
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-bold">Toplam</span>
                                <span className="text-2xl font-bold">{totalItems} adet</span>
                            </div>
                        </div>

                        <button
                            className="btn btn-secondary btn-block mt-md"
                            onClick={() => {
                                setShowSummaryModal(false);
                                navigate(`/admin/daily-summary?date=${selectedDate.toISOString().split('T')[0]}`);
                            }}
                        >
                            🖨️ {t('printable_summary')}
                        </button>
                    </div>
                </div>
            )}

            {/* Today's Quick Stats (only show if no date selected) */}
            {!selectedDate && (
                <>
                    <div className="card mt-lg">
                        <h3>{t('today')}</h3>
                        {(() => {
                            const todayStats = getDayStats(today);
                            if (!todayStats) {
                                return <p className="text-muted mt-md">{t('no_order_today')}</p>;
                            }
                            return (
                                <div className="flex gap-lg mt-md">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{todayStats.customers}</div>
                                        <div className="text-muted">{t('customer')}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{todayStats.items}</div>
                                        <div className="text-muted">{t('items')}</div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Recent Orders Preview */}
                    <div className="card mt-md">
                        <div className="flex justify-between items-center mb-md">
                            <h3>{t('recent_orders')}</h3>
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate('/admin/orders')}
                            >
                                {t('all')} →
                            </button>
                        </div>

                        {orders.length === 0 ? (
                            <p className="text-muted">Henüz sipariş yok</p>
                        ) : (
                            <div>
                                {orders.slice(0, 3).map(order => {
                                    const customer = customers.find(c => c.id === order.customerId);
                                    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
                                    const totalPrice = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

                                    return (
                                        <div
                                            key={order.id}
                                            className="order-item"
                                            onClick={() => navigate(`/admin/order/${order.id}`)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div>
                                                <div className="font-bold">{customer?.name || t('unknown')}</div>
                                                <div className="text-muted text-sm">
                                                    {formatDate(order.date)}
                                                    {order.notes && order.notes.match(/^\[(\d{2}:\d{2})\]/) && (
                                                        <span className="ml-xs">⏰ {order.notes.match(/^\[(\d{2}:\d{2})\]/)[1]}</span>
                                                    )}
                                                    <span> • {totalItems} {t('items')}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-success">€{totalPrice.toFixed(2)}</div>
                                                <span className={`badge badge-${order.status}`}>{t(`status_${order.status}`)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
