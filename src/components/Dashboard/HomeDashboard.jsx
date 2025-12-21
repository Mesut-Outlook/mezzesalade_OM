import { useMemo } from 'react';
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
import { formatCurrency } from '../../hooks/useLocalStorage';

export default function HomeDashboard({ orders = [], customers = [], products = [] }) {
    const navigate = useNavigate();

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

        return {
            todayTotal,
            trend,
            pendingOrders,
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
                    <div className="user-avatar">
                        <User size={24} className="text-muted" />
                    </div>
                    <div>
                        <p className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Hoş Geldiniz
                        </p>
                        <h2 className="text-lg font-bold">Mezzesalade Yönetim</h2>
                    </div>
                </div>
                <button className="btn btn-icon btn-secondary" style={{ borderRadius: '50%' }}>
                    <Bell size={20} />
                </button>
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
