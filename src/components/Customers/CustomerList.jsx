import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { calculateSubtotal } from '../../utils/orderUtils';
import CustomerFormModal from '../shared/CustomerFormModal';

export default function CustomerList({ customers, orders, addCustomer, updateCustomer, deleteCustomer }) {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    // Filter customers
    const filteredCustomers = customers.filter(customer => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return customer.name.toLowerCase().includes(query) ||
            customer.phone.includes(query);
    });

    // Get order count for a customer
    const getOrderCount = (customerId) => {
        return orders.filter(o => String(o.customerId) === String(customerId)).length;
    };

    // Get total spent by customer
    const getTotalSpent = (customerId) => {
        return orders
            .filter(o => String(o.customerId) === String(customerId))
            .reduce((sum, order) => sum + calculateSubtotal(order.items), 0);
    };

    // Open modal for new customer
    const handleNew = () => {
        setEditingCustomer(null);
        setShowModal(true);
    };

    // Open modal for editing customer
    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setShowModal(true);
    };

    // Save customer
    const handleSave = async (formData) => {
        if (editingCustomer) {
            await updateCustomer(editingCustomer.id, formData);
        } else {
            await addCustomer(formData);
        }

        setShowModal(false);
        setEditingCustomer(null);
    };

    // Delete customer
    const handleDelete = (customerId) => {
        if (confirm(t('delete_customer_confirm'))) {
            deleteCustomer(customerId);
        }
    };

    return (
        <div>
            <header className="header">
                <h1>{t('customers_title')}</h1>
                <button className="btn btn-primary" onClick={handleNew}>
                    {t('new_btn')}
                </button>
            </header>

            {/* Search */}
            <div className="search-container">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    className="search-input"
                    placeholder={t('search_customers_placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Customer List */}
            {filteredCustomers.length === 0 ? (
                <div className="empty-state">
                    <div className="icon">👥</div>
                    <p>{t('no_customers_found')}</p>
                    <button className="btn btn-primary mt-md" onClick={handleNew}>
                        {t('add_first_customer')}
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
                                        <div className="text-muted">{orderCount} {t('orders_count_label')}</div>
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
                                        ✏️ {t('edit')}
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
            <CustomerFormModal
                visible={showModal}
                onClose={() => { setShowModal(false); setEditingCustomer(null); }}
                onSave={handleSave}
                initialData={editingCustomer ? {
                    name: editingCustomer.name,
                    phone: editingCustomer.phone,
                    email: editingCustomer.email || '',
                    address: editingCustomer.address || '',
                    notes: editingCustomer.notes || ''
                } : {}}
                title={editingCustomer ? t('edit_customer_title') : t('new_customer_title')}
                showEmail={true}
                labels={{
                    name: `${t('name_label')} *`,
                    phone: `${t('phone_label')} *`,
                    email: t('email_label'),
                    address: t('address_label'),
                    notes: t('note_label'),
                    save: editingCustomer ? t('update_btn') : t('save'),
                    saving: t('saving_btn'),
                    validation: t('validation_name_phone')
                }}
                placeholders={{
                    name: t('name_placeholder'),
                    phone: '+31 6 ...',
                    email: t('email_placeholder'),
                    address: t('address_placeholder'),
                    notes: t('notes_placeholder')
                }}
            />
        </div>
    );
}
