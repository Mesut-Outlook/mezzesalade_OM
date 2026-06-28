import { useState } from 'react';

/**
 * Reusable customer search dropdown with inline search + selection.
 * Extracts the duplicated pattern from OrderForm and TextParser.
 *
 * Props:
 * - customers: Array of customer objects
 * - selectedCustomer: currently selected customer (or null)
 * - onSelectCustomer: (customer) => void
 * - onClearCustomer: () => void  — called when user clicks "change"
 * - onAddNewClick: () => void — called when user clicks "add new customer"
 * - addNewLabel: string — label for the add-new button
 * - changeLabel: string — label for the change button (default "Değiştir")
 * - searchPlaceholder: string
 * - notFoundText: string
 * - showAddress: boolean — show address textarea when customer is selected (default false)
 * - addressLabel: string
 * - addressPlaceholder: string
 * - onAddressChange: (newAddress) => void
 */
export default function CustomerSearchDropdown({
    customers = [],
    selectedCustomer,
    onSelectCustomer,
    onClearCustomer,
    onAddNewClick,
    addNewLabel = '+ Yeni Müşteri Ekle',
    changeLabel = 'Değiştir',
    searchPlaceholder = 'Müşteri ara (isim veya telefon)...',
    notFoundText = 'Müşteri bulunamadı',
    showAddress = false,
    addressLabel,
    addressPlaceholder,
    onAddressChange
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    const filteredCustomers = customers.filter(c => {
        const nameMatch = c?.name ? String(c.name).toLowerCase().includes(searchQuery.toLowerCase()) : false;
        const phoneMatch = c?.phone ? String(c.phone).includes(searchQuery) : false;
        return nameMatch || phoneMatch;
    });

    if (selectedCustomer) {
        return (
            <div>
                <div className="flex justify-between items-center mb-md">
                    <div>
                        <div className="font-bold">{selectedCustomer.name}</div>
                        <div className="text-muted">{selectedCustomer.phone}</div>
                        {selectedCustomer.address && !showAddress && (
                            <div className="text-muted" style={{ fontSize: '0.875rem' }}>📍 {selectedCustomer.address}</div>
                        )}
                    </div>
                    <button
                        className="btn btn-secondary"
                        onClick={onClearCustomer}
                    >
                        {changeLabel}
                    </button>
                </div>
                {showAddress && (
                    <div className="form-group mb-0">
                        <label className="form-label">{addressLabel}</label>
                        <textarea
                            className="form-textarea"
                            placeholder={addressPlaceholder}
                            value={selectedCustomer.address || ''}
                            onChange={(e) => onAddressChange?.(e.target.value)}
                            style={{ minHeight: 60 }}
                        />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex gap-sm flex-col" style={{ position: 'relative' }}>
            <div className="search-container mb-0">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    className="search-input"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                />
            </div>

            {showDropdown && searchQuery.length > 0 && (
                <div className="card shadow-lg" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    marginTop: '4px',
                    padding: '8px'
                }}>
                    {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(customer => (
                            <div
                                key={customer.id}
                                className="product-card"
                                style={{ margin: '4px 0', cursor: 'pointer', padding: '12px' }}
                                onClick={() => {
                                    onSelectCustomer(customer);
                                    setSearchQuery('');
                                    setShowDropdown(false);
                                }}
                            >
                                <div className="info">
                                    <div className="name">{customer.name}</div>
                                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{customer.phone}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-muted text-center p-md">
                            {notFoundText}
                        </div>
                    )}
                </div>
            )}

            <button
                className="btn btn-secondary btn-block"
                onClick={onAddNewClick}
            >
                {addNewLabel}
            </button>
        </div>
    );
}
