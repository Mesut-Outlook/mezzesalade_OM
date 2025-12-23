import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getProductById } from '../../hooks/useProductMatcher';
import { openDailySummaryWhatsApp } from '../AI/SummaryGenerator';
import { ShoppingCart, ClipboardList, ChevronLeft, ChevronRight, MessageCircle, Trash2 } from 'lucide-react';

export default function DailySummary({ orders, products = [] }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const dateParam = searchParams.get('date');
    const [activeTab, setActiveTab] = useState('products'); // 'products' or 'shopping'

    const today = new Date();
    const [selectedDate, setSelectedDate] = useState(
        dateParam || today.toISOString().split('T')[0]
    );

    // Filter orders for selected date
    const dayOrders = useMemo(() => {
        return orders.filter(order => {
            const orderDate = new Date(order.date).toISOString().split('T')[0];
            return orderDate === selectedDate;
        });
    }, [orders, selectedDate]);

    // Aggregate products
    const productSummary = useMemo(() => {
        const summary = {};

        for (const order of dayOrders) {
            for (const item of order.items) {
                const key = item.variation
                    ? `${item.productId}-${item.variation}`
                    : `${item.productId}`;

                if (!summary[key]) {
                    summary[key] = {
                        productId: item.productId,
                        name: item.name,
                        variation: item.variation,
                        category: item.category || 'Diger',
                        quantity: 0,
                        checked: false
                    };
                }
                summary[key].quantity += item.quantity;
            }
        }

        return summary;
    }, [dayOrders]);

    // Generate shopping list from ingredients
    const shoppingList = useMemo(() => {
        const ingredientMap = {};
        const ingredientGroups = {
            'Sebzeler': ['sogan', 'sarimsak', 'domates', 'biber', 'patates', 'havuc', 'kabak', 'patlican', 'ispanak', 'lahana', 'pirasa', 'kereviz', 'fasulye', 'bezelye', 'bamya', 'enginar', 'pancar', 'turp', 'marul', 'salatalik', 'maydanoz', 'dereotu', 'nane', 'roka', 'taze sogan'],
            'Meyveler': ['limon', 'portakal', 'nar', 'uzum', 'elma', 'kayisi', 'erik', 'incir', 'hurma'],
            'Et & Tavuk': ['dana', 'kuzu', 'kiyma', 'tavuk', 'but', 'pirzola', 'kusbasi', 'kofte', 'sucuk', 'pastirma'],
            'Bakliyat': ['mercimek', 'nohut', 'bulgur', 'pirinc', 'fasulye', 'barbunya', 'borlotti'],
            'Sut Urunleri': ['yogurt', 'sut', 'peynir', 'kasar', 'tereyag', 'krema', 'beyaz peynir', 'lor'],
            'Baharatlar': ['tuz', 'karabiber', 'kirmizi biber', 'pul biber', 'kimyon', 'kekik', 'nane', 'sumak', 'tarcin', 'safran', 'zerdecel'],
            'Soslar & Salcalar': ['salca', 'domates salcasi', 'biber salcasi', 'sos', 'sirke', 'nar eksisi'],
            'Yagllar': ['zeytinyagi', 'sivi yag', 'tereyagi', 'margarin'],
            'Diger': []
        };

        // Parse ingredients for each ordered product
        for (const [key, item] of Object.entries(productSummary)) {
            const product = products.find(p => p.id === item.productId);
            if (!product?.ingredients) continue;

            const lines = product.ingredients.split('\n').filter(l => l.trim());

            for (const line of lines) {
                const cleanLine = line.trim().toLowerCase();
                if (!cleanLine) continue;

                // Find the group for this ingredient
                let foundGroup = 'Diger';
                for (const [group, keywords] of Object.entries(ingredientGroups)) {
                    if (group === 'Diger') continue;
                    for (const keyword of keywords) {
                        if (cleanLine.includes(keyword)) {
                            foundGroup = group;
                            break;
                        }
                    }
                    if (foundGroup !== 'Diger') break;
                }

                // Combine with quantity multiplier
                const ingredientKey = cleanLine;
                if (!ingredientMap[ingredientKey]) {
                    ingredientMap[ingredientKey] = {
                        text: line.trim(),
                        group: foundGroup,
                        productCount: 0,
                        products: []
                    };
                }
                ingredientMap[ingredientKey].productCount += item.quantity;
                if (!ingredientMap[ingredientKey].products.includes(item.name)) {
                    ingredientMap[ingredientKey].products.push(item.name);
                }
            }
        }

        // Group by category
        const grouped = {};
        for (const [key, ing] of Object.entries(ingredientMap)) {
            if (!grouped[ing.group]) {
                grouped[ing.group] = [];
            }
            grouped[ing.group].push(ing);
        }

        // Sort each group alphabetically
        for (const group of Object.keys(grouped)) {
            grouped[group].sort((a, b) => a.text.localeCompare(b.text, 'tr'));
        }

        return grouped;
    }, [productSummary, products]);

    // Group by category
    const byCategory = useMemo(() => {
        const categories = {};

        for (const [key, item] of Object.entries(productSummary)) {
            if (!categories[item.category]) {
                categories[item.category] = [];
            }
            categories[item.category].push({ key, ...item });
        }

        // Sort by quantity within each category
        for (const category of Object.keys(categories)) {
            categories[category].sort((a, b) => b.quantity - a.quantity);
        }

        return categories;
    }, [productSummary]);

    // Check state (local only, not persisted)
    const [checkedItems, setCheckedItems] = useState({});
    const [checkedIngredients, setCheckedIngredients] = useState({});
    const [hiddenIngredients, setHiddenIngredients] = useState({});

    const toggleCheck = (key) => {
        setCheckedItems(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const toggleIngredient = (key) => {
        setCheckedIngredients(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const deleteIngredient = (key, e) => {
        e.stopPropagation();
        setHiddenIngredients(prev => ({
            ...prev,
            [key]: true
        }));
    };

    // Total items
    const totalItems = Object.values(productSummary).reduce((sum, item) => sum + item.quantity, 0);
    const totalIngredients = Object.values(shoppingList).flat().filter((_, idx) => !hiddenIngredients[idx]).length;

    // Format date for display
    const formatDisplayDate = (dateStr) => {
        const date = new Date(dateStr);
        const days = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];
        const months = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
        return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
    };

    // Navigation
    const goToPreviousDay = () => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() - 1);
        setSelectedDate(date.toISOString().split('T')[0]);
        setCheckedItems({});
        setCheckedIngredients({});
    };

    const goToNextDay = () => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + 1);
        setSelectedDate(date.toISOString().split('T')[0]);
        setCheckedItems({});
        setCheckedIngredients({});
    };

    const categoryColors = {
        'Mezeler': '#e94560',
        'Corbalar': '#ff6b35',
        'Etli Yemekler': '#8b0000',
        'Zeytinyagli Yemekler': '#228b22',
        'Borek Pogaca': '#daa520',
        'Salatalar': '#32cd32',
        'Pilavlar': '#f4a460',
        'Kofte Kebap': '#cd5c5c',
        'Dolma Sarma': '#9370db',
        'Paketler': '#ff7f50',
    };

    const groupColors = {
        'Sebzeler': '#22c55e',
        'Meyveler': '#f59e0b',
        'Et & Tavuk': '#ef4444',
        'Bakliyat': '#a78bfa',
        'Sut Urunleri': '#60a5fa',
        'Baharatlar': '#f97316',
        'Soslar & Salcalar': '#ec4899',
        'Yagllar': '#fbbf24',
        'Diger': '#6b7280'
    };

    return (
        <div>
            <header className="header">
                <button className="btn btn-icon btn-secondary" onClick={() => navigate('/calendar')}>
                    ←
                </button>
                <h1>📊 Gunluk Ozet</h1>
                <button
                    className="btn btn-icon btn-success"
                    onClick={() => openDailySummaryWhatsApp(new Date(selectedDate), byCategory, totalItems)}
                    title="WhatsApp ile Paylas"
                >
                    <MessageCircle size={20} />
                </button>
            </header>

            {/* Date Navigation */}
            <div className="card mb-md">
                <div className="flex justify-between items-center">
                    <button className="btn btn-icon btn-secondary" onClick={goToPreviousDay}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="text-center">
                        <div className="text-lg font-bold">{formatDisplayDate(selectedDate)}</div>
                        <div className="text-sm text-muted">{dayOrders.length} siparis</div>
                    </div>
                    <button className="btn btn-icon btn-secondary" onClick={goToNextDay}>
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Tab Buttons */}
            <div className="flex gap-sm mb-md">
                <button
                    className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('products')}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    <ClipboardList size={18} />
                    Urunler ({totalItems})
                </button>
                <button
                    className={`btn ${activeTab === 'shopping' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('shopping')}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    <ShoppingCart size={18} />
                    Alisveris ({totalIngredients})
                </button>
            </div>

            {dayOrders.length === 0 ? (
                <div className="card text-center p-lg">
                    <p className="text-muted">Bu gun icin siparis bulunmuyor.</p>
                </div>
            ) : activeTab === 'products' ? (
                <>
                    {/* Products Tab */}
                    {Object.entries(byCategory).map(([category, items]) => (
                        <div key={category} className="category-section">
                            <h3 className="category-header">
                                <span style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    display: 'inline-block',
                                    marginRight: 8,
                                    background: categoryColors[category] || 'var(--text-muted)'
                                }} />
                                {category}
                            </h3>

                            {items.map(item => (
                                <div
                                    key={item.key}
                                    className={`summary-item ${checkedItems[item.key] ? 'checked' : ''}`}
                                    onClick={() => toggleCheck(item.key)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={checkedItems[item.key] || false}
                                        onChange={() => toggleCheck(item.key)}
                                        onClick={e => e.stopPropagation()}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <span className="font-bold">{item.name}</span>
                                        {item.variation && (
                                            <span className="text-muted"> ({item.variation})</span>
                                        )}
                                    </div>
                                    <div className="font-bold text-lg" style={{
                                        background: 'var(--bg-secondary)',
                                        padding: '4px 12px',
                                        borderRadius: 'var(--radius-sm)'
                                    }}>
                                        {item.quantity}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}

                    {/* Total */}
                    {totalItems > 0 && (
                        <div className="card mb-md" style={{
                            background: 'var(--bg-secondary)'
                        }}>
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-bold">Toplam Urun</span>
                                <span className="text-2xl font-bold">{totalItems} adet</span>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <>
                    {/* Shopping List Tab */}
                    {totalIngredients === 0 ? (
                        <div className="card text-center p-lg">
                            <ShoppingCart size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <p className="text-muted">Urunlere malzeme listesi eklenmemis.</p>
                            <p className="text-sm text-muted mt-sm">
                                Urunler sayfasindan urunleri duzenleyerek malzeme ekleyebilirsiniz.
                            </p>
                        </div>
                    ) : (
                        Object.entries(shoppingList).map(([group, ingredients]) => (
                            <div key={group} className="category-section">
                                <h3 className="category-header">
                                    <span style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        display: 'inline-block',
                                        marginRight: 8,
                                        background: groupColors[group] || 'var(--text-muted)'
                                    }} />
                                    {group} ({ingredients.length})
                                </h3>

                                {ingredients.filter((_, idx) => !hiddenIngredients[`${group}-${idx}`]).map((ing, idx) => {
                                    const itemKey = `${group}-${idx}`;
                                    return (
                                        <div
                                            key={itemKey}
                                            className={`summary-item ${checkedIngredients[itemKey] ? 'checked' : ''}`}
                                            onClick={() => toggleIngredient(itemKey)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                checked={checkedIngredients[itemKey] || false}
                                                onChange={() => toggleIngredient(itemKey)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <span className="font-bold">{ing.text}</span>
                                                {ing.productCount > 1 && (
                                                    <span className="text-muted" style={{ marginLeft: '8px' }}>
                                                        (x{ing.productCount})
                                                    </span>
                                                )}
                                                <div className="text-xs text-muted" style={{ marginTop: '2px' }}>
                                                    {ing.products.slice(0, 3).join(', ')}
                                                    {ing.products.length > 3 && ` +${ing.products.length - 3}`}
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-icon"
                                                onClick={(e) => deleteIngredient(itemKey, e)}
                                                style={{
                                                    padding: '6px',
                                                    background: 'transparent',
                                                    color: 'var(--text-muted)',
                                                    minWidth: 'auto'
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}

                    {/* Total Ingredients */}
                    {totalIngredients > 0 && (
                        <div className="card mb-md" style={{
                            background: 'var(--bg-secondary)'
                        }}>
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-bold">Toplam Malzeme</span>
                                <span className="text-2xl font-bold">{totalIngredients} kalem</span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
