import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Calendar, ChevronRight, Package, ArrowLeft } from 'lucide-react';
import { formatCurrency, formatDate } from '../../hooks/useLocalStorage';
import { useLanguage } from '../../context/LanguageContext';

export default function RevenueReport({ orders = [], customers = [], getCustomer }) {
    const navigate = useNavigate();
    const { lang, t } = useLanguage();
    const locale = lang === 'tr' ? 'tr-TR' : lang === 'en' ? 'en-GB' : 'nl-NL';

    // ...
    const { dailyRevenues, pendingOrders, todayTotal, yesterdayTotal, trend } = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Group orders by date
        const revenueByDate = {};
        orders.forEach(order => {
            const date = order.date;
            if (!revenueByDate[date]) {
                revenueByDate[date] = { total: 0, count: 0 };
            }
            revenueByDate[date].total += order.total || 0;
            revenueByDate[date].count += 1;
        });

        // Convert to array and sort by date (newest first)
        const dailyRevenues = Object.entries(revenueByDate)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 14); // Last 14 days

        // Pending orders sorted by date (nearest first)
        const pendingOrders = orders
            .filter(o => o.status === 'new' || o.status === 'preparing')
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const todayTotal = revenueByDate[today]?.total || 0;
        const yesterdayTotal = revenueByDate[yesterday]?.total || 0;

        let trend = 0;
        if (yesterdayTotal > 0) {
            trend = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
        } else if (todayTotal > 0) {
            trend = 100;
        }

        return { dailyRevenues, pendingOrders, todayTotal, yesterdayTotal, trend };
    }, [orders]);

    // Get day name from date (localized)
    const getDayName = (dateStr) => {
        return new Date(dateStr).toLocaleDateString(locale, { weekday: 'long' });
    };

    // Format date localized
    const formatDateLong = (dateStr) => {
        return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    };

    // Is today or future
    const isToday = (dateStr) => dateStr === new Date().toISOString().split('T')[0];
    const isFuture = (dateStr) => new Date(dateStr) > new Date();

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header">
                <button className="back-button" onClick={() => navigate('/')}>
                    <ArrowLeft size={20} />
                </button>
                <h1 className="page-title">{t('revenue_report_title')}</h1>
            </div>

            {/* Today's Revenue Card */}
            <div className="summary-card" style={{ marginBottom: '24px' }}>
                <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('today_total_revenue')}</p>
                    <div className="summary-value">{formatCurrency(todayTotal)}</div>
                    <div className={`trend-indicator ${trend >= 0 ? 'trend-up' : 'trend-down'}`}>
                        {trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span>{Math.abs(trend).toFixed(1)}%</span>
                        <span style={{ opacity: 0.7, fontWeight: 400 }}>{t('compared_to_yesterday')}</span>
                    </div>
                </div>
            </div>

            {/* Pending Orders Section */}
            <div className="section-header" style={{ marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                    {t('pending_orders_count')} ({pendingOrders.length})
                </h3>
            </div>

            <div style={{ marginBottom: '32px' }}>
                {pendingOrders.length === 0 ? (
                    <div className="card text-center p-lg text-muted">
                        <Package size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                        <p>{t('no_pending_orders')}</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {pendingOrders.map(order => {
                            const customer = getCustomer ? getCustomer(order.customerId) : null;
                            return (
                                <div
                                    key={order.id}
                                    onClick={() => navigate(`/order/${order.id}`)}
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-lg)',
                                        padding: '16px',
                                        cursor: 'pointer',
                                        border: '1px solid var(--border-color)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <div>
                                            <span style={{ fontWeight: '700', fontSize: '1rem', display: 'block' }}>
                                                {customer?.name || t('unknown')}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {order.items.length} {t('items_count')}
                                            </span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--accent-success)' }}>
                                                {formatCurrency(order.total || 0)}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Calendar size={14} style={{ opacity: 0.6 }} />
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {getDayName(order.date)}, {formatDateLong(order.date)}
                                            </span>
                                        </div>
                                        <span className={`badge badge-${order.status}`} style={{ fontSize: '0.75rem' }}>
                                            {t(`status_${order.status}`)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Daily Revenues Section */}
            <div className="section-header" style={{ marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                    {t('daily_revenues_title')}
                </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dailyRevenues.length === 0 ? (
                    <div className="card text-center p-lg text-muted">
                        <p>{t('no_orders_found')}</p>
                    </div>
                ) : (
                    dailyRevenues.map(({ date, total, count }) => (
                        <div
                            key={date}
                            onClick={() => navigate(`/calendar?date=${date}`)}
                            style={{
                                background: isToday(date) ? 'linear-gradient(135deg, var(--accent-primary), #ff6b35)' : 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                padding: '14px 16px',
                                cursor: 'pointer',
                                border: isToday(date) ? 'none' : '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <div>
                                <span style={{
                                    fontWeight: '600',
                                    fontSize: '0.95rem',
                                    display: 'block',
                                    color: isToday(date) ? 'white' : 'var(--text-primary)'
                                }}>
                                    {getDayName(date)}
                                    {isToday(date) && <span style={{ marginLeft: '8px', fontSize: '0.75rem', opacity: 0.8 }}>({t('today_label')})</span>}
                                </span>
                                <span style={{
                                    fontSize: '0.8rem',
                                    color: isToday(date) ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'
                                }}>
                                    {formatDateLong(date)} • {count} {t('orders_count')}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    fontWeight: '700',
                                    fontSize: '1.1rem',
                                    color: isToday(date) ? 'white' : 'var(--accent-success)'
                                }}>
                                    {formatCurrency(total)}
                                </span>
                                <ChevronRight size={18} style={{ opacity: 0.5, color: isToday(date) ? 'white' : 'var(--text-muted)' }} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
