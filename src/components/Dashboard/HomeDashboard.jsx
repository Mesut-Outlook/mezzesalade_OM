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
    ShoppingBag
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../hooks/useLocalStorage';

export default function HomeDashboard({ orders = [], customers = [], products = [], getCustomer }) {
    const navigate = useNavigate();
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

        const pendingOrders = orders.filter(o => o.status === 'new' || o.status === 'preparing').slice(0, 3);
        const notificationOrders = orders.filter(o => o.status === 'new' || o.status === 'preparing');

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
            title: 'AI Sipariş',
            icon: <Sparkles size={32} />,
            color: 'var(--accent-primary)',
            path: '/ai-parser'
        },
        {
            id: 'manual',
            title: 'Yeni Sipariş',
            icon: <PlusCircle size={32} />,
            color: '#3b82f6', // Blue
            path: '/new-order'
        },
        {
            id: 'allOrders',
            title: 'Tüm Siparişler',
            icon: <ShoppingBag size={32} />,
            color: '#8b5cf6', // Purple
            path: '/all-orders'
        },
        {
            id: 'calendar',
            title: 'Takvim',
            icon: <Calendar size={32} />,
            color: '#f97316', // Orange
            path: '/calendar'
        },
        {
            id: 'summary',
            title: 'Günlük Özet',
            icon: <BarChart3 size={32} />,
            color: 'var(--accent-success)',
            path: '/daily-summary'
        },
        {
            id: 'products',
            title: 'Ürünler',
            icon: <Package size={32} />,
            color: '#f59e0b', // Amber
            path: '/products'
        },
        {
            id: 'customers',
            title: 'Müşteriler',
            icon: <Users size={32} />,
            color: '#ec4899', // Rose
            path: '/customers'
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
                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
                        }}>
                            Hoş Geldiniz
                        </p>
                        <h2 className="text-lg font-bold" style={{
                            color: '#ffffff',
                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
                        }}>Mezzesalade Yönetim</h2>
                    </div>
                </div>
                <div style={{ position: 'relative' }}>
                    <button
                        className="btn btn-icon btn-secondary"
                        style={{ borderRadius: '50%', position: 'relative' }}
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        {stats.notificationOrders.length > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-4px',
                                background: 'var(--accent-primary)',
                                color: 'white',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                fontSize: '0.7rem',
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
                            top: '50px',
                            right: 0,
                            width: '320px',
                            maxHeight: '400px',
                            overflowY: 'auto',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            zIndex: 1000
                        }}>
                            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>
                                    🔔 Bildirimler ({stats.notificationOrders.length})
                                </h3>
                            </div>
                            {stats.notificationOrders.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <Bell size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                    <p>Yeni bildirim yok</p>
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
                                                    navigate(`/order/${order.id}`);
                                                }}
                                                style={{
                                                    padding: '12px 16px',
                                                    borderBottom: '1px solid var(--border-color)',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                                    <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                                                        {customer?.name || 'Bilinmeyen'}
                                                    </span>
                                                    <span className={`badge badge-${order.status}`} style={{ fontSize: '0.7rem' }}>
                                                        {order.status === 'new' ? 'Yeni' : 'Hazırlanıyor'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {order.items.length} ürün • {formatCurrency(order.total || 0)}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                    {formatDate(order.date)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Total Sales Card */}
            <div className="summary-card">
                <div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Bugünkü Toplam Ciro</p>
                    <div className="summary-value">{formatCurrency(stats.todayTotal)}</div>
                    <div className={`trend-indicator ${stats.trend >= 0 ? 'trend-up' : 'trend-down'}`}>
                        <span>{stats.trend >= 0 ? '↑' : '↓'} {Math.abs(stats.trend).toFixed(1)}%</span>
                        <span style={{ opacity: 0.7, fontWeight: 400 }}>Düne göre</span>
                    </div>
                </div>
                <div style={{ position: 'absolute', right: 20, bottom: 20, opacity: 0.1 }}>
                    <ShoppingBag size={80} />
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
                <h4 className="font-bold">Bekleyen Siparişler</h4>
                <button className="text-sm font-bold" onClick={() => navigate('/calendar')} style={{ color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Tümünü Gör
                </button>
            </div>

            <div className="activity-list">
                {stats.pendingOrders.length === 0 ? (
                    <div className="card text-center p-md text-muted italic">
                        Bekleyen işlem bulunmuyor
                    </div>
                ) : (
                    stats.pendingOrders.map((order) => {
                        const customer = customers.find(c => c.id === order.customerId);
                        return (
                            <div
                                key={order.id}
                                className="activity-item"
                                onClick={() => navigate(`/order/${order.id}`)}
                            >
                                <div className="flex items-center gap-md">
                                    <div className="activity-icon">
                                        <Package size={20} className="text-muted" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">{customer?.name || 'Bilinmeyen Müşteri'}</p>
                                        <p className="text-xs text-muted">
                                            {order.items.length} ürün • {order.status === 'new' ? 'Yeni' : 'Hazırlanıyor'}
                                        </p>
                                    </div>
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
