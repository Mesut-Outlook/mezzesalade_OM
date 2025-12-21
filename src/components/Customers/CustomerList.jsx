import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CustomerList({ customers, orders, addCustomer, updateCustomer, deleteCustomer }) {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
    const [saving, setSaving] = useState(false);

    // Filter customers
    const filteredCustomers = customers.filter(customer => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return customer.name.toLowerCase().includes(query) ||
            customer.phone.includes(query);
    });

    // Get order count for a customer
    const getOrderCount = (customerId) => {
        return orders.filter(o => o.customerId === customerId).length;
    };

    // Get total spent by customer
    const getTotalSpent = (customerId) => {
        return orders
            .filter(o => o.customerId === customerId)
            .reduce((sum, order) => {
                return sum + order.items.reduce((s, item) => s + (item.price * item.quantity), 0);
            }, 0);
    };

    // Open modal for new customer
    const handleNew = () => {
        setEditingCustomer(null);
        setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
        setShowModal(true);
    };

    // Open modal for editing customer
    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            phone: customer.phone,
            email: customer.email || '',
            address: customer.address || '',
            notes: customer.notes || ''
        });
        setShowModal(true);
    };

    // Save customer
    const handleSave = async () => {
        if (!formData.name || !formData.phone) {
            alert('İsim ve telefon zorunludur!');
            return;
        }

        setSaving(true);

        if (editingCustomer) {
            await updateCustomer(editingCustomer.id, formData);
        } else {
            await addCustomer(formData);
        }

        setSaving(false);
        setShowModal(false);
        setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
        setEditingCustomer(null);
    };

    // Delete customer
    const handleDelete = (customerId) => {
        if (confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) {
            deleteCustomer(customerId);
        }
    };

    return (
        <div>
            <header className="header">
                <h1>👥 Müşteriler</h1>
                <button className="btn btn-primary" onClick={handleNew}>
                    + Yeni
                </button>
            </header>

            {/* Search */}
            <div className="search-container">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Müşteri ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Customer List */}
            {filteredCustomers.length === 0 ? (
                <div className="empty-state">
                    <div className="icon">👥</div>
                    <p>Müşteri bulunamadı</p>
                    <button className="btn btn-primary mt-md" onClick={handleNew}>
                        + İlk Müşteriyi Ekle
                    </button>
                </div>
            ) : (
                <div>
                    {filteredCustomers.map(customer => {
                        const orderCount = getOrderCount(customer.id);
                        const totalSpent = getTotalSpent(customer.id);

                        return (
                            <div key={customer.id} className="customer-card">
                                <div className="flex justify-between items-start">
                                    <div style={{ flex: 1 }}>
                                        <div className="name">{customer.name}</div>
                                        <div className="phone">📞 {customer.phone}</div>
                                        {customer.email && (
                                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                                                ✉️ {customer.email}
                                            </div>
                                        )}
                                        {customer.address && (
                                            <div className="text-muted mt-sm" style={{ fontSize: '0.875rem' }}>
                                                📍 {customer.address}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-muted">{orderCount} sipariş</div>
                                        <div className="font-bold text-success">€{totalSpent.toFixed(2)}</div>
                                    </div>
                                </div>

                                {customer.notes && (
                                    <div className="text-muted mt-sm" style={{
                                        fontSize: '0.875rem',
                                        padding: 'var(--spacing-sm)',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: 'var(--radius-sm)'
                                    }}>
                                        📝 {customer.notes}
                                    </div>
                                )}

                                <div className="flex gap-sm mt-md">
                                    <button
                                        className="btn btn-secondary flex-1"
                                        onClick={() => handleEdit(customer)}
                                    >
                                        ✏️ Düzenle
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => handleDelete(customer.id)}
                                        style={{ color: 'var(--accent-primary)' }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Customer Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">İsim *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Müşteri adı"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Telefon *</label>
                            <input
                                type="tel"
                                className="form-input"
                                placeholder="+31 6 12345678"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="ornek@email.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Adres</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Teslimat adresi"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                style={{ minHeight: 80 }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Not</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Müşteri hakkında notlar"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                style={{ minHeight: 60 }}
                            />
                        </div>

                        <button className="btn btn-primary btn-block" onClick={handleSave} disabled={saving}>
                            {saving ? '⏳ Kaydediliyor...' : (editingCustomer ? 'Güncelle' : 'Kaydet')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
