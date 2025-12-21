import { useState, useRef } from 'react';
import { uploadProductImage } from '../../lib/supabase';
import { Camera, X, Plus, Trash2, Loader2, Upload } from 'lucide-react';

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
                [newVariation.trim()]: formData.price
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
            alert('Görsel yüklenirken bir hata oluştu.');
        }
        setUploading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 4000 }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
                <div className="modal-header">
                    <h2>{product ? 'Ürünü Düzenle' : '✨ Yeni Ürün'}</h2>
                    <button className="modal-close" onClick={onClose}><X size={24} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                    {/* Image Upload */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '12px', fontSize: '1.1rem', fontWeight: '600' }}>Ürün Görseli</label>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: '150px',
                                    height: '150px',
                                    borderRadius: '12px',
                                    background: 'var(--bg-tertiary)',
                                    border: '3px dashed var(--border-color)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}
                            >
                                {uploading ? (
                                    <Loader2 className="animate-spin" size={48} />
                                ) : formData.image ? (
                                    <>
                                        <img src={formData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            background: 'rgba(0,0,0,0.7)',
                                            color: 'white',
                                            fontSize: '0.9rem',
                                            padding: '8px',
                                            textAlign: 'center'
                                        }}>Değiştir</div>
                                    </>
                                ) : (
                                    <>
                                        <Camera size={40} />
                                        <span style={{ fontSize: '0.9rem', marginTop: '8px' }}>Fotoğraf</span>
                                    </>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    style={{ width: '100%', fontSize: '1rem', padding: '14px', marginBottom: '12px' }}
                                >
                                    <Upload size={20} /> {uploading ? 'Yükleniyor...' : 'Kamera / Albüm'}
                                </button>
                                {formData.image && (
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setFormData({ ...formData, image: '' })}
                                        style={{ width: '100%', fontSize: '1rem', padding: '14px' }}
                                    >
                                        <X size={20} /> Görseli Kaldır
                                    </button>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleImageUpload}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Product Name */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '1.1rem', fontWeight: '600' }}>Ürün Adı</label>
                        <input
                            type="text"
                            className="form-input"
                            style={{ fontSize: '1.1rem', padding: '16px', width: '100%' }}
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Örn: Mercimek Çorbası"
                        />
                    </div>

                    {/* Category and Price */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '1.1rem', fontWeight: '600' }}>Kategori</label>
                            <select
                                className="form-select"
                                style={{ fontSize: '1.1rem', padding: '16px', width: '100%' }}
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                required
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ width: '180px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '1.1rem', fontWeight: '600' }}>Fiyat (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="form-input"
                                style={{ fontSize: '1.2rem', padding: '16px', width: '100%', fontWeight: '700' }}
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                required
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '1.1rem', fontWeight: '600' }}>Açıklama</label>
                        <textarea
                            className="form-textarea"
                            style={{ fontSize: '1rem', padding: '14px', width: '100%', lineHeight: '1.6' }}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Ürün içeriği, alerjen bilgisi vb."
                            rows={3}
                        />
                    </div>

                    {/* Variations */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '12px', fontSize: '1.1rem', fontWeight: '600' }}>Varyasyonlar & Fiyatlar</label>

                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                            <input
                                type="text"
                                className="form-input"
                                style={{ fontSize: '1rem', padding: '14px', flex: 1 }}
                                value={newVariation}
                                onChange={e => setNewVariation(e.target.value)}
                                placeholder="Örn: 500g, 1L, Büyük Boy"
                                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addVariation())}
                            />
                            <button type="button" className="btn btn-primary" onClick={addVariation} style={{ padding: '14px 24px' }}>
                                <Plus size={24} />
                            </button>
                        </div>

                        {formData.variations.length > 0 && (
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {formData.variations.map(v => (
                                    <div key={v} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '16px',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: '12px',
                                        border: '2px solid var(--border-color)'
                                    }}>
                                        <span style={{ flex: 1, fontSize: '1.1rem', fontWeight: '600' }}>{v}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', fontWeight: '700', color: 'var(--accent-success)' }}>€</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="form-input"
                                                    style={{ width: '120px', paddingLeft: '32px', height: '50px', fontSize: '1.1rem', fontWeight: '600' }}
                                                    value={formData.variationPrices[v] || ''}
                                                    onChange={e => updateVariationPrice(v, e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => removeVariation(v)}
                                                style={{ padding: '12px', width: '50px', height: '50px' }}
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', paddingTop: '20px', borderTop: '2px solid var(--border-color)' }}>
                        {product && (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onDeactivate}
                                style={{ padding: '16px 24px', fontSize: '1rem' }}
                            >
                                Pasif Yap
                            </button>
                        )}
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '16px 24px', fontSize: '1.1rem', fontWeight: '700' }}
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Kaydediliyor...
                                </>
                            ) : (
                                product ? '💾 Kaydet' : '✨ Oluştur'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
