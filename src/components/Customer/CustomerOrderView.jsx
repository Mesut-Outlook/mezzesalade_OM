import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    parseOrderText,
    searchProducts,
    getProductsByCategory,
    getAllProducts
} from '../../hooks/useProductMatcher';
import './CustomerOrder.css';

export default function CustomerOrderView({ products = [], addOrder, addCustomer }) {
    const navigate = useNavigate();
    const productsByCategory = getProductsByCategory(products);

    // UI state
    const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'ai'
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Order state
    const [orderItems, setOrderItems] = useState([]);
    const [deliveryMethod, setDeliveryMethod] = useState('home'); // 'home' or 'pickup'
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
    const [orderNotes, setOrderNotes] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);

    // AI state
    const [aiText, setAiText] = useState('');
    const [aiResults, setAiResults] = useState([]);

    // Manual Selection state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(Object.keys(productsByCategory)[0] || null);

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

    // Add product to order
    const addProductToOrder = (product, variation = null) => {
        const existingIndex = orderItems.findIndex(
            item => item.productId === product.id && item.variation === variation
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
    };

    const updateQuantity = (index, delta) => {
        const newItems = [...orderItems];
        newItems[index].quantity += delta;
        if (newItems[index].quantity <= 0) {
            newItems.splice(index, 1);
        }
        setOrderItems(newItems);
    };

    // AI Parsing
    const handleAiParse = () => {
        if (!aiText.trim()) return;
        const result = parseOrderText(aiText, products);

        // Convert AI results to order items
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
            setOrderItems(prev => {
                // Merge common items or just add? Let's add and let user adjust
                return [...prev, ...newItems];
            });
            setActiveTab('manual');
            setAiText('');
            alert(`${newItems.length} ürün listenize eklendi!`);
        } else {
            alert('Üzgünüz, yazdıklarınızdan herhangi bir ürün eşleştiremedik.');
        }

        // Fill metadata if available
        if (result.metadata.name) setCustomerInfo(prev => ({ ...prev, name: result.metadata.name }));
        if (result.metadata.phone) setCustomerInfo(prev => ({ ...prev, phone: result.metadata.phone }));
        if (result.metadata.address) setCustomerInfo(prev => ({ ...prev, address: result.metadata.address }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (orderItems.length === 0) {
            alert('Lütfen en az bir ürün ekleyin!');
            return;
        }
        if (!customerInfo.name || !customerInfo.phone) {
            alert('Lütfen isim ve telefon bilgilerinizi girin!');
            return;
        }

        setSubmitting(true);
        try {
            // 1. Create/Find Customer
            const customer = await addCustomer({
                name: customerInfo.name,
                phone: customerInfo.phone,
                address: customerInfo.address,
                notes: 'Müşteri tarafından oluşturuldu'
            });

            if (!customer) throw new Error('Müşteri oluşturulamadı');

            // 2. Create Order
            const order = {
                customerId: customer.id,
                items: orderItems,
                notes: orderNotes + (deliveryMethod === 'home' ? ' (Eve Teslimat İstiyor)' : ' (Evden Alacak)'),
                date: orderDate,
                shipping: shippingFee,
                status: 'new',
                total
            };

            const result = await addOrder(order);
            if (result) {
                setOrderSuccess(true);
                window.scrollTo(0, 0);
            }
        } catch (error) {
            console.error('Order error:', error);
            alert('Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setSubmitting(false);
        }
    };

    if (orderSuccess) {
        return (
            <div className="customer-container success-page">
                <div className="success-card">
                    <div className="success-icon">✅</div>
                    <h1>Siparişiniz Alındı!</h1>
                    <p>Mezzesalade'yi tercih ettiğiniz için teşekkür ederiz.</p>
                    <div className="order-summary-box">
                        <h3>Sipariş Özeti</h3>
                        <p><strong>Toplam:</strong> €{total.toFixed(2)}</p>
                        <p><strong>Yöntem:</strong> {deliveryMethod === 'home' ? '🏠 Eve Teslimat' : '🛍️ Evden Alacak'}</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => window.location.reload()}>
                        Yeni Sipariş Oluştur
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="customer-container">
            <header className="customer-header">
                <img src="/images/logo.png" alt="Mezzesalade" className="customer-logo" />
                <h1>Online Sipariş</h1>
            </header>

            <div className="tab-container">
                <button
                    className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
                    onClick={() => setActiveTab('manual')}
                >
                    🛍️ Ürün Seç
                </button>
                <button
                    className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ai')}
                >
                    🤖 Yazarak Sipariş
                </button>
            </div>

            <main className="customer-main">
                {activeTab === 'ai' ? (
                    <div className="ai-section card">
                        <h3>Siparişinizi Buraya Yazın</h3>
                        <p className="text-muted mb-md">WhatsApp mesajı gibi yazabilirsiniz. Örneğin: "2 Mercimek çorbası, 1 porsiyon İçli Köfte"</p>
                        <textarea
                            className="form-textarea"
                            value={aiText}
                            onChange={(e) => setAiText(e.target.value)}
                            placeholder="Siparişinizi buraya yazın..."
                            rows={5}
                        />
                        <button className="btn btn-primary btn-block mt-md" onClick={handleAiParse}>
                            🪄 Listeye Ekle
                        </button>
                    </div>
                ) : (
                    <div className="selection-section">
                        {/* Search */}
                        <div className="search-wrap">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Ürün ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Search Results or Categories */}
                        {searchResults.length > 0 ? (
                            <div className="product-grid">
                                {searchResults.map(p => (
                                    <ProductCard key={p.id} product={p} onAdd={addProductToOrder} />
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
                                        <ProductCard key={p.id} product={p} onAdd={addProductToOrder} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Shopping Cart */}
                {orderItems.length > 0 && (
                    <div className="cart-section card mt-lg">
                        <h3>🛒 Sepetiniz</h3>
                        <div className="cart-items">
                            {orderItems.map((item, idx) => (
                                <div key={idx} className="cart-item">
                                    <div className="cart-item-info">
                                        <span className="cart-item-name">{item.name}</span>
                                        <span className="cart-item-price">€{item.price.toFixed(2)}</span>
                                    </div>
                                    <div className="cart-item-controls">
                                        <button className="qty-btn" onClick={() => updateQuantity(idx, -1)}>−</button>
                                        <span className="qty-val">{item.quantity}</span>
                                        <button className="qty-btn" onClick={() => updateQuantity(idx, 1)}>+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Delivery & Contact */}
                <form className="order-form card mt-lg" onSubmit={handleSubmit}>
                    <h3>🚚 Teslimat Yöntemi</h3>
                    <div className="delivery-toggle mb-lg">
                        <button
                            type="button"
                            className={`delivery-btn ${deliveryMethod === 'home' ? 'active' : ''}`}
                            onClick={() => setDeliveryMethod('home')}
                        >
                            🏠 Eve Teslimat (+€10)
                        </button>
                        <button
                            type="button"
                            className={`delivery-btn ${deliveryMethod === 'pickup' ? 'active' : ''}`}
                            onClick={() => setDeliveryMethod('pickup')}
                        >
                            🛍️ Evden Alacağım
                        </button>
                    </div>

                    <h3>👤 Bilgileriniz</h3>
                    <div className="form-group">
                        <label>Adınız Soyadınız *</label>
                        <input
                            type="text"
                            required
                            className="form-input"
                            value={customerInfo.name}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Telefon Numaranız *</label>
                        <input
                            type="tel"
                            required
                            className="form-input"
                            value={customerInfo.phone}
                            onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                        />
                    </div>
                    {deliveryMethod === 'home' && (
                        <div className="form-group fadeIn">
                            <label>Teslimat Adresi *</label>
                            <textarea
                                required
                                className="form-textarea"
                                value={customerInfo.address}
                                onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Sipariş Tarihi</label>
                        <input
                            type="date"
                            className="form-input"
                            value={orderDate}
                            onChange={(e) => setOrderDate(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Ek Notlar</label>
                        <textarea
                            className="form-textarea"
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                            placeholder="Alerjiler veya özel istekler..."
                        />
                    </div>

                    <div className="total-box mt-lg">
                        <div className="total-row">
                            <span>Ara Toplam:</span>
                            <span>€{subtotal.toFixed(2)}</span>
                        </div>
                        {shippingFee > 0 && (
                            <div className="total-row">
                                <span>Teslimat Ücreti:</span>
                                <span>€{shippingFee.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="total-row grand-total">
                            <span>Toplam:</span>
                            <span>€{total.toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-block btn-lg mt-lg"
                        disabled={submitting || orderItems.length === 0}
                    >
                        {submitting ? '⏳ Kaydediliyor...' : '✓ Siparişi Onayla'}
                    </button>
                </form>
            </main>

            <footer className="customer-footer">
                <p>&copy; {new Date().getFullYear()} Mezzesalade Ottoman Mission</p>
            </footer>
        </div>
    );
}

function ProductCard({ product, onAdd }) {
    const [showVariations, setShowVariations] = useState(false);

    return (
        <div className="p-card">
            {product.image && (
                <div className="p-image">
                    <img src={product.image} alt={product.name} />
                </div>
            )}
            <div className="p-content">
                <h4 className="p-name">{product.name}</h4>
                <p className="p-desc">{product.description}</p>
                <div className="p-footer">
                    <span className="p-price">€{product.price.toFixed(2)}</span>
                    {product.variations?.length > 0 ? (
                        <button className="p-add-btn" onClick={() => setShowVariations(!showVariations)}>
                            Seçenekler
                        </button>
                    ) : (
                        <button className="p-add-btn" onClick={() => onAdd(product)}>
                            Ekle
                        </button>
                    )}
                </div>
                {showVariations && (
                    <div className="p-variations">
                        {product.variations.map(v => (
                            <button
                                key={v}
                                className="v-btn"
                                onClick={() => {
                                    onAdd(product, v);
                                    setShowVariations(false);
                                }}
                            >
                                {v} (+€{(product.variationPrices?.[v] || 0)})
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
