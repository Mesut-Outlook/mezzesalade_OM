import { useState, useMemo } from 'react';

const DIET_TAGS = [
    { id: 'V', label: 'Vegetarian', icon: '🌿', color: '#4caf50' },
    { id: 'VG', label: 'Vegan', icon: '🌱', color: '#2e7d32' },
    { id: 'GF', label: 'Gluten Free', icon: '🌾', color: '#f59e0b' },
    { id: 'N', label: 'Fındık İçerir', icon: '🥜', color: '#ef4444' },
];

export default function DietManager({ products, updateProduct }) {
    const [localTags, setLocalTags] = useState({});
    const [changedIds, setChangedIds] = useState(new Set());
    const [saving, setSaving] = useState(false);
    const [savedCount, setSavedCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [collapsedCategories, setCollapsedCategories] = useState(new Set());

    // Only active products
    const activeProducts = useMemo(() =>
        products.filter(p => p.is_active !== false),
        [products]
    );

    // Get current tags for a product (local override or original)
    const getTags = (product) => {
        if (localTags[product.id] !== undefined) {
            return localTags[product.id];
        }
        return product.dietary_tags || [];
    };

    // Toggle a diet tag for a product
    const toggleTag = (product, tagId) => {
        const currentTags = getTags(product);
        const newTags = currentTags.includes(tagId)
            ? currentTags.filter(t => t !== tagId)
            : [...currentTags, tagId];

        setLocalTags(prev => ({ ...prev, [product.id]: newTags }));
        setChangedIds(prev => {
            const next = new Set(prev);
            // Check if the new tags differ from original
            const originalTags = product.dietary_tags || [];
            const isChanged = JSON.stringify([...newTags].sort()) !== JSON.stringify([...originalTags].sort());
            if (isChanged) {
                next.add(product.id);
            } else {
                next.delete(product.id);
            }
            return next;
        });
    };

    // Group by category
    const groupedProducts = useMemo(() => {
        const groups = {};
        const filtered = searchTerm
            ? activeProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
            : activeProducts;

        filtered.forEach(product => {
            const cat = product.category || 'Diğer';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(product);
        });

        // Sort products within each category by name
        Object.keys(groups).forEach(cat => {
            groups[cat].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        });

        return groups;
    }, [activeProducts, searchTerm]);

    // Sort category names
    const sortedCategories = useMemo(() =>
        Object.keys(groupedProducts).sort((a, b) => a.localeCompare(b, 'tr')),
        [groupedProducts]
    );

    // Stats
    const stats = useMemo(() => {
        const counts = { total: activeProducts.length, V: 0, VG: 0, GF: 0, N: 0 };
        activeProducts.forEach(p => {
            const tags = getTags(p);
            DIET_TAGS.forEach(dt => {
                if (tags.includes(dt.id)) counts[dt.id]++;
            });
        });
        return counts;
    }, [activeProducts, localTags]);

    // Toggle category collapse
    const toggleCategory = (cat) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) {
                next.delete(cat);
            } else {
                next.add(cat);
            }
            return next;
        });
    };

    // Save all changes
    const saveChanges = async () => {
        if (changedIds.size === 0) return;
        setSaving(true);
        setSavedCount(0);
        let count = 0;

        for (const productId of changedIds) {
            const tags = localTags[productId];
            if (tags !== undefined) {
                await updateProduct(productId, { dietary_tags: tags });
                count++;
                setSavedCount(count);
            }
        }

        // Clear local state
        setLocalTags({});
        setChangedIds(new Set());
        setSaving(false);

        // Show brief success
        setSavedCount(-1);
        setTimeout(() => setSavedCount(0), 2000);
    };

    return (
        <div className="diet-manager">
            {/* Header */}
            <div className="diet-manager-header">
                <div className="diet-manager-title">
                    <span className="diet-manager-icon">🥗</span>
                    <h1>Diyet Durumu Yönetimi</h1>
                </div>
                <div className="diet-manager-actions">
                    {changedIds.size > 0 && (
                        <span className="diet-change-badge">
                            {changedIds.size} değişiklik
                        </span>
                    )}
                    <button
                        className={`diet-save-btn ${changedIds.size === 0 ? 'disabled' : ''}`}
                        onClick={saveChanges}
                        disabled={changedIds.size === 0 || saving}
                    >
                        {saving
                            ? `Kaydediliyor... (${savedCount}/${changedIds.size})`
                            : savedCount === -1
                                ? '✅ Kaydedildi!'
                                : '💾 Kaydet'}
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="diet-search-bar">
                <span className="diet-search-icon">🔍</span>
                <input
                    type="text"
                    placeholder="Ürün ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="diet-search-input"
                />
                {searchTerm && (
                    <button className="diet-search-clear" onClick={() => setSearchTerm('')}>✕</button>
                )}
            </div>

            {/* Stats */}
            <div className="diet-stats">
                <div className="diet-stat-item diet-stat-total">
                    <span className="diet-stat-count">{stats.total}</span>
                    <span className="diet-stat-label">Toplam</span>
                </div>
                {DIET_TAGS.map(tag => (
                    <div key={tag.id} className={`diet-stat-item diet-stat-${tag.id}`}>
                        <span className="diet-stat-count">{stats[tag.id]}</span>
                        <span className="diet-stat-label">{tag.icon} {tag.id}</span>
                    </div>
                ))}
            </div>

            {/* Category Groups */}
            <div className="diet-categories">
                {sortedCategories.map(category => {
                    const prods = groupedProducts[category];
                    const isCollapsed = collapsedCategories.has(category);

                    return (
                        <div key={category} className="diet-category-card">
                            <button
                                className="diet-category-header"
                                onClick={() => toggleCategory(category)}
                            >
                                <span className="diet-category-name">
                                    {category}
                                    <span className="diet-category-count">{prods.length}</span>
                                </span>
                                <span className={`diet-category-chevron ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
                            </button>

                            {!isCollapsed && (
                                <div className="diet-product-list">
                                    {prods.map(product => {
                                        const tags = getTags(product);
                                        const isChanged = changedIds.has(product.id);

                                        return (
                                            <div
                                                key={product.id}
                                                className={`diet-product-row ${isChanged ? 'changed' : ''}`}
                                            >
                                                <span className="diet-product-name">
                                                    {isChanged && <span className="diet-changed-dot" />}
                                                    {product.name}
                                                </span>
                                                <div className="diet-tag-chips">
                                                    {DIET_TAGS.map(tag => (
                                                        <button
                                                            key={tag.id}
                                                            className={`diet-chip-toggle ${tags.includes(tag.id) ? 'active' : ''} diet-chip-${tag.id}`}
                                                            onClick={() => toggleTag(product, tag.id)}
                                                            title={tag.label}
                                                        >
                                                            {tag.id}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Floating save for mobile */}
            {changedIds.size > 0 && (
                <button
                    className="diet-floating-save"
                    onClick={saveChanges}
                    disabled={saving}
                >
                    {saving ? `${savedCount}/${changedIds.size}` : `💾 Kaydet (${changedIds.size})`}
                </button>
            )}
        </div>
    );
}
