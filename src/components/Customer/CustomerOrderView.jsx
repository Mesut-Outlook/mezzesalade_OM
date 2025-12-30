import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    parseOrderText,
    searchProducts,
    getProductsByCategory,
    getAllProducts
} from '../../hooks/useProductMatcher';
import { fetchCustomerByPhone, fetchOrdersByCustomerId } from '../../lib/supabase';
import { useLanguage } from '../../context/LanguageContext';
import './CustomerOrder.css';

export default function CustomerOrderView({ products = [], addOrder, addCustomer, updateOrder }) {
    const navigate = useNavigate();
    const { lang, setLang, t } = useLanguage();

    // Diet Filters state
    const [dietFilter, setDietFilter] = useState(null); // 'V', 'VG', 'GF', 'N'

    // Filter products by diet
    const filteredProducts = products.filter(p => {
        if (!dietFilter) return true;
        return (p.dietary_tags || []).includes(dietFilter);
    });

    const productsByCategory = getProductsByCategory(filteredProducts);

    // UI state
    const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'ai'
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [identifying, setIdentifying] = useState(false);
    const [toast, setToast] = useState(null);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [showSummary, setShowSummary] = useState(false);
    const cartRef = useRef(null);

    // Thumbnail helper for Supabase images
    const getThumbnail = (imageUrl) => {
        if (!imageUrl || !imageUrl.includes('supabase.co')) return imageUrl;
        // Basic resolution optimization for menu thumbnails
        if (imageUrl.includes('/object/public/')) {
            return imageUrl.replace('/object/public/', '/render/image/public/') + '?width=200&height=200&resize=cover';
        }
        return imageUrl;
    };

    // Identity state
    const [showLogin, setShowLogin] = useState(true);
    const [loginPhone, setLoginPhone] = useState('');
    const [isIdentified, setIsIdentified] = useState(false);
    const [customerHistory, setCustomerHistory] = useState([]);

    // Order state
    const [editingOrder, setEditingOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [deliveryMethod, setDeliveryMethod] = useState('home'); // 'home' or 'pickup'
    const [customerInfo, setCustomerInfo] = useState({ id: null, name: '', phone: '', address: '' });
    const [orderNotes, setOrderNotes] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);

    // AI state
    const [aiText, setAiText] = useState('');

    // Manual Selection state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Auto-select first category when products load
    useEffect(() => {
        if (!selectedCategory && Object.keys(productsByCategory).length > 0) {
            setSelectedCategory(Object.keys(productsByCategory)[0]);
        }
    }, [productsByCategory, selectedCategory]);

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingFee = deliveryMethod === 'home' ? 10 : 0;
    const total = subtotal + shippingFee;

    // Handle Manual Search
    useEffect(() => {
        if (searchQuery.length >= 2) {
            setSearchResults(searchProducts(searchQuery, products));
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, products]);

    // Toast Timer
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (msg) => {
        setToast(msg);
    };

    // Handle Identification
    const handleIdentify = async (e) => {
        if (e) e.preventDefault();
        if (!loginPhone || loginPhone.length < 9) return;

        setIdentifying(true);
        const customer = await fetchCustomerByPhone(loginPhone);

        if (customer) {
            setCustomerInfo({
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                address: customer.address || ''
            });
            setIsIdentified(true);
            setShowLogin(false);

            // Fetch history
            fetchHistory(customer.id);
        } else {
            // New customer, just proceed to form
            setCustomerInfo(prev => ({ ...prev, phone: loginPhone }));
            setShowLogin(false);
        }
        setIdentifying(false);
    };

    const fetchHistory = async (customerId) => {
        const history = await fetchOrdersByCustomerId(customerId);
        setCustomerHistory(history);
    };

    const handleLogout = () => {
        setIsIdentified(false);
        setCustomerInfo({ id: null, name: '', phone: '', address: '' });
        setCustomerHistory([]);
        setShowLogin(true);
        setLoginPhone('');
        setEditingOrder(null);
        setOrderItems([]);
    };

    // Load order for editing
    const handleEditOrder = (order) => {
        if (order.status !== 'new') {
            alert(t('cannot_edit'));
            return;
        }

        setEditingOrder(order);
        setOrderItems(order.items.map(it => ({
            ...it,
            productId: it.productId || it.product_id
        })));
        setDeliveryMethod(order.shipping > 0 ? 'home' : 'pickup');
        setOrderDate(order.date);

        const cleanNotes = order.notes ? order.notes.replace(' (Delivery)', '').replace(' (Pickup)', '') : '';
        setOrderNotes(cleanNotes);

        window.scrollTo(0, 0);
        setActiveTab('manual');
    };

    const cancelEdit = () => {
        setEditingOrder(null);
        setOrderItems([]);
        setOrderNotes('');
        setOrderDate(new Date().toISOString().split('T')[0]);
    };

    // Add product to order
    const addProductToOrder = (product, variation = null) => {
        const existingIndex = orderItems.findIndex(
            item => (item.productId === product.id || item.product_id === product.id) && item.variation === variation
        );

        if (existingIndex >= 0) {
            const newItems = [...orderItems];
            newItems[existingIndex].quantity += 1;
            setOrderItems(newItems);
        } else {
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
        showToast(t('added_to_cart'));
    };

    const updateQuantity = (index, delta) => {
        const newItems = [...orderItems];
        newItems[index].quantity += delta;
        if (newItems[index].quantity <= 0) {
            newItems.splice(index, 1);
        }
        setOrderItems(newItems);
    };

    const scrollToCart = () => {
        if (cartRef.current) {
            cartRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const totalItemsCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);

    // AI Parsing
    const handleAiParse = () => {
        if (!aiText.trim()) return;
        const result = parseOrderText(aiText, products);

        const newItems = result.products
            .filter(r => r.match)
            .map(r => ({
                productId: r.match.product.id,
                name: r.match.product.name,
                price: r.match.product.variationPrices?.[r.variation] || r.match.product.price,
                quantity: r.quantity,
                variation: r.variation || null,
                category: r.match.product.category
            }));

        if (newItems.length > 0) {
            setOrderItems(prev => [...prev, ...newItems]);
            setActiveTab('manual');
            setAiText('');
            showToast(t('added_to_cart'));
        }
    };

    const openSummary = (e) => {
        e.preventDefault();
        if (orderItems.length === 0) return;
        if (!customerInfo.name || !customerInfo.phone) return;
        if (deliveryMethod === 'home' && !customerInfo.address) return;
        setShowSummary(true);
    };

    const handleSubmit = async () => {
        setShowSummary(false);
        setSubmitting(true);
        try {
            // 1. Create/Find Customer
            let currentCustomerId = customerInfo.id;

            // If not identified, check if customer already exists by phone
            if (!currentCustomerId && customerInfo.phone) {
                const existing = await fetchCustomerByPhone(customerInfo.phone);
                if (existing) {
                    currentCustomerId = existing.id;
                }
            }

            if (!currentCustomerId) {
                const customer = await addCustomer({
                    name: customerInfo.name,
                    phone: customerInfo.phone,
                    address: customerInfo.address,
                    notes: 'Yeni Müşteri (Online)'
                });
                if (customer) currentCustomerId = customer.id;
            }

            if (!currentCustomerId) throw new Error('Customer error');

            const orderData = {
                customerId: currentCustomerId,
                items: orderItems,
                notes: orderNotes + (deliveryMethod === 'home' ? ' (Delivery)' : ' (Pickup)'),
                date: orderDate,
                shipping: shippingFee,
                status: editingOrder ? editingOrder.status : 'new',
                total
            };

            let result;
            if (editingOrder) {
                result = await updateOrder(editingOrder.id, orderData);
                console.log('🔔 Notification: Order updated', editingOrder.id);
            } else {
                result = await addOrder(orderData);
                console.log('🔔 Notification: New order', result?.id);
            }

            if (result) {
                setOrderSuccess(true);
                window.scrollTo(0, 0);
                if (isIdentified) fetchHistory(customerInfo.id);
            }
        } catch (error) {
            console.error('Order error:', error);
            alert('Hata oluştu: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (orderSuccess) {
        return (
            <div className="customer-container success-page">
                <div className="success-card">
                    <div className="success-icon">✅</div>
                    <h1>{t('success_title')}</h1>
                    <p>{t('success_message')}</p>
                    <div className="order-summary-box">
                        <h3>{t('order_summary')}</h3>
                        <p><strong>{t('total')}:</strong> €{total.toFixed(2)}</p>
                        <p><strong>{t('delivery_method')}:</strong> {deliveryMethod === 'home' ? `🏠 ${t('home_delivery')}` : `🛍️ ${t('pickup')}`}</p>
                        {deliveryMethod === 'home' && customerInfo.address && (
                            <p><strong>{t('address')}:</strong> {customerInfo.address}</p>
                        )}
                    </div>
                    <button className="btn btn-primary" onClick={() => setOrderSuccess(false)}>
                        {t('new_order_btn')}
                    </button>
                </div>
            </div>
        );
    }

    if (showLogin) {
        return (
            <div className="customer-container login-page">
                <header className="customer-header">
                    <img src="/images/logo.png" alt="Mezzesalade" className="customer-logo" />
                    <h1>Mezzesalade</h1>
                </header>
                <div className="lang-switch-fixed">
                    {['tr', 'en', 'nl'].map(l => (
                        <button
                            key={l}
                            id={`lang-btn-login-${l}`}
                            className={`lang-btn ${lang === l ? 'active' : ''}`}
                            onClick={() => setLang(l)}
                            aria-label={`Change language to ${l.toUpperCase()}`}
                        >
                            <span className="lang-flag">
                                {l === 'tr' ? '🇹🇷' : l === 'en' ? '🇬🇧' : '🇳🇱'}
                            </span>
                            <span className="lang-text">{l.toUpperCase()}</span>
                        </button>
                    ))}
                </div>
                <div className="customer-main">
                    <div className="card login-card">
                        <h3>{t('online_order')}</h3>
                        <p className="text-muted mb-lg">{t('login_msg')}</p>
                        <form onSubmit={handleIdentify}>
                            <div className="form-group">
                                <label>{t('phone_number')}</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    placeholder="06... / +31..."
                                    value={loginPhone}
                                    onChange={(e) => setLoginPhone(e.target.value)}
                                    required
                                />
                            </div>
                            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={identifying}>
                                {identifying ? t('identifying') : t('login_btn')}
                            </button>
                        </form>
                        <div className="mt-lg pt-md border-top tip-section">
                            <p className="text-muted tip-text">
                                <span className="tip-icon">💡</span> {t('shortcut_tip')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="customer-container">
            {toast && <div className="toast-message">{toast}</div>}

            {lightboxImage && (
                <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
                    <div className="lightbox-content" onClick={e => e.stopPropagation()}>
                        <img src={lightboxImage} alt="Large format" />
                        <button className="lightbox-close" onClick={() => setLightboxImage(null)}>×</button>
                    </div>
                </div>
            )}

            {showSummary && (
                <div className="modal-overlay" onClick={() => setShowSummary(false)}>
                    <div className="modal summary-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📋 {t('order_overview')}</h2>
                            <button className="modal-close" onClick={() => setShowSummary(false)}>×</button>
                        </div>
                        <div className="summary-content">
                            <div className="summary-items">
                                {orderItems.map((it, idx) => (
                                    <div key={idx} className="summary-item">
                                        <span>{it.quantity}x {it.name} {it.variation ? `(${it.variation})` : ''}</span>
                                        <span>€{(it.price * it.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="summary-footer mt-md">
                                <div className="flex justify-between">
                                    <span>{t('subtotal')}</span>
                                    <span>€{subtotal.toFixed(2)}</span>
                                </div>
                                {shippingFee > 0 && (
                                    <div className="flex justify-between">
                                        <span>{t('delivery_fee')}</span>
                                        <span>€{shippingFee.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-lg mt-sm pt-sm border-top">
                                    <span>{t('total')}</span>
                                    <span>€{total.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="summary-details mt-md pt-md border-top">
                                <p>👤 <strong>{customerInfo.name}</strong></p>
                                <p>📅 <strong>{orderDate}</strong></p>
                                <p>🚚 <strong>{deliveryMethod === 'home' ? t('home_delivery') : t('pickup')}</strong></p>
                                {deliveryMethod === 'home' && <p>📍 {customerInfo.address}</p>}
                            </div>
                        </div>
                        <div className="modal-actions mt-lg">
                            <button className="btn btn-secondary flex-1" onClick={() => setShowSummary(false)}>
                                ✏️ {t('edit_order')}
                            </button>
                            <button className="btn btn-primary flex-1" onClick={handleSubmit} disabled={submitting}>
                                {submitting ? '...' : `✓ ${t('confirm_and_send')}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="customer-header">
                <div className="header-top">
                    <img src="/images/logo.png" alt="Mezzesalade" className="customer-logo" />
                    <div className="lang-switch">
                        {['tr', 'en', 'nl'].map(l => (
                            <button
                                key={l}
                                id={`lang-btn-header-${l}`}
                                className={`lang-btn ${lang === l ? 'active' : ''}`}
                                onClick={() => setLang(l)}
                                aria-label={`Change language to ${l.toUpperCase()}`}
                            >
                                <span className="lang-flag">
                                    {l === 'tr' ? '🇹🇷' : l === 'en' ? '🇬🇧' : '🇳🇱'}
                                </span>
                                <span className="lang-text">{l.toUpperCase()}</span>
                            </button>
                        ))}
                    </div>
                    {orderItems.length > 0 && (
                        <button className="header-cart-btn" onClick={scrollToCart} aria-label="Go to cart">
                            <span className="cart-icon">🛒</span>
                            <span className="cart-badge">{totalItemsCount}</span>
                        </button>
                    )}
                </div>
                <h1>{t('online_order')}</h1>
                {isIdentified && (
                    <div className="user-welcome">
                        <span>👋 {t('your_info')}: <strong>{customerInfo.name}</strong></span>
                        <button className="logout-link" onClick={handleLogout}>{t('logout')}</button>
                    </div>
                )}
            </header>

            <div className="tab-container">
                <button
                    className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
                    onClick={() => setActiveTab('manual')}
                >
                    🛍️ {t('select_product')}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ai')}
                >
                    🤖 {t('write_order')}
                </button>
            </div>

            <main className="customer-main">
                {editingOrder && (
                    <div className="edit-banner">
                        <span>📝 {t('update_order')}: #{editingOrder.id.slice(-6).toUpperCase()}</span>
                        <button className="btn btn-sm" onClick={cancelEdit}>✕</button>
                    </div>
                )}

                {activeTab === 'ai' ? (
                    <div className="ai-section card">
                        <h3>{t('write_order')}</h3>
                        <p className="text-muted mb-md">{t('ai_placeholder')}</p>
                        <textarea
                            className="form-textarea"
                            value={aiText}
                            onChange={(e) => setAiText(e.target.value)}
                            placeholder={t('ai_placeholder')}
                            rows={5}
                        />
                        <button className="btn btn-primary btn-block mt-md" onClick={handleAiParse}>
                            🪄 {t('add_to_list')}
                        </button>
                    </div>
                ) : (
                    <div className="selection-section">
                        <div className="search-wrap">
                            <input
                                type="text"
                                className="search-input"
                                placeholder={t('select_product') + "..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button className="search-clear-btn" onClick={() => setSearchQuery('')}>×</button>
                            )}
                        </div>

                        {/* Diet Filters */}
                        <div className="diet-filters">
                            <span className="diet-filter-label">{t('filter_by_diet')}:</span>
                            <div className="diet-chips">
                                {[
                                    { id: 'V', label: 'V' },
                                    { id: 'VG', label: 'VG' },
                                    { id: 'GF', label: 'GF' },
                                    { id: 'N', label: 'N' }
                                ].map(chip => (
                                    <button
                                        key={chip.id}
                                        className={`diet-chip ${dietFilter === chip.id ? 'active' : ''} diet-tag-${chip.id}`}
                                        onClick={() => setDietFilter(dietFilter === chip.id ? null : chip.id)}
                                        title={t(`diet_${chip.id.toLowerCase()}`)}
                                    >
                                        {chip.id}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {searchResults.length > 0 ? (
                            <div className="product-grid">
                                {searchResults.map(p => (
                                    <ProductCard
                                        key={p.id}
                                        product={p}
                                        onAdd={addProductToOrder}
                                        onImageClick={(img) => setLightboxImage(img)}
                                        getThumbnail={getThumbnail}
                                    />
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="category-scroll">
                                    {Object.keys(productsByCategory).map(cat => (
                                        <button
                                            key={cat}
                                            className={`cat-tab ${selectedCategory === cat ? 'active' : ''}`}
                                            onClick={() => setSelectedCategory(cat)}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                                <div className="product-grid">
                                    {selectedCategory && productsByCategory[selectedCategory]?.map(p => (
                                        <ProductCard
                                            key={p.id}
                                            product={p}
                                            onAdd={addProductToOrder}
                                            onImageClick={(img) => setLightboxImage(img)}
                                            getThumbnail={getThumbnail}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Shopping Cart */}
                {orderItems.length > 0 && (
                    <div className="cart-section card mt-lg" ref={cartRef}>
                        <h3>🛒 {t('cart')}</h3>
                        <div className="cart-items">
                            {orderItems.map((item, idx) => (
                                <div key={idx} className="cart-item">
                                    <div className="cart-item-info">
                                        <span className="cart-item-name">{item.name}</span>
                                        <span className="cart-item-price">€{item.price.toFixed(2)}</span>
                                    </div>
                                    <div className="cart-item-controls">
                                        <button type="button" className="qty-btn" onClick={() => updateQuantity(idx, -1)}>−</button>
                                        <span className="qty-val">{item.quantity}</span>
                                        <button type="button" className="qty-btn" onClick={() => updateQuantity(idx, 1)}>+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Delivery & Contact */}
                <form className="order-form card mt-lg" onSubmit={openSummary}>
                    <h3>🚚 {t('delivery_method')}</h3>
                    <div className="delivery-toggle mb-lg">
                        <button
                            type="button"
                            className={`delivery-btn ${deliveryMethod === 'home' ? 'active' : ''}`}
                            onClick={() => setDeliveryMethod('home')}
                        >
                            🏠 {t('home_delivery')} (+€10)
                        </button>
                        <button
                            type="button"
                            className={`delivery-btn ${deliveryMethod === 'pickup' ? 'active' : ''}`}
                            onClick={() => setDeliveryMethod('pickup')}
                        >
                            🛍️ {t('pickup')}
                        </button>
                    </div>

                    {deliveryMethod === 'pickup' && (
                        <div className="pickup-card mb-lg">
                            <h4>📍 {t('pickup_address_title')}</h4>
                            <p className="pickup-addr">Knokkestraat 5, 1066 WK Amsterdam</p>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm mt-sm"
                                onClick={() => window.open('https://www.google.com/maps/dir/?api=1&destination=Knokkestraat+5,+1066+WK+Amsterdam', '_blank')}
                            >
                                🗺️ {t('get_directions')}
                            </button>
                        </div>
                    )}

                    <h3>👤 {t('your_info')}</h3>
                    {!isIdentified && (
                        <p className="text-muted mb-md" style={{ fontSize: '0.85rem' }}>
                            {t('login_msg')}
                        </p>
                    )}
                    <div className="form-group">
                        <label>{t('full_name')} *</label>
                        <input
                            type="text"
                            required
                            className="form-input"
                            value={customerInfo.name}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('phone_number')} *</label>
                        <input
                            type="tel"
                            required
                            className="form-input"
                            value={customerInfo.phone}
                            readOnly={isIdentified}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('address')} {deliveryMethod === 'home' && '*'}</label>
                        <textarea
                            required={deliveryMethod === 'home'}
                            className="form-input"
                            placeholder={deliveryMethod === 'home' ? t('address') + "..." : t('address') + " (" + t('optional') + ")"}
                            value={customerInfo.address}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                            style={{ minHeight: 80 }}
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('order_date')} *</label>
                        <input
                            type="date"
                            required
                            className="form-input"
                            value={orderDate}
                            onChange={(e) => setOrderDate(e.target.value)}
                        />
                        <p className="text-muted mt-xs" style={{ fontSize: '0.75rem' }}>
                            {t('date_confirmation_note')}
                        </p>
                    </div>

                    <div className="form-group">
                        <label>{t('notes')}</label>
                        <textarea
                            className="form-input"
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                            placeholder={t('notes_placeholder')}
                        />
                    </div>

                    <div className="total-box mt-lg">
                        <div className="total-row">
                            <span>{t('subtotal')}:</span>
                            <span>€{subtotal.toFixed(2)}</span>
                        </div>
                        {shippingFee > 0 && (
                            <div className="total-row">
                                <span>{t('delivery_fee')}:</span>
                                <span>€{shippingFee.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="total-row grand-total">
                            <span>{t('total')}:</span>
                            <span>€{total.toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-block btn-lg mt-lg"
                        disabled={submitting || orderItems.length === 0}
                    >
                        {submitting ? '...' : `✓ ${editingOrder ? t('update_order') : t('confirm_order')}`}
                    </button>
                    {editingOrder && (
                        <button type="button" className="btn btn-secondary btn-block mt-md" onClick={cancelEdit}>
                            {t('cancel')}
                        </button>
                    )}
                </form>

                {/* History Section */}
                {isIdentified && customerHistory.length > 0 && (
                    <div className="card mt-lg history-card">
                        <h3>📜 {t('previous_orders')}</h3>
                        <div className="history-list">
                            {customerHistory.map((h, i) => (
                                <div key={i} className={`history-item ${editingOrder?.id === h.id ? 'editing' : ''}`}>
                                    <div className="history-header">
                                        <span className="h-date">{new Date(h.date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-GB')}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span className={`status-badge status-${h.status}`}>
                                                {t(`status_${h.status}`)}
                                            </span>
                                            <span className="h-total">€{h.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="h-items">
                                        {h.items.map((it, j) => (
                                            <span key={j}>{it.quantity}x {it.name}{j < h.items.length - 1 ? ', ' : ''}</span>
                                        ))}
                                    </div>
                                    {h.status === 'new' && (
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-edit-h"
                                            onClick={() => handleEditOrder(h)}
                                        >
                                            ✏️ {t('edit')}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <footer className="customer-footer">
                <p>&copy; {new Date().getFullYear()} Mezzesalade Ottoman Mission</p>
            </footer>
        </div>
    );
}

// Sub-components
function ProductCard({ product, onAdd, onImageClick, getThumbnail }) {
    const [selectedVariation, setSelectedVariation] = useState(
        product.variationPrices && Object.keys(product.variationPrices).length > 0
            ? Object.keys(product.variationPrices)[0]
            : null
    );

    const price = selectedVariation && product.variationPrices
        ? product.variationPrices[selectedVariation]
        : product.price;

    return (
        <div className="p-card">
            <div className="p-image" onClick={() => onImageClick(product.image || 'https://via.placeholder.com/150')}>
                <img
                    src={getThumbnail(product.image) || 'https://via.placeholder.com/150'}
                    alt={product.name}
                    loading="lazy"
                />
                <div className="p-zoom-hint">🔍</div>
            </div>
            <div className="p-content">
                <div>
                    <div className="p-header-row">
                        <div className="p-name">{product.name}</div>
                        <div className="p-diet-tags">
                            {(product.dietary_tags || []).map(tag => (
                                <span key={tag} className={`p-diet-tag p-diet-tag-${tag}`}>{tag}</span>
                            ))}
                        </div>
                    </div>
                    <p className="p-desc">{product.description}</p>
                </div>

                {product.variationPrices && Object.keys(product.variationPrices).length > 0 && (
                    <div className="p-variations mb-sm">
                        <select
                            className="form-input"
                            style={{ padding: '2px 4px', fontSize: '0.8rem', height: 'auto', minHeight: 'auto' }}
                            value={selectedVariation}
                            onChange={(e) => setSelectedVariation(e.target.value)}
                        >
                            {Object.keys(product.variationPrices).map(v => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="p-footer">
                    <span className="p-price">€{price.toFixed(2)}</span>
                    <button className="p-add-btn" onClick={() => onAdd(product, selectedVariation)}>
                        +
                    </button>
                </div>
            </div>
        </div>
    );
}
