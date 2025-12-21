import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseOrderText } from '../../hooks/useProductMatcher';

export default function TextParser({ customers, products = [], addCustomer, addOrder }) {
    const navigate = useNavigate();
    const [inputText, setInputText] = useState('');
    const [parsedResults, setParsedResults] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [orderNotes, setOrderNotes] = useState('');
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);

    // Extracted metadata from AI parsing
    const [extractedInfo, setExtractedInfo] = useState(null);

    // Parse the input text
    const handleParse = () => {
        if (!inputText.trim()) return;

        const result = parseOrderText(inputText, products, customers);
        setParsedResults(result.products);
        setExtractedInfo(result.metadata);

        // Auto-fill date if extracted
        if (result.metadata.date) {
            setOrderDate(result.metadata.date);
        }

        // Auto-select matched customer or pre-fill new customer form
        if (result.metadata.matchedCustomer) {
            setSelectedCustomer(result.metadata.matchedCustomer);
        } else if (result.metadata.name || result.metadata.phone) {
            setNewCustomer({
                name: result.metadata.name || '',
                phone: result.metadata.phone || '',
                address: result.metadata.address || '',
                notes: ''
            });
        }
    };

    // Update match selection for a result
    const selectAlternative = (index, alternative) => {
        const newResults = [...parsedResults];
        newResults[index] = {
            ...newResults[index],
            match: {
                product: alternative.product,
                confidence: alternative.confidence,
                matchType: 'manual',
                alternatives: []
            }
        };
        setParsedResults(newResults);
    };

    // Update quantity for a result
    const updateQuantity = (index, delta) => {
        const newResults = [...parsedResults];
        newResults[index].quantity = Math.max(1, newResults[index].quantity + delta);
        setParsedResults(newResults);
    };

    // Remove a result
    const removeResult = (index) => {
        const newResults = [...parsedResults];
        newResults.splice(index, 1);
        setParsedResults(newResults);
    };

    // Get confidence color
    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.9) return 'var(--accent-success)';
        if (confidence >= 0.7) return 'var(--accent-warning)';
        return 'var(--accent-primary)';
    };

    // Calculate total
    const validResults = parsedResults.filter(r => r.match);
    const total = validResults.reduce((sum, r) => {
        const price = r.match.product.variationPrices?.[r.variation] || r.match.product.price;
        return sum + (price * r.quantity);
    }, 0);

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
            setNewCustomer({ name: '', phone: '', email: '', address: '', notes: '' });
        }
    };

    // Create order from parsed results
    const handleCreateOrder = async () => {
        if (!selectedCustomer) {
            alert('Lütfen müşteri seçin!');
            return;
        }

        if (validResults.length === 0) {
            alert('Eşleşmiş ürün yok!');
            return;
        }

        setSubmitting(true);

        const items = validResults.map(r => ({
            productId: r.match.product.id,
            name: r.match.product.name,
            price: r.match.product.variationPrices?.[r.variation] || r.match.product.price,
            quantity: r.quantity,
            variation: r.variation || null,
            category: r.match.product.category
        }));

        const order = {
            customerId: selectedCustomer.id,
            items,
            notes: orderNotes,
            date: orderDate,
            status: 'new',
            total
        };

        const newOrder = await addOrder(order);
        setSubmitting(false);

        if (newOrder) {
            navigate(`/order/${newOrder.id}`);
        }
    };

    return (
        <div>
            <header className="header">
                <button className="btn btn-icon btn-secondary" onClick={() => navigate(-1)}>
                    ←
                </button>
                <h1>🤖 AI Ayrıştırıcı</h1>
                <div style={{ width: 40 }} />
            </header>

            {/* Input Area */}
            <div className="ai-parser">
                <h3 className="mb-md">WhatsApp Mesajını Yapıştırın</h3>
                <textarea
                    className="form-textarea"
                    placeholder={`Örnek:
22 Aralık 2025
Mesut
0634316902
Nieuw Sloten

2 Mercimek Çorbası
3x Sigara Böreği
Etli Kuru Dolma
Lahana Sarma`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    style={{ minHeight: 180 }}
                />
                <button
                    className="btn btn-primary btn-block mt-md"
                    onClick={handleParse}
                    disabled={!inputText.trim()}
                >
                    🔍 Ürünleri Bul
                </button>
            </div>

            {/* Extracted Info Summary */}
            {extractedInfo && (extractedInfo.date || extractedInfo.name || extractedInfo.phone) && (
                <div className="card mt-md" style={{ background: 'var(--accent-info)', color: 'white' }}>
                    <h4 className="mb-sm">✨ Otomatik Algılanan Bilgiler</h4>
                    <div style={{ fontSize: '0.875rem' }}>
                        {extractedInfo.date && (
                            <div>📅 Tarih: <strong>{new Date(extractedInfo.date).toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</strong></div>
                        )}
                        {extractedInfo.name && (
                            <div>👤 İsim: <strong>{extractedInfo.name}</strong></div>
                        )}
                        {extractedInfo.phone && (
                            <div>📞 Telefon: <strong>{extractedInfo.phone}</strong></div>
                        )}
                        {extractedInfo.address && (
                            <div>📍 Adres: <strong>{extractedInfo.address}</strong></div>
                        )}
                        {extractedInfo.matchedCustomer && (
                            <div className="mt-sm" style={{
                                background: 'rgba(255,255,255,0.2)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                display: 'inline-block'
                            }}>
                                ✅ Mevcut müşteri bulundu!
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Parsed Results */}
            {parsedResults.length > 0 && (
                <div className="mt-lg">
                    <h3 className="mb-md">Bulunan Ürünler ({validResults.length})</h3>

                    {parsedResults.map((result, index) => (
                        <div
                            key={index}
                            className={`ai-match ${result.match
                                ? result.match.confidence >= 0.9 ? 'high-confidence'
                                    : result.match.confidence >= 0.7 ? 'medium-confidence'
                                        : 'low-confidence'
                                : ''
                                }`}
                        >
                            <div style={{ flex: 1 }}>
                                <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>
                                    "{result.original}"
                                </div>

                                {result.match ? (
                                    <>
                                        <div className="font-bold">{result.match.product.name}</div>
                                        <div className="flex items-center gap-sm mt-xs">
                                            <div className="confidence-bar" style={{ flex: 1 }}>
                                                <div
                                                    className="confidence-fill"
                                                    style={{
                                                        width: `${result.match.confidence * 100}%`,
                                                        background: getConfidenceColor(result.match.confidence)
                                                    }}
                                                />
                                            </div>
                                            <span className="text-success font-bold">€{result.match.product.price}</span>
                                        </div>

                                        {/* Alternatives */}
                                        {result.match.alternatives && result.match.alternatives.length > 0 && result.match.confidence < 0.9 && (
                                            <div className="mt-sm">
                                                <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 4 }}>
                                                    Alternatifler:
                                                </div>
                                                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                                    {result.match.alternatives.map((alt, altIndex) => (
                                                        <button
                                                            key={altIndex}
                                                            className="btn btn-secondary"
                                                            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                                            onClick={() => selectAlternative(index, alt)}
                                                        >
                                                            {alt.product.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-warning font-bold">❌ Eşleşme bulunamadı</div>
                                )}
                            </div>

                            {result.match && (
                                <div className="flex items-center gap-sm">
                                    <div className="quantity">
                                        <button
                                            className="quantity-btn"
                                            onClick={() => updateQuantity(index, -1)}
                                        >
                                            −
                                        </button>
                                        <span style={{ minWidth: 30, textAlign: 'center' }}>{result.quantity}</span>
                                        <button
                                            className="quantity-btn"
                                            onClick={() => updateQuantity(index, 1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <button
                                        className="btn btn-icon btn-secondary"
                                        onClick={() => removeResult(index)}
                                        style={{ color: 'var(--accent-primary)' }}
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Customer Selection */}
                    {validResults.length > 0 && (
                        <>
                            <div className="card mt-lg mb-md">
                                <h3 className="mb-md">👤 Müşteri</h3>

                                {selectedCustomer ? (
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-bold">{selectedCustomer.name}</div>
                                            <div className="text-muted">{selectedCustomer.phone}</div>
                                            {selectedCustomer.address && (
                                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>📍 {selectedCustomer.address}</div>
                                            )}
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
                                            + Yeni Müşteri Ekle {newCustomer.name && `(${newCustomer.name})`}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Date & Notes */}
                            <div className="form-group">
                                <label className="form-label">Sipariş Tarihi</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={orderDate}
                                    onChange={(e) => setOrderDate(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">📝 Not</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Sipariş notu..."
                                    value={orderNotes}
                                    onChange={(e) => setOrderNotes(e.target.value)}
                                    style={{ minHeight: 80 }}
                                />
                            </div>

                            {/* Total and Submit */}
                            <div className="card" style={{ position: 'sticky', bottom: 100 }}>
                                <div className="flex justify-between items-center mb-md">
                                    <span className="text-lg">Toplam:</span>
                                    <span className="text-2xl font-bold text-success">€{total.toFixed(2)}</span>
                                </div>
                                <button
                                    className="btn btn-success btn-block btn-lg"
                                    onClick={handleCreateOrder}
                                    disabled={!selectedCustomer || submitting}
                                >
                                    {submitting ? '⏳ Kaydediliyor...' : '✓ Siparişi Oluştur'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

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
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="ornek@email.com"
                                value={newCustomer.email}
                                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
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

                        <button className="btn btn-primary btn-block" onClick={handleSaveCustomer}>
                            Müşteriyi Kaydet
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
