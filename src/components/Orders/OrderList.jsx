import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatCurrency } from '../../hooks/useLocalStorage';

const STATUS_LABELS = {
    new: 'Yeni',
    preparing: 'Hazırlanıyor',
    ready: 'Hazır',
    delivered: 'Teslim Edildi'
};

export default function OrderList({ orders, customers, getCustomer }) {
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter orders
    const filteredOrders = orders.filter(order => {
        // Status filter
        if (statusFilter !== 'all' && order.status !== statusFilter) {
            return false;
        }

        // Search filter
        if (searchQuery) {
            const customer = getCustomer(order.customerId);
            const customerName = customer?.name?.toLowerCase() || '';
            const query = searchQuery.toLowerCase();

            if (!customerName.includes(query) && !order.id.includes(query)) {
                return false;
            }
        }

        return true;
    });

    // Group by date
    const ordersByDate = {};
    for (const order of filteredOrders) {
        const date = formatDate(order.date);
        if (!ordersByDate[date]) {
            ordersByDate[date] = [];
        }
        ordersByDate[date].push(order);
    }

    return (
        <div>
            <header className="header">
                <h1>📋 Siparişler</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/new-order')}
                >
                    + Yeni
                </button>
            </header>

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
                </div>
            ) : (
                Object.entries(ordersByDate).map(([date, dateOrders]) => (
                    <div key={date} className="mb-lg">
                        <h3 className="mb-sm text-muted">{date}</h3>
                        {dateOrders.map(order => {
                            const customer = getCustomer(order.customerId);
                            const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
                            const totalPrice = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
                                            <div className="font-bold text-success text-lg">€{totalPrice.toFixed(2)}</div>
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
