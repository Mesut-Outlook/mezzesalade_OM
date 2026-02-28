import { generateWhatsAppUrl, generateWhatsAppMessage } from './src/utils/whatsapp.js';

// Mock data
const mockOrder = {
    id: '1234567890',
    date: '2026-02-27',
    total: 45.50,
    shipping: 8.00,
    items: [
        { name: 'Mercimek Çorbası', quantity: 2, price: 5.00 },
        { name: 'Adana Kebap', quantity: 1, price: 15.00 }
    ],
    notes: 'Test note'
};

const mockCustomer = {
    name: 'Deniz Inceoglu',
    phone: '+33640959616',  // French number
    address: 'Paris, France'
};

function test() {
    console.log('--- Testing WhatsApp URL Generation ---');

    const testNumbers = [
        '+31634316902',    // Dutch with +
        '0634316902',      // Dutch local
        '+33640959616',    // French with +
        '0033640959616',   // French with 00
        '634316902'        // Dutch no prefix
    ];

    testNumbers.forEach(num => {
        const url = generateWhatsAppUrl(num, 'Hello');
        console.log(`Input: ${num.padEnd(15)} -> Result: ${url}`);
    });

    console.log('\n--- Testing WhatsApp Message Formatting ---');
    const msg = generateWhatsAppMessage(mockOrder, mockCustomer, mockOrder.items);
    console.log(msg);
}

// Note: This script uses ES modules, so it needs to be run in a way that supports them.
// Since 'whatsapp.js' imports from '../hooks/useLocalStorage', this might fail if run with node directly.
// We'll just manually trace the logic since the code is straightforward.
test();
