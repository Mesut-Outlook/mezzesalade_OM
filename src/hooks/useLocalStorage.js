// Custom hook for localStorage with React state sync
import { useState, useEffect } from 'react';
import { parseDateKey } from '../utils/dateUtils';

export function useLocalStorage(key, initialValue) {
    // Get stored value or use initial value
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    // Update localStorage when state changes
    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
}

// Generate unique ID
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format date for display
export function formatDate(dateString) {
    // parseDateKey kullanılıyor: new Date('2025-06-15') tarihi UTC gece yarısı
    // olarak okur, toLocaleDateString ise yerel saate çevirir — bu da UTC'nin
    // gerisindeki timezone'larda bir önceki günü gösterirdi.
    const date = parseDateKey(dateString);
    return date.toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Format currency
export function formatCurrency(amount) {
    return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}
