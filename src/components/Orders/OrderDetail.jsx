import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatDate, formatCurrency } from '../../hooks/useLocalStorage';
import { generateWhatsAppMessage, openWhatsApp } from '../../utils/whatsapp';

const STATUS_OPTIONS = [
    { value: 'new', label: 'Yeni', color: 'var(--accent-primary)' },
    { value: 'preparing', label: 'Hazırlanıyor', color: 'var(--accent-warning)' },
    { value: 'ready', label: 'Hazır', color: 'var(--accent-success)' },
    { value: 'delivered', label: 'Teslim Edildi', color: 'var(--accent-info)' }
];

export default function OrderDetail({ orders, customers, getOrder, getCustomer, updateOrder, deleteOrder }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const order = getOrder(id);
    const customer = order ? getCustomer(order.customerId) : null;

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    if (!order) {
        return (
            <div>
                <header className="header">
                    <button className="btn btn-icon btn-secondary" onClick={() => navigate(-1)}>
                        ←
                    </button>
                    <h1>Sipariş Bulunamadı</h1>
                    <div style={{ width: 40 }} />
                </header>
                <div className="empty-state">
                    <div className="icon">❌</div>
                    <p>Bu sipariş bulunamadı</p>
                </div>
            </div>
        );
    }

    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = order.shipping || 0;
    const total = subtotal + shipping;
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

    const handleStatusChange = (newStatus) => {
        updateOrder(order.id, { status: newStatus });
    };

    const handleWhatsApp = () => {
        if (!customer) return;
        const message = generateWhatsAppMessage(order, customer, order.items);
        openWhatsApp(customer.phone, message);
    };

    const handleDelete = () => {
        deleteOrder(order.id);
        navigate('/orders');
    };

    return (
        <div>
            <header className="header">
                <button className="btn btn-icon btn-secondary" onClick={() => navigate(-1)}>
                    ←
                </button>
                <h1>#{order.id.slice(-6).toUpperCase()}</h1>
                <div className="flex gap-sm">
                    <button
                        className="btn btn-icon btn-secondary"
                        onClick={() => navigate(`/edit-order/${order.id}`)}
                    >
                        ✏️
                    </button>
                    <button
                        className="btn btn-icon btn-secondary"
                        onClick={() => setShowDeleteConfirm(true)}
                        style={{ color: 'var(--accent-primary)' }}
                    >
                        🗑️
                    </button>
                </div>
            </header>

            {/* Status */}
            <div className="card mb-md">
                <h3 className="mb-md">Durum</h3>
                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                    {STATUS_OPTIONS.map(status => (
                        <button
                            key={status.value}
                            className={`btn ${order.status === status.value ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => handleStatusChange(status.value)}
                            style={order.status === status.value ? { background: status.color } : {}}
                        >
                            {status.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Customer Info */}
            <div className="card mb-md">
                <h3 className="mb-md">👤 Müşteri</h3>
                {customer ? (
                    <div>
                        <div className="font-bold text-lg">{customer.name}</div>
                        <div className="text-muted mt-sm">📞 {customer.phone}</div>
                        {customer.address && (
                            <div className="text-muted mt-sm">📍 {customer.address}</div>
                        )}
                    </div>
                ) : (
                    <p className="text-muted">Müşteri bilgisi bulunamadı</p>
                )}
            </div>

            {/* Order Date */}
            <div className="card mb-md">
                <div className="flex justify-between items-center">
                    <span className="text-muted">Sipariş Tarihi</span>
                    <span className="font-bold">{formatDate(order.date)}</span>
                </div>
            </div>

            {/* Order Items */}
            <div className="card mb-md">
                <h3 className="mb-md">📦 Ürünler ({totalItems} adet)</h3>
                {order.items.map((item, index) => (
                    <div key={index} className="order-item">
                        <div style={{ flex: 1 }}>
                            <div className="font-bold">
                                {item.name}
                                {item.variation && <span className="text-muted"> ({item.variation})</span>}
                            </div>
                            <div className="text-muted">€{item.price.toFixed(2)} × {item.quantity}</div>
                        </div>
                        <div className="font-bold text-lg">
                            €{(item.price * item.quantity).toFixed(2)}
                        </div>
                    </div>
                ))}

                <div className="flex flex-col gap-sm mt-lg" style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    <div className="flex justify-between items-center text-muted">
                        <span>Ara Toplam</span>
                        <span>€{subtotal.toFixed(2)}</span>
                    </div>
                    {shipping > 0 && (
                        <div className="flex justify-between items-center text-muted">
                            <span>Kargo</span>
                            <span>€{shipping.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-sm mt-xs" style={{ borderTop: '1px solid var(--border-color)' }}>
                        <span className="text-lg font-bold">Toplam</span>
                        <span className="text-2xl font-bold text-success">€{total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Notes */}
            {order.notes && (
                <div className="card mb-md">
                    <h3 className="mb-sm">📝 Not</h3>
                    <p>{order.notes}</p>
                </div>
            )}

            {/* WhatsApp Button */}
            <button
                className="btn btn-whatsapp btn-block btn-lg mb-md"
                onClick={handleWhatsApp}
                disabled={!customer}
            >
                📱 WhatsApp ile Gönder
            </button>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Siparişi Sil?</h2>
                            <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>×</button>
                        </div>
                        <p className="mb-lg">Bu siparişi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
                        <div className="flex gap-md">
                            <button
                                className="btn btn-secondary flex-1"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                İptal
                            </button>
                            <button
                                className="btn btn-primary flex-1"
                                onClick={handleDelete}
                                style={{ background: 'var(--accent-primary)' }}
                            >
                                Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
