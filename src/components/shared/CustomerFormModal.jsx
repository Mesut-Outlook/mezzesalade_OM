import { useState } from 'react';

/**
 * Reusable modal for creating/editing customers.
 * Extracts the duplicated pattern from OrderForm, TextParser, and CustomerList.
 *
 * Props:
 * - visible: boolean
 * - onClose: () => void
 * - onSave: (formData) => Promise<any>
 * - initialData: { name, phone, email, address, notes } — pre-fill values
 * - title: string
 * - labels: { name, phone, email, address, notes, save } — field labels
 * - placeholders: { name, phone, email, address, notes }
 * - showEmail: boolean (default false)
 */
export default function CustomerFormModal({
    visible,
    onClose,
    onSave,
    initialData = {},
    title = 'Yeni Müşteri',
    labels = {},
    placeholders = {},
    showEmail = false
}) {
    const [formData, setFormData] = useState({
        name: initialData.name || '',
        phone: initialData.phone || '',
        email: initialData.email || '',
        address: initialData.address || '',
        notes: initialData.notes || ''
    });
    const [saving, setSaving] = useState(false);

    // Sync initialData changes (e.g. from AI parser auto-fill)
    const initialKey = JSON.stringify(initialData);
    const [lastInitialKey, setLastInitialKey] = useState(initialKey);
    if (initialKey !== lastInitialKey) {
        setLastInitialKey(initialKey);
        setFormData({
            name: initialData.name || '',
            phone: initialData.phone || '',
            email: initialData.email || '',
            address: initialData.address || '',
            notes: initialData.notes || ''
        });
    }

    if (!visible) return null;

    const handleSave = async () => {
        if (!formData.name || !formData.phone) {
            alert(labels.validation || 'İsim ve telefon zorunludur!');
            return;
        }

        setSaving(true);
        await onSave(formData);
        setSaving(false);
        setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
    };

    const l = {
        name: labels.name || 'İsim *',
        phone: labels.phone || 'Telefon *',
        email: labels.email || 'Email',
        address: labels.address || 'Adres',
        notes: labels.notes || 'Not',
        save: labels.save || 'Kaydet',
        ...labels
    };

    const p = {
        name: placeholders.name || 'Müşteri adı',
        phone: placeholders.phone || '+31 6 12345678',
        email: placeholders.email || 'ornek@email.com',
        address: placeholders.address || 'Teslimat adresi',
        notes: placeholders.notes || '',
        ...placeholders
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="form-group">
                    <label className="form-label">{l.name}</label>
                    <input
                        type="text"
                        className="form-input"
                        placeholder={p.name}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">{l.phone}</label>
                    <input
                        type="tel"
                        className="form-input"
                        placeholder={p.phone}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>

                {showEmail && (
                    <div className="form-group">
                        <label className="form-label">{l.email}</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder={p.email}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">{l.address}</label>
                    <textarea
                        className="form-textarea"
                        placeholder={p.address}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        style={{ minHeight: 80 }}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">{l.notes}</label>
                    <textarea
                        className="form-textarea"
                        placeholder={p.notes}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        style={{ minHeight: 60 }}
                    />
                </div>

                <button className="btn btn-primary btn-block" onClick={handleSave} disabled={saving}>
                    {saving ? (labels.saving || 'Kaydediliyor...') : l.save}
                </button>
            </div>
        </div>
    );
}
