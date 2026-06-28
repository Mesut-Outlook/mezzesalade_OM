import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../hooks/useLocalStorage';
import { useLanguage } from '../../context/LanguageContext';
import { STATUS_LABELS } from '../../utils/constants';
import OrderCard from '../shared/OrderCard';

export default function OrderList({ orders, customers, getCustomer }) {
    const navigate = useNavigate();
    const { t } = useLanguage();
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
                <h1>📋 {t('all_orders')}</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/new-order')}
                >
                    + {t('new_btn')}
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
                            return (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    customerName={customer?.name || t('unknown')}
                                    statusLabel={STATUS_LABELS[order.status]}
                                />
                            );
                        })}
                    </div>
                ))
            )}
        </div>
    );
}
