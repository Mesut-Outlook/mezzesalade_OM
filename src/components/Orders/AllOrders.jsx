import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatCurrency } from '../../hooks/useLocalStorage';
import { Calendar, Filter, Search, ChevronDown } from 'lucide-react';

const STATUS_LABELS = {
    new: 'Yeni',
    preparing: 'Hazırlanıyor',
    ready: 'Hazır',
    delivered: 'Teslim Edildi'
};

const DATE_FILTERS = {
    all: 'Tüm Zamanlar',
    today: 'Bugün',
    yesterday: 'Dün',
    thisWeek: 'Bu Hafta',
    lastWeek: 'Geçen Hafta',
    thisMonth: 'Bu Ay',
    lastMonth: 'Geçen Ay',
    last3Months: 'Son 3 Ay',
    thisYear: 'Bu Yıl',
    lastYear: 'Geçen Yıl',
    custom: 'Özel Tarih Aralığı'
};

function getDateRange(filter) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
        case 'today':
            return { start: today, end: new Date(today.getTime() + 86400000) };

        case 'yesterday':
            const yesterday = new Date(today.getTime() - 86400000);
            return { start: yesterday, end: today };

        case 'thisWeek':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
            return { start: weekStart, end: new Date(now.getTime() + 86400000) };

        case 'lastWeek':
            const lastWeekStart = new Date(today);
            lastWeekStart.setDate(today.getDate() - today.getDay() - 6);
            const lastWeekEnd = new Date(lastWeekStart);
            lastWeekEnd.setDate(lastWeekStart.getDate() + 7);
            return { start: lastWeekStart, end: lastWeekEnd };

        case 'thisMonth':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            return { start: monthStart, end: new Date(now.getTime() + 86400000) };

        case 'lastMonth':
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
            return { start: lastMonthStart, end: lastMonthEnd };

        case 'last3Months':
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            return { start: threeMonthsAgo, end: new Date(now.getTime() + 86400000) };

        case 'thisYear':
            const yearStart = new Date(now.getFullYear(), 0, 1);
            return { start: yearStart, end: new Date(now.getTime() + 86400000) };

        case 'lastYear':
            const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
            const lastYearEnd = new Date(now.getFullYear(), 0, 1);
            return { start: lastYearStart, end: lastYearEnd };

        default:
            return null;
    }
}

export default function AllOrders({ orders, customers, getCustomer }) {
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [customDateStart, setCustomDateStart] = useState('');
    const [customDateEnd, setCustomDateEnd] = useState('');

    // Filter orders
    const filteredOrders = useMemo(() => {
        let result = orders;

        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(order => order.status === statusFilter);
        }

        // Date filter
        if (dateFilter !== 'all') {
            if (dateFilter === 'custom' && customDateStart && customDateEnd) {
                const start = new Date(customDateStart);
                const end = new Date(customDateEnd);
                end.setHours(23, 59, 59, 999);

                result = result.filter(order => {
                    const orderDate = new Date(order.date);
                    return orderDate >= start && orderDate <= end;
                });
            } else if (dateFilter !== 'custom') {
                const range = getDateRange(dateFilter);
                if (range) {
                    result = result.filter(order => {
                        const orderDate = new Date(order.date);
                        return orderDate >= range.start && orderDate < range.end;
                    });
                }
            }
        }

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(order => {
                const customer = getCustomer(order.customerId);
                const customerName = customer?.name?.toLowerCase() || '';
                const orderId = order.id.toLowerCase();

                return customerName.includes(query) || orderId.includes(query);
            });
        }

        return result;
    }, [orders, statusFilter, dateFilter, searchQuery, customDateStart, customDateEnd, getCustomer]);

    // Calculate stats
    const stats = useMemo(() => {
        const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalItems = filteredOrders.reduce((sum, order) =>
            sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
        );

        return {
            count: filteredOrders.length,
            revenue: totalRevenue,
            items: totalItems
        };
    }, [filteredOrders]);

    // Group by date
    const ordersByDate = useMemo(() => {
        const grouped = {};
        for (const order of filteredOrders) {
            const date = formatDate(order.date);
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(order);
        }
        return grouped;
    }, [filteredOrders]);

    return (
        <div>
            <header className="header">
                <button className="btn btn-icon btn-secondary" onClick={() => navigate(-1)}>
                    ←
                </button>
                <h1>📋 Tüm Siparişler</h1>
                <div style={{ width: 40 }} />
            </header>

            {/* Stats Summary */}
            <div className="card mb-md" style={{ background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))' }}>
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-2xl font-bold">{stats.count}</div>
                        <div className="text-muted">Sipariş</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{stats.items}</div>
                        <div className="text-muted">Ürün</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-success">{formatCurrency(stats.revenue)}</div>
                        <div className="text-muted">Toplam Ciro</div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="search-container">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Müşteri veya sipariş ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Date Filter */}
            <div className="card mb-md">
                <div className="flex justify-between items-center mb-sm">
                    <label className="form-label" style={{ margin: 0 }}>
                        <Calendar size={16} className="inline mr-xs" />
                        Tarih Filtresi
                    </label>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowDatePicker(!showDatePicker)}
                    >
                        {DATE_FILTERS[dateFilter]} <ChevronDown size={14} />
                    </button>
                </div>

                {showDatePicker && (
                    <div className="mt-md" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: '8px'
                    }}>
                        {Object.entries(DATE_FILTERS).map(([key, label]) => (
                            <button
                                key={key}
                                className={`btn ${dateFilter === key ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => {
                                    setDateFilter(key);
                                    if (key !== 'custom') setShowDatePicker(false);
                                }}
                                style={{ fontSize: '0.8rem', padding: '8px' }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                {dateFilter === 'custom' && (
                    <div className="flex gap-sm mt-md">
                        <div className="form-group" style={{ flex: 1, margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Başlangıç</label>
                            <input
                                type="date"
                                className="form-input"
                                value={customDateStart}
                                onChange={(e) => setCustomDateStart(e.target.value)}
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1, margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Bitiş</label>
                            <input
                                type="date"
                                className="form-input"
                                value={customDateEnd}
                                onChange={(e) => setCustomDateEnd(e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Status Filter */}
            <div className="flex gap-sm mb-md" style={{ overflowX: 'auto', paddingBottom: 8 }}>
                <button
                    className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setStatusFilter('all')}
                >
                    Tümü ({orders.length})
                </button>
                {Object.entries(STATUS_LABELS).map(([status, label]) => {
                    const count = orders.filter(o => o.status === status).length;
                    return (
                        <button
                            key={status}
                            className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setStatusFilter(status)}
                        >
                            {label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Orders */}
            {filteredOrders.length === 0 ? (
                <div className="empty-state">
                    <div className="icon">📋</div>
                    <p>Sipariş bulunamadı</p>
                    {(searchQuery || dateFilter !== 'all' || statusFilter !== 'all') && (
                        <button
                            className="btn btn-secondary mt-md"
                            onClick={() => {
                                setSearchQuery('');
                                setDateFilter('all');
                                setStatusFilter('all');
                            }}
                        >
                            Filtreleri Temizle
                        </button>
                    )}
                </div>
            ) : (
                Object.entries(ordersByDate).map(([date, dateOrders]) => (
                    <div key={date} className="mb-lg">
                        <h3 className="mb-sm text-muted">{date}</h3>
                        {dateOrders.map(order => {
                            const customer = getCustomer(order.customerId);
                            const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
                            const totalPrice = order.total || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

                            return (
                                <div
                                    key={order.id}
                                    className="card mb-sm"
                                    onClick={() => navigate(`/order/${order.id}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-lg">{customer?.name || 'Bilinmeyen'}</div>
                                            <div className="text-muted">
                                                {totalItems} ürün • #{order.id.slice(-6).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-success text-lg">{formatCurrency(totalPrice)}</div>
                                            <span className={`badge badge-${order.status}`}>
                                                {STATUS_LABELS[order.status]}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Items preview */}
                                    <div className="text-muted mt-sm" style={{ fontSize: '0.875rem' }}>
                                        {order.items.slice(0, 3).map(item =>
                                            `${item.quantity}x ${item.name}`
                                        ).join(', ')}
                                        {order.items.length > 3 && ` +${order.items.length - 3} daha...`}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))
            )}
        </div>
    );
}
