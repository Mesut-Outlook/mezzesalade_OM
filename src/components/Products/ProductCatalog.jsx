import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProducts, getProductsByCategory } from '../../hooks/useProductMatcher';

export default function ProductCatalog() {
    const navigate = useNavigate();
    const products = getAllProducts();
    const productsByCategory = getProductsByCategory();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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
            const minPrice = Math.min(...catProducts.map(p => p.price));
            const maxPrice = Math.max(...catProducts.map(p => p.price));
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
            </header>

            {/* Stats Bar */}
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
                        <div className="text-2xl font-bold text-success">€{Math.min(...products.map(p => p.price))}-{Math.max(...products.map(p => p.price))}</div>
                        <div className="text-muted">Fiyat Aralığı</div>
                    </div>
                </div>
            </div>

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
                            />
                        ) : (
                            <ProductCardList
                                key={product.id}
                                product={product}
                                categoryColor={categoryColors[product.category]}
                            />
                        )
                    ))}
                </div>
            )}
        </div>
    );
}

// Grid Card Component
function ProductCardGrid({ product, categoryColor }) {
    const [imgError, setImgError] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div
            className="card"
            style={{
                padding: 0,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
            }}
            onClick={() => setShowDetails(!showDetails)}
        >
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
            <div style={{ padding: '10px' }}>
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
                    marginBottom: '6px'
                }}>
                    {product.category}
                </div>

                {/* Price */}
                <div style={{
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    color: 'var(--accent-success)'
                }}>
                    €{product.price}
                </div>

                {/* Variations */}
                {product.variations && product.variations.length > 0 && (
                    <div style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)',
                        marginTop: '4px'
                    }}>
                        {product.variations.length} varyasyon
                    </div>
                )}
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
        </div>
    );
}

// List Card Component
function ProductCardList({ product, categoryColor }) {
    const [imgError, setImgError] = useState(false);

    return (
        <div className="product-card mb-sm">
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
                <div className="name">{product.name}</div>
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

            <div style={{ textAlign: 'right' }}>
                <div className="price" style={{ fontSize: '1.25rem' }}>€{product.price}</div>
                {product.variationPrices && Object.keys(product.variationPrices).length > 0 && (
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                        {Object.values(product.variationPrices).map((p, i) =>
                            i === 0 ? `€${p}` : ` / €${p}`
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
