import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAllProducts, searchProducts, getProductsByCategory } from '../../hooks/useProductMatcher';

export default function OrderForm({ customers, products = [], orders = [], addCustomer, addOrder, updateOrder }) {
    const navigate = useNavigate();
    const allProducts = getAllProducts(products);
    const productsByCategory = getProductsByCategory(products);

    // Form state
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [orderItems, setOrderItems] = useState([]);
    const [orderNotes, setOrderNotes] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [shippingFee, setShippingFee] = useState(0);

    // New customer form
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', notes: '' });

    // Product search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Editing mode logic
    const { id } = useParams();
    const isEditMode = !!id;

    useEffect(() => {
        if (isEditMode && orders.length > 0 && customers.length > 0) {
            const orderToEdit = orders.find(o => o.id === id);
            if (orderToEdit) {
                setOrderItems(orderToEdit.items || []);
                setOrderNotes(orderToEdit.notes || '');
                setOrderDate(orderToEdit.date);
                setShippingFee(orderToEdit.shipping || 0);
                const customer = customers.find(c => c.id === orderToEdit.customerId);
                if (customer) setSelectedCustomer(customer);
            }
        }
    }, [id, isEditMode, orders, customers, products]);

    // Handle product search
    const handleSearch = (query) => {
        setSearchQuery(query);
        if (query.length >= 2) {
            const results = searchProducts(query, products);
            setSearchResults(results);
        } else {
            setSearchResults([]);
        }
    };

    // Add product to order
    const addProductToOrder = (product, variation = null) => {
        const existingIndex = orderItems.findIndex(
            item => item.productId === product.id && item.variation === variation
        );

        if (existingIndex >= 0) {
            // Increase quantity
            const newItems = [...orderItems];
            newItems[existingIndex].quantity += 1;
            setOrderItems(newItems);
        } else {
            // Add new item
            let price = product.price;
            if (variation && product.variationPrices && product.variationPrices[variation]) {
                price = product.variationPrices[variation];
            }

            setOrderItems([...orderItems, {
                productId: product.id,
                name: product.name,
                price,
                quantity: 1,
                variation,
                category: product.category
            }]);
        }

        setShowProductModal(false);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedCategory(null);
    };

    // Update item quantity
    const updateQuantity = (index, delta) => {
        const newItems = [...orderItems];
        newItems[index].quantity += delta;

        if (newItems[index].quantity <= 0) {
            newItems.splice(index, 1);
        }

        setOrderItems(newItems);
    };

    // Update item price
    const updateItemPrice = (index, newPrice) => {
        const newItems = [...orderItems];
        newItems[index].price = parseFloat(newPrice) || 0;
        setOrderItems(newItems);
    };

    // Remove item
    const removeItem = (index) => {
        const newItems = [...orderItems];
        newItems.splice(index, 1);
        setOrderItems(newItems);
    };

    // Calculate total
    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + (parseFloat(shippingFee) || 0);

    // Save new customer
    const handleSaveCustomer = async () => {
        if (!newCustomer.name || !newCustomer.phone) {
            alert('İsim ve telefon zorunludur!');
            return;
        }

        const customer = await addCustomer(newCustomer);
        if (customer) {
            setSelectedCustomer(customer);
            setShowCustomerModal(false);
            setNewCustomer({ name: '', phone: '', address: '', notes: '' });
        }
    };

    // Submit order
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedCustomer) {
            alert('Lütfen müşteri seçin!');
            return;
        }

        if (orderItems.length === 0) {
            alert('Lütfen en az bir ürün ekleyin!');
            return;
        }

        setSubmitting(true);

        const order = {
            customerId: selectedCustomer.id,
            items: orderItems,
            notes: orderNotes,
            date: orderDate,
            shipping: parseFloat(shippingFee) || 0,
            status: isEditMode ? undefined : 'new',
            total
        };

        let result;
        if (isEditMode) {
            result = await updateOrder(id, order);
        } else {
            result = await addOrder(order);
        }
        setSubmitting(false);

        if (result) {
            navigate(`/order/${isEditMode ? id : result.id}`);
        }
    };

    return (
        <div>
            <header className="header">
                <button className="btn btn-icon btn-secondary" onClick={() => navigate(-1)}>
                    ←
                </button>
                <h1>{isEditMode ? '✏️ Siparişi Düzenle' : '📝 Yeni Sipariş'}</h1>
                <div style={{ width: 40 }} />
            </header>

            {/* Date Selection */}
            <div className="form-group">
                <label className="form-label">Sipariş Tarihi</label>
                <input
                    type="date"
                    className="form-input"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                />
            </div>

            {/* Customer Selection */}
            <div className="card mb-md">
                <h3 className="mb-md">👤 Müşteri</h3>

                {selectedCustomer ? (
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="font-bold">{selectedCustomer.name}</div>
                            <div className="text-muted">{selectedCustomer.phone}</div>
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setSelectedCustomer(null)}
                        >
                            Değiştir
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-sm flex-col">
                        <select
                            className="form-select"
                            onChange={(e) => {
                                const customer = customers.find(c => c.id === e.target.value);
                                setSelectedCustomer(customer);
                            }}
                            value=""
                        >
                            <option value="">Müşteri seçin...</option>
                            {customers.map(customer => (
                                <option key={customer.id} value={customer.id}>
                                    {customer.name} - {customer.phone}
                                </option>
                            ))}
                        </select>
                        <button
                            className="btn btn-secondary btn-block"
                            onClick={() => setShowCustomerModal(true)}
                        >
                            + Yeni Müşteri Ekle
                        </button>
                    </div>
                )}
            </div>

            {/* Order Items */}
            <div className="card mb-md">
                <div className="flex justify-between items-center mb-md">
                    <h3>📦 Ürünler</h3>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowProductModal(true)}
                    >
                        + Ürün Ekle
                    </button>
                </div>

                {orderItems.length === 0 ? (
                    <p className="text-muted text-center">Henüz ürün eklenmedi</p>
                ) : (
                    <div>
                        {orderItems.map((item, index) => (
                            <div key={`${item.productId}-${item.variation}-${index}`} className="order-item">
                                <div style={{ flex: 1 }}>
                                    <div className="font-bold">
                                        {item.name}
                                        {item.variation && <span className="text-muted"> ({item.variation})</span>}
                                    </div>
                                    <div className="flex items-center gap-xs">
                                        <span className="text-muted">€</span>
                                        <input
                                            type="number"
                                            className="form-input"
                                            style={{
                                                padding: '2px 4px',
                                                minHeight: 'auto',
                                                width: '60px',
                                                fontSize: '0.875rem',
                                                background: 'rgba(255,255,255,0.05)'
                                            }}
                                            value={item.price}
                                            onChange={(e) => updateItemPrice(index, e.target.value)}
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                                <div className="quantity">
                                    <button
                                        className="quantity-btn"
                                        onClick={() => updateQuantity(index, -1)}
                                    >
                                        −
                                    </button>
                                    <span style={{ minWidth: 25, textAlign: 'center' }}>{item.quantity}</span>
                                    <button
                                        className="quantity-btn"
                                        onClick={() => updateQuantity(index, 1)}
                                    >
                                        +
                                    </button>
                                </div>
                                <button
                                    className="btn btn-secondary btn-icon"
                                    onClick={() => removeItem(index)}
                                    style={{
                                        minWidth: 36,
                                        width: 36,
                                        height: 36,
                                        minHeight: 36,
                                        padding: 0,
                                        marginLeft: 8,
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    ❌
                                </button>
                                <div className="font-bold" style={{ minWidth: 60, textAlign: 'right', marginLeft: 8 }}>
                                    €{(item.price * item.quantity).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Shipping & Notes Row */}
            <div className="grid grid-2 gap-md">
                <div className="form-group">
                    <label className="form-label">🚚 Kargo Ücreti</label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }}>€</span>
                        <input
                            type="number"
                            className="form-input"
                            style={{ paddingLeft: 30 }}
                            value={shippingFee}
                            onChange={(e) => setShippingFee(e.target.value)}
                            step="0.01"
                            placeholder="0.00"
                        />
                    </div>
                </div>
            </div>

            {/* Order Notes */}
            <div className="form-group">
                <label className="form-label">📝 Sipariş Notu</label>
                <textarea
                    className="form-textarea"
                    placeholder="Özel istekler, notlar..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                />
            </div>

            {/* Total and Submit */}
            <div className="card" style={{ position: 'sticky', bottom: 100, zIndex: 90 }}>
                <div className="flex flex-col gap-xs mb-md">
                    <div className="flex justify-between items-center text-muted">
                        <span>Ara Toplam:</span>
                        <span>€{subtotal.toFixed(2)}</span>
                    </div>
                    {shippingFee > 0 && (
                        <div className="flex justify-between items-center text-muted">
                            <span>Kargo:</span>
                            <span>€{parseFloat(shippingFee).toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-sm border-top" style={{ borderTop: '1px solid var(--border-color)' }}>
                        <span className="text-lg">Toplam:</span>
                        <span className="text-2xl font-bold text-success">€{total.toFixed(2)}</span>
                    </div>
                </div>
                <button
                    className="btn btn-primary btn-block btn-lg"
                    onClick={handleSubmit}
                    disabled={!selectedCustomer || orderItems.length === 0 || submitting}
                >
                    {submitting ? '⏳ Kaydediliyor...' : (isEditMode ? '✓ Değişiklikleri Kaydet' : '✓ Siparişi Kaydet')}
                </button>
            </div>

            {/* Customer Modal */}
            {showCustomerModal && (
                <div className="modal-overlay" onClick={() => setShowCustomerModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Yeni Müşteri</h2>
                            <button className="modal-close" onClick={() => setShowCustomerModal(false)}>×</button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">İsim *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Müşteri adı"
                                value={newCustomer.name}
                                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Telefon *</label>
                            <input
                                type="tel"
                                className="form-input"
                                placeholder="+31 6 12345678"
                                value={newCustomer.phone}
                                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Adres</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Teslimat adresi"
                                value={newCustomer.address}
                                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                                style={{ minHeight: 80 }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Not</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Müşteri hakkında notlar"
                                value={newCustomer.notes}
                                onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                                style={{ minHeight: 60 }}
                            />
                        </div>

                        <button className="btn btn-primary btn-block" onClick={handleSaveCustomer}>
                            Müşteriyi Kaydet
                        </button>
                    </div>
                </div>
            )}

            {/* Product Modal */}
            {showProductModal && (
                <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh' }}>
                        <div className="modal-header">
                            <h2>Ürün Ekle</h2>
                            <button className="modal-close" onClick={() => setShowProductModal(false)}>×</button>
                        </div>

                        {/* Search */}
                        <div className="search-container">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Ürün ara..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mb-md">
                                <h4 className="mb-sm text-muted">Arama Sonuçları</h4>
                                {searchResults.map(product => (
                                    <ProductItem
                                        key={product.id}
                                        product={product}
                                        onSelect={addProductToOrder}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Categories */}
                        {!searchQuery && (
                            <div>
                                <h4 className="mb-sm text-muted">Kategoriler</h4>
                                <div className="flex gap-sm" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
                                    {Object.keys(productsByCategory).map(category => (
                                        <button
                                            key={category}
                                            className={`btn ${selectedCategory === category ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                                            style={{ fontSize: '0.875rem', padding: '8px 12px' }}
                                        >
                                            {category}
                                        </button>
                                    ))}
                                </div>

                                {/* Products in Selected Category */}
                                {selectedCategory && (
                                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                        {productsByCategory[selectedCategory].map(product => (
                                            <ProductItem
                                                key={product.id}
                                                product={product}
                                                onSelect={addProductToOrder}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Product Item Component
function ProductItem({ product, onSelect }) {
    const [showVariations, setShowVariations] = useState(false);

    const handleClick = () => {
        if (product.variations && product.variations.length > 0) {
            setShowVariations(!showVariations);
        } else {
            onSelect(product);
        }
    };

    return (
        <div>
            <div className="product-card" onClick={handleClick} style={{ cursor: 'pointer' }}>
                {product.image && (
                    <img src={product.image} alt={product.name} onError={(e) => e.target.style.display = 'none'} />
                )}
                <div className="info">
                    <div className="name">{product.name}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{product.category}</div>
                </div>
                <div className="price">€{product.price}</div>
                {product.variations && <span style={{ marginLeft: 8 }}>▼</span>}
            </div>

            {/* Variations */}
            {showVariations && product.variations && (
                <div style={{ marginLeft: 20, marginTop: 8, marginBottom: 8 }}>
                    {product.variations.map(variation => {
                        const price = product.variationPrices?.[variation] || product.price;
                        return (
                            <button
                                key={variation}
                                className="btn btn-secondary btn-block mb-sm"
                                onClick={() => onSelect(product, variation)}
                                style={{ justifyContent: 'space-between' }}
                            >
                                <span>{variation}</span>
                                <span>€{price}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
