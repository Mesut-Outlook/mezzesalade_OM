import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { migrateProducts } from '../../lib/supabase';
import localProducts from '../../data/products.json';

export default function ProductCatalog({ products: allProducts = [], addProduct, updateProduct, deactivateProduct }) {
    const navigate = useNavigate();

    // UI state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [showInactive, setShowInactive] = useState(false);

    // Product management state
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [saving, setSaving] = useState(false);
    const [migrating, setMigrating] = useState(false);

    // Derived data
    const activeProducts = useMemo(() => allProducts.filter(p => p.is_active !== false), [allProducts]);
    const products = showInactive ? allProducts : activeProducts;

    const productsByCategory = useMemo(() => {
        const categories = {};
        for (const product of products) {
            if (!categories[product.category]) {
                categories[product.category] = [];
            }
            categories[product.category].push(product);
        }
        return categories;
    }, [products]);

    // Filter products
    const filteredProducts = useMemo(() => {
        let result = products;

        if (selectedCategory) {
            result = result.filter(p => p.category === selectedCategory);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query))
            );
        }

        return result;
    }, [products, selectedCategory, searchQuery]);

    // Category statistics
    const categoryStats = useMemo(() => {
        const stats = {};
        for (const cat of Object.keys(productsByCategory)) {
            const catProducts = productsByCategory[cat];
            const prices = catProducts.map(p => parseFloat(p.price)).filter(p => !isNaN(p));
            const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
            const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
            stats[cat] = { count: catProducts.length, minPrice, maxPrice };
        }
        return stats;
    }, [productsByCategory]);

    const categoryColors = {
        'Mezeler': '#e94560',
        'Çorbalar': '#ff6b35',
        'Etli Yemekler': '#8b0000',
        'Zeytinyağlı Yemekler': '#228b22',
        'Börek Poğaça': '#daa520',
        'Salatalar': '#32cd32',
        'Pilavlar': '#f4a460',
        'Köfte Kebap': '#cd5c5c',
        'Dolma Sarma': '#9370db',
    };

    const categoryEmojis = {
        'Mezeler': '🥗',
        'Çorbalar': '🍲',
        'Etli Yemekler': '🍖',
        'Zeytinyağlı Yemekler': '🫒',
        'Börek Poğaça': '🥐',
        'Salatalar': '🥬',
        'Pilavlar': '🍚',
        'Köfte Kebap': '🍢',
        'Dolma Sarma': '🫑',
    };

    return (
        <div>
            <header className="header">
                <h1>📦 Ürün Kataloğu</h1>
                <div className="flex gap-sm items-center">
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setEditingProduct(null);
                            setShowModal(true);
                        }}
                    >
                        + Yeni Ürün
                    </button>
                    <div className="flex gap-xs items-center ml-sm">
                        <button
                            className={`btn btn-icon ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setViewMode('grid')}
                            title="Grid Görünüm"
                        >
                            ▦
                        </button>
                        <button
                            className={`btn btn-icon ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setViewMode('list')}
                            title="Liste Görünüm"
                        >
                            ☰
                        </button>
                    </div>
                </div>
            </header>

            {/* Inactive Toggle */}
            <div className="flex justify-end mb-sm">
                <label className="flex items-center gap-xs text-muted" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                    />
                    Pasif ürünleri göster
                </label>
            </div>

            {/* Empty State / Migration */}
            {allProducts.length === 0 && (
                <div className="card mb-md text-center p-xl">
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>📦</div>
                    <h3>Ürün Listesi Boş</h3>
                    <p className="text-muted mb-lg">
                        Database'de henüz ürün bulunmuyor. Yerel veri dosyasındaki ürünleri aktarmak ister misiniz?
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={async () => {
                            setMigrating(true);
                            await migrateProducts(localProducts);
                            setMigrating(false);
                        }}
                        disabled={migrating}
                    >
                        {migrating ? 'Aktarılıyor...' : 'Ürünleri Aktar (Migration)'}
                    </button>
                </div>
            )}

            {/* Stats Bar */}
            {products.length > 0 && (
                <div className="card mb-md" style={{ background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))' }}>
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-2xl font-bold">{products.length}</div>
                            <div className="text-muted">Toplam Ürün</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{Object.keys(productsByCategory).length}</div>
                            <div className="text-muted">Kategori</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-success">
                                €{Math.min(...products.map(p => parseFloat(p.price) || 0))} - €{Math.max(...products.map(p => parseFloat(p.price) || 0))}
                            </div>
                            <div className="text-muted">Fiyat Aralığı</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="search-container">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Ürün veya kategori ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Category Pills */}
            <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '12px',
                marginBottom: '16px',
                WebkitOverflowScrolling: 'touch'
            }}>
                <button
                    className={`btn ${!selectedCategory ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedCategory(null)}
                    style={{ whiteSpace: 'nowrap', minWidth: 'fit-content' }}
                >
                    🏠 Tümü ({products.length})
                </button>
                {Object.keys(productsByCategory).map(category => (
                    <button
                        key={category}
                        className={`btn ${selectedCategory === category ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                        style={{
                            whiteSpace: 'nowrap',
                            minWidth: 'fit-content',
                            borderLeft: `4px solid ${categoryColors[category] || 'var(--border-color)'}`
                        }}
                    >
                        {categoryEmojis[category] || '📦'} {category} ({categoryStats[category]?.count})
                    </button>
                ))}
            </div>

            {/* Selected Category Info */}
            {selectedCategory && (
                <div className="card mb-md" style={{
                    borderLeft: `4px solid ${categoryColors[selectedCategory]}`,
                    background: `linear-gradient(135deg, ${categoryColors[selectedCategory]}22, transparent)`
                }}>
                    <div className="flex justify-between items-center">
                        <div>
                            <h3>{categoryEmojis[selectedCategory]} {selectedCategory}</h3>
                            <div className="text-muted">{categoryStats[selectedCategory]?.count} ürün</div>
                        </div>
                        <div className="text-right">
                            <div className="text-success font-bold">
                                €{categoryStats[selectedCategory]?.minPrice} - €{categoryStats[selectedCategory]?.maxPrice}
                            </div>
                            <button
                                className="btn btn-secondary mt-sm"
                                onClick={() => setSelectedCategory(null)}
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                            >
                                × Filtreyi Kaldır
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Products */}
            {filteredProducts.length === 0 ? (
                <div className="empty-state">
                    <div className="icon">📦</div>
                    <p>Ürün bulunamadı</p>
                    {searchQuery && (
                        <button className="btn btn-secondary mt-md" onClick={() => setSearchQuery('')}>
                            Aramayı Temizle
                        </button>
                    )}
                </div>
            ) : (
                <div style={viewMode === 'grid' ? {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '12px'
                } : {}}>
                    {filteredProducts.map(product => (
                        viewMode === 'grid' ? (
                            <ProductCardGrid
                                key={product.id}
                                product={product}
                                categoryColor={categoryColors[product.category]}
                                onEdit={() => {
                                    setEditingProduct(product);
                                    setShowModal(true);
                                }}
                            />
                        ) : (
                            <ProductCardList
                                key={product.id}
                                product={product}
                                categoryColor={categoryColors[product.category]}
                                onEdit={() => {
                                    setEditingProduct(product);
                                    setShowModal(true);
                                }}
                            />
                        )
                    ))}
                </div>
            )}

            {/* Product Modal */}
            {showModal && (
                <ProductFormModal
                    product={editingProduct}
                    onClose={() => setShowModal(false)}
                    onSave={async (data) => {
                        setSaving(true);
                        if (editingProduct) {
                            await updateProduct(editingProduct.id, data);
                        } else {
                            await addProduct(data);
                        }
                        setSaving(false);
                        setShowModal(false);
                    }}
                    onDeactivate={async () => {
                        if (editingProduct && confirm('Bu ürünü pasif yapmak istediğinizden emin misiniz?')) {
                            await deactivateProduct(editingProduct.id);
                            setShowModal(false);
                        }
                    }}
                    saving={saving}
                    categories={Object.keys(categoryColors)}
                />
            )}
        </div>
    );
}

// Grid Card Component
function ProductCardGrid({ product, categoryColor, onEdit }) {
    const [imgError, setImgError] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    return (
        <>
            <div
                className={`card ${product.is_active === false ? 'inactive' : ''}`}
                style={{
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                    position: 'relative',
                    opacity: product.is_active === false ? 0.6 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                }}
                onClick={() => setShowDetails(!showDetails)}
            >
                {/* Edit Button */}
                <button
                    className="btn btn-icon btn-secondary"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 10,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        padding: 0,
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    ✏️
                </button>

                {/* Status Badge */}
                {product.is_active === false && (
                    <div style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        zIndex: 10,
                        background: 'var(--text-muted)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 'bold'
                    }}>
                        PASİF
                    </div>
                )}

                {/* Image */}
                <div style={{
                    width: '100%',
                    height: '120px',
                    background: imgError ? `linear-gradient(135deg, ${categoryColor}44, ${categoryColor}22)` : 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                }}>
                    {product.image && !imgError ? (
                        <img
                            src={product.image}
                            alt={product.name}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <span style={{ fontSize: '3rem', opacity: 0.5 }}>🍽️</span>
                    )}
                </div>

                {/* Info */}
                <div style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        marginBottom: '4px',
                        lineHeight: 1.3
                    }}>
                        {product.name}
                    </div>

                    {/* Category badge */}
                    <div style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: categoryColor || 'var(--bg-tertiary)',
                        color: 'white',
                        fontSize: '0.6rem',
                        marginBottom: '6px',
                        width: 'fit-content'
                    }}>
                        {product.category}
                    </div>

                    {/* Price */}
                    <div style={{
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: 'var(--accent-success)',
                        marginTop: 'auto'
                    }}>
                        €{product.price}
                    </div>
                </div>
            </div>

            {/* Details Modal */}
            {showDetails && (
                <div
                    className="modal-overlay"
                    onClick={(e) => { e.stopPropagation(); setShowDetails(false); }}
                    style={{ zIndex: 3000 }}
                >
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{product.name}</h2>
                            <button className="modal-close" onClick={() => setShowDetails(false)}>×</button>
                        </div>

                        {product.image && !imgError && (
                            <img
                                src={product.image}
                                alt={product.name}
                                style={{
                                    width: '100%',
                                    height: '200px',
                                    objectFit: 'cover',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: '16px'
                                }}
                            />
                        )}

                        <div style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: categoryColor || 'var(--bg-tertiary)',
                            color: 'white',
                            fontSize: '0.875rem',
                            marginBottom: '12px'
                        }}>
                            {product.category}
                        </div>

                        {product.description && (
                            <p className="text-muted mb-md">{product.description}</p>
                        )}

                        <div className="text-2xl font-bold text-success mb-md">
                            €{product.price}
                        </div>

                        {product.variations && product.variations.length > 0 && (
                            <div className="mb-md">
                                <h4 className="mb-sm">Varyasyonlar</h4>
                                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                    {product.variations.map(v => (
                                        <span
                                            key={v}
                                            style={{
                                                padding: '6px 12px',
                                                background: 'var(--bg-tertiary)',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            {v}
                                            {product.variationPrices?.[v] && (
                                                <span className="text-success"> €{product.variationPrices[v]}</span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

// List Card Component
function ProductCardList({ product, categoryColor, onEdit }) {
    const [imgError, setImgError] = useState(false);

    return (
        <div
            className={`product-card mb-sm ${product.is_active === false ? 'inactive' : ''}`}
            style={{
                position: 'relative',
                opacity: product.is_active === false ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)'
            }}
        >
            {/* Status Badge */}
            {product.is_active === false && (
                <div style={{
                    position: 'absolute',
                    top: -4,
                    left: -4,
                    zIndex: 10,
                    background: 'var(--text-muted)',
                    color: 'white',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontSize: '0.6rem',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    PASİF
                </div>
            )}

            {/* Image */}
            <div style={{
                width: '70px',
                height: '70px',
                borderRadius: 'var(--radius-sm)',
                background: imgError ? `linear-gradient(135deg, ${categoryColor}44, ${categoryColor}22)` : 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0
            }}>
                {product.image && !imgError ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <span style={{ fontSize: '2rem', opacity: 0.5 }}>🍽️</span>
                )}
            </div>

            <div className="info" style={{ flex: 1 }}>
                <div className="name" style={{ fontWeight: '600' }}>{product.name}</div>
                <div style={{
                    display: 'inline-block',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: categoryColor || 'var(--bg-tertiary)',
                    color: 'white',
                    fontSize: '0.65rem',
                    marginTop: '4px'
                }}>
                    {product.category}
                </div>
                {product.variations && product.variations.length > 0 && (
                    <div className="text-muted" style={{ fontSize: '0.7rem', marginTop: '4px' }}>
                        {product.variations.join(' • ')}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                    <div className="price" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-success)' }}>€{product.price}</div>
                    {product.variationPrices && Object.keys(product.variationPrices).length > 0 && (
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {Object.values(product.variationPrices).map((p, i) =>
                                i === 0 ? `€${p}` : ` / €${p}`
                            )}
                        </div>
                    )}
                </div>
                <button
                    className="btn btn-icon btn-secondary"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    style={{ width: 36, height: 36 }}
                >
                    ✏️
                </button>
            </div>
        </div>
    );
}

// Product Form Modal Component
function ProductFormModal({ product, onClose, onSave, onDeactivate, saving, categories }) {
    const [formData, setFormData] = useState({
        name: product?.name || '',
        category: product?.category || categories[0],
        price: product?.price || '',
        description: product?.description || '',
        image: product?.image || '',
        variations: product?.variations || [],
        variationPrices: product?.variationPrices || product?.variation_prices || {}
    });

    const [newVariation, setNewVariation] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const addVariation = () => {
        if (!newVariation.trim()) return;
        if (formData.variations.includes(newVariation.trim())) return;

        setFormData({
            ...formData,
            variations: [...formData.variations, newVariation.trim()],
            variationPrices: {
                ...formData.variationPrices,
                [newVariation.trim()]: formData.price // Default to base price
            }
        });
        setNewVariation('');
    };

    const removeVariation = (v) => {
        const newVars = formData.variations.filter(item => item !== v);
        const newPrices = { ...formData.variationPrices };
        delete newPrices[v];

        setFormData({
            ...formData,
            variations: newVars,
            variationPrices: newPrices
        });
    };

    const updateVariationPrice = (v, price) => {
        setFormData({
            ...formData,
            variationPrices: {
                ...formData.variationPrices,
                [v]: price
            }
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 4000 }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2>{product ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-md">
                    <div className="form-group">
                        <label>Ürün Adı</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Örn: Mercimek Çorbası"
                        />
                    </div>

                    <div className="flex gap-md">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Kategori</label>
                            <select
                                className="input"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                required
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ width: '120px' }}>
                            <label>Baz Fiyat (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="input"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                required
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Açıklama</label>
                        <textarea
                            className="input"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Ürün içeriği, alerjen bilgisi vb."
                            rows={2}
                        />
                    </div>

                    <div className="form-group">
                        <label>Görsel URL (Opsiyonel)</label>
                        <input
                            type="url"
                            className="input"
                            value={formData.image}
                            onChange={e => setFormData({ ...formData, image: e.target.value })}
                            placeholder="https://example.com/image.jpg"
                        />
                    </div>

                    <div className="form-group">
                        <label>Varyasyonlar (Boyut, Adet vb.)</label>
                        <div className="flex gap-sm mb-sm">
                            <input
                                type="text"
                                className="input"
                                value={newVariation}
                                onChange={e => setNewVariation(e.target.value)}
                                placeholder="Yeni varyasyon (Örn: 1 Litre)"
                                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addVariation())}
                            />
                            <button type="button" className="btn btn-secondary" onClick={addVariation}>
                                Ekle
                            </button>
                        </div>

                        {formData.variations.length > 0 && (
                            <div className="card" style={{ padding: 'var(--spacing-sm)', background: 'var(--bg-tertiary)' }}>
                                {formData.variations.map(v => (
                                    <div key={v} className="flex justify-between items-center mb-xs last:mb-0">
                                        <span style={{ fontSize: '0.875rem' }}>{v}</span>
                                        <div className="flex items-center gap-xs">
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', opacity: 0.5 }}>€</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="input"
                                                    style={{ width: '80px', paddingLeft: '20px', height: '32px', fontSize: '0.875rem' }}
                                                    value={formData.variationPrices[v] || ''}
                                                    onChange={e => updateVariationPrice(v, e.target.value)}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-icon btn-secondary"
                                                onClick={() => removeVariation(v)}
                                                style={{ width: 24, height: 24, padding: 0 }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center mt-md">
                        {product ? (
                            <button
                                type="button"
                                className="btn btn-danger btn-outline"
                                onClick={onDeactivate}
                                disabled={saving}
                            >
                                Pasif Yap
                            </button>
                        ) : (
                            <div></div>
                        )}
                        <div className="flex gap-sm">
                            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
                                İptal
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Kaydediliyor...' : (product ? 'Güncelle' : 'Ekle')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
