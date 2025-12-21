import { useState, useRef } from 'react';
import { uploadProductImage } from '../../lib/supabase';
import { Camera, Image as ImageIcon, X, Plus, Trash2, Loader2, Upload } from 'lucide-react';

export default function ProductFormModal({ product, onClose, onSave, onDeactivate, saving, categories }) {
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
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

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

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const publicUrl = await uploadProductImage(file);
        if (publicUrl) {
            setFormData({ ...formData, image: publicUrl });
        } else {
            alert('Görsel yüklenirken bir hata oluştu. Lütfen "product-images" bucket\'ının Supabase\'de açık olduğundan emin olun.');
        }
        setUploading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 4000 }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px', padding: 0, overflow: 'hidden' }}>
                {/* Header with Background */}
                <div style={{
                    background: 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary))',
                    padding: 'var(--spacing-lg)',
                    color: 'white',
                    position: 'relative'
                }}>
                    <div className="flex justify-between items-center">
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                            {product ? 'Ürünü Düzenle' : '✨ Yeni Ürün'}
                        </h2>
                        <button className="btn btn-icon btn-secondary" onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: 'var(--spacing-lg)' }}>
                    <div className="flex flex-col gap-lg">

                        {/* Image Section - Premium Look */}
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Ürün Görseli</label>
                            <div className="flex gap-md" style={{ alignItems: 'center' }}>
                                <div
                                    onClick={() => fileInputRef.current.click()}
                                    style={{
                                        width: '120px',
                                        height: '120px',
                                        borderRadius: 'var(--radius-lg)',
                                        background: 'var(--bg-tertiary)',
                                        border: '2px dashed var(--border-color)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {uploading ? (
                                        <Loader2 className="animate-spin text-muted" size={32} />
                                    ) : formData.image ? (
                                        <>
                                            <img src={formData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                background: 'rgba(0,0,0,0.5)',
                                                color: 'white',
                                                fontSize: '0.65rem',
                                                padding: '4px',
                                                textAlign: 'center',
                                                backdropFilter: 'blur(2px)'
                                            }}>Değiştir</div>
                                        </>
                                    ) : (
                                        <>
                                            <Camera size={24} className="text-muted" />
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>Fotoğraf Yükle</span>
                                        </>
                                    )}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div className="flex gap-sm">
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => fileInputRef.current.click()}
                                            style={{ flex: 1, fontSize: '0.8rem', padding: '10px' }}
                                        >
                                            <Upload size={16} /> Albumden Şeç
                                        </button>
                                    </div>
                                    <p className="text-muted mt-sm" style={{ fontSize: '0.75rem' }}>
                                        Kare (1:1) fotoğraflar en iyi sonucu verir.
                                    </p>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                    <input
                                        type="url"
                                        className="form-input mt-sm"
                                        style={{ fontSize: '0.8rem', padding: '8px' }}
                                        placeholder="Veya görsel URL'si yapıştırın..."
                                        value={formData.image}
                                        onChange={e => setFormData({ ...formData, image: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="form-group">
                            <label className="form-label">Ürün Adı</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Örn: Mercimek Çorbası"
                            />
                        </div>

                        <div className="flex gap-md">
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Kategori</label>
                                <select
                                    className="form-select"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    required
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ width: '130px' }}>
                                <label className="form-label">Baz Fiyat (€)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    required
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Ürün Açıklaması</label>
                            <textarea
                                className="form-textarea"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Ürün içeriği, alerjen bilgisi vb."
                                rows={2}
                            />
                        </div>

                        {/* Variations Section - High End UI */}
                        <div className="form-group">
                            <div className="flex justify-between items-center mb-sm">
                                <label className="form-label" style={{ margin: 0 }}>Varyasyonlar & Fiyatlar</label>
                            </div>

                            <div className="flex gap-sm mb-md">
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newVariation}
                                    onChange={e => setNewVariation(e.target.value)}
                                    placeholder="Örn: 500g, 1L, Büyük Boy"
                                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addVariation())}
                                />
                                <button type="button" className="btn btn-secondary" onClick={addVariation}>
                                    <Plus size={18} />
                                </button>
                            </div>

                            {formData.variations.length > 0 && (
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {formData.variations.map(v => (
                                        <div key={v} className="flex items-center gap-md p-sm" style={{
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600 }}>{v}</span>
                                            <div className="flex items-center gap-xs">
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', opacity: 0.5, color: 'var(--accent-success)' }}>€</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="form-input"
                                                        style={{ width: '85px', paddingLeft: '20px', height: '36px', fontSize: '0.875rem' }}
                                                        value={formData.variationPrices[v] || ''}
                                                        onChange={e => updateVariationPrice(v, e.target.value)}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-icon"
                                                    onClick={() => removeVariation(v)}
                                                    style={{ color: 'var(--accent-primary)', padding: '4px' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-md mt-lg" style={{ paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--border-color)' }}>
                            {product && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={onDeactivate}
                                    style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                                >
                                    Pasif Yap
                                </button>
                            )}
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '12px' }}
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="animate-spin mr-xs" size={18} />
                                        Kaydediliyor...
                                    </>
                                ) : (
                                    product ? '💾 Değişiklikleri Kaydet' : '✨ Ürünü Oluştur'
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
