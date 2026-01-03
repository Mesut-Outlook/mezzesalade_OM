import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PlusCircle,
    Sparkles,
    Calendar,
    BarChart3,
    Package,
    Users,
    Bell,
    ChevronRight,
    User,
    ShoppingBag,
    TrendingUp,
    LogOut
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../hooks/useLocalStorage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function HomeDashboard({ orders = [], customers = [], products = [], getCustomer }) {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { lang, setLang, t } = useLanguage();
    const [showNotifications, setShowNotifications] = useState(false);

    // Stats Calculation
    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const todayOrders = orders.filter(o => o.date === today);
        const yesterdayOrders = orders.filter(o => o.date === yesterday);

        const todayTotal = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const yesterdayTotal = yesterdayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        let trend = 0;
        if (yesterdayTotal > 0) {
            trend = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
        } else if (todayTotal > 0) {
            trend = 100;
        }

        const pendingOrders = orders
            .filter(o => o.status === 'new' || o.status === 'preparing')
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 3);

        // Notifications sorted by nearest date first
        const notificationOrders = orders
            .filter(o => o.status === 'new' || o.status === 'preparing')
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        return {
            todayTotal,
            trend,
            pendingOrders,
            notificationOrders,
            totalOrders: todayOrders.length
        };
    }, [orders]);

    const menuItems = [
        {
            id: 'ai',
            title: t('ai_order'),
            icon: <Sparkles size={32} />,
            color: 'var(--accent-primary)',
            path: '/admin/ai-parser'
        },
        {
            id: 'manual',
            title: t('new_order'),
            icon: <PlusCircle size={32} />,
            color: '#3b82f6', // Blue
            path: '/admin/new-order'
        },
        {
            id: 'allOrders',
            title: t('all_orders'),
            icon: <ShoppingBag size={32} />,
            color: '#8b5cf6', // Purple
            path: '/admin/all-orders'
        },
        {
            id: 'revenue',
            title: t('revenue_report'),
            icon: <TrendingUp size={32} />,
            color: '#10b981', // Emerald
            path: '/admin/revenue'
        },
        {
            id: 'calendar',
            title: t('calendar'),
            icon: <Calendar size={32} />,
            color: '#f97316', // Orange
            path: '/admin/calendar'
        },
        {
            id: 'summary',
            title: t('daily_summary'),
            icon: <BarChart3 size={32} />,
            color: 'var(--accent-success)',
            path: '/admin/daily-summary'
        },
        {
            id: 'products',
            title: t('products'),
            icon: <Package size={32} />,
            color: '#f59e0b', // Amber
            path: '/admin/products'
        },
        {
            id: 'customers',
            title: t('customers'),
            icon: <Users size={32} />,
            color: '#ec4899', // Rose
            path: '/admin/customers'
        }
    ];

    return (
        <div className="dashboard-container">
            {/* Header / Welcome */}
            <div className="welcome-section">
                <div className="user-info">
                    <img src="/images/logo.png" alt="Mezzesalade" className="dashboard-logo" />
                    <div>
                        <p className="text-xs" style={{
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: '#ffffff',
                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                            marginBottom: '2px'
                        }}>
                            {t('admin_page')}
                        </p>
                        <h2 className="text-lg font-bold" style={{
                            color: '#ffffff',
                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                            whiteSpace: 'nowrap'
                        }}>{t('admin_management')}</h2>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    {/* Language Toggles */}
                    <div className="language-switches" style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '20px' }}>
                        <button
                            onClick={() => setLang('tr')}
                            style={{
                                border: 'none',
                                background: lang === 'tr' ? 'var(--accent-primary)' : 'transparent',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '15px',
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: '0.2s'
                            }}
                        >
                            TR
                        </button>
                        <button
                            onClick={() => setLang('en')}
                            style={{
                                border: 'none',
                                background: lang === 'en' ? 'var(--accent-primary)' : 'transparent',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '15px',
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: '0.2s'
                            }}
                        >
                            EN
                        </button>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <button
                            className="btn btn-icon btn-secondary"
                            style={{ width: '40px', height: '40px', borderRadius: '50%', position: 'relative' }}
                            onClick={() => setShowNotifications(!showNotifications)}
                        >
                            <Bell size={18} />
                            {stats.notificationOrders.length > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-2px',
                                    right: '-2px',
                                    background: 'var(--accent-primary)',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '18px',
                                    height: '18px',
                                    fontSize: '0.65rem',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px solid var(--bg-primary)'
                                }}>
                                    {stats.notificationOrders.length}
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <div style={{
                                position: 'absolute',
                                top: '45px',
                                right: 0,
                                width: '280px',
                                maxHeight: '400px',
                                overflowY: 'auto',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                zIndex: 1000
                            }}>
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700' }}>
                                        🔔 {t('notifications')} ({stats.notificationOrders.length})
                                    </h3>
                                </div>
                                {stats.notificationOrders.length === 0 ? (
                                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <Bell size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                        <p style={{ fontSize: '0.875rem' }}>{t('no_notifications')}</p>
                                    </div>
                                ) : (
                                    <div>
                                        {stats.notificationOrders.map(order => {
                                            const customer = getCustomer ? getCustomer(order.customerId) : null;
                                            return (
                                                <div
                                                    key={order.id}
                                                    onClick={() => {
                                                        setShowNotifications(false);
                                                        navigate(`/admin/order/${order.id}`);
                                                    }}
                                                    style={{
                                                        padding: '10px 14px',
                                                        borderBottom: '1px solid var(--border-color)',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                                                        <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                                                            {customer?.name || 'Bilinmeyen'}
                                                        </span>
                                                        <span className={`badge badge-${order.status}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                                                            {order.status === 'new' ? t('status_new') : t('preparing')}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {order.items.length} {t('items')} • {formatCurrency(order.total || 0)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        className="btn btn-icon btn-secondary logout-btn"
                        style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                        onClick={logout}
                        title={t('logout')}
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            {/* Grid Menu */}
            <div className="dashboard-menu">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className="menu-item"
                        onClick={() => navigate(item.path)}
                    >
                        <div className="menu-icon-circle" style={{ background: item.color }}>
                            {item.icon}
                        </div>
                        <span className="menu-label">{item.title}</span>
                    </button>
                ))}
            </div>

            {/* Pending Transactions */}
            <div className="section-header">
                <h4 className="font-bold">{t('pending_orders')}</h4>
                <button className="text-sm font-bold" onClick={() => navigate('/admin/revenue')} style={{ color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {t('see_all')}
                </button>
            </div>

            <div className="activity-list">
                {stats.pendingOrders.length === 0 ? (
                    <div className="card text-center p-md text-muted italic">
                        {t('no_pending_orders')}
                    </div>
                ) : (
                    stats.pendingOrders.map((order) => {
                        const customer = customers.find(c => c.id === order.customerId);
                        const days = ['Paz', 'Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt'];
                        const orderDate = new Date(order.date);
                        const dayName = days[orderDate.getDay()];
                        const dateStr = `${orderDate.getDate()}/${orderDate.getMonth() + 1}`;
                        return (
                            <div
                                key={order.id}
                                className="activity-item"
                                onClick={() => navigate(`/admin/order/${order.id}`)}
                            >
                                <div className="flex items-center gap-md" style={{ flex: 1 }}>
                                    <div className="activity-icon">
                                        <Package size={20} className="text-muted" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p className="text-sm font-bold">{customer?.name || 'Bilinmeyen Musteri'}</p>
                                        <p className="text-xs text-muted">
                                            {order.items.length} urun • {order.status === 'new' ? 'Yeni' : 'Hazirlaniyor'}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', marginRight: '8px' }}>
                                    <p style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--accent-success)' }}>
                                        {formatCurrency(order.total || 0)}
                                    </p>
                                    <p className="text-xs text-muted">
                                        {dayName}, {dateStr}
                                    </p>
                                </div>
                                <ChevronRight size={18} className="text-muted" />
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
