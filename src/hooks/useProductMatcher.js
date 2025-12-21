import Fuse from 'fuse.js';
import products from '../data/products.json';

// Normalize Turkish characters for better matching
function normalizeTurkish(text) {
    return text
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'i')
        .replace(/Ğ/g, 'g')
        .replace(/Ü/g, 'u')
        .replace(/Ş/g, 's')
        .replace(/Ö/g, 'o')
        .replace(/Ç/g, 'c');
}

// Common aliases for products
const aliases = {
    'çorba': ['corba', 'soup'],
    'köfte': ['kofte', 'meatball'],
    'börek': ['borek', 'pastry'],
    'patlıcan': ['patlican', 'aubergine', 'eggplant'],
    'tavuk': ['chicken', 'tavugu'],
    'mercimek': ['lentil'],
    'pilav': ['rice'],
    'salata': ['salad'],
    'dolma': ['stuffed'],
    'sarma': ['wrap', 'roll'],
    'biber': ['pepper'],
    'lahana': ['cabbage'],
    'nohut': ['chickpea'],
    'fasulye': ['bean'],
    'ıspanak': ['ispanak', 'spinach'],
    'humus': ['hummus'],
    'haydari': ['yogurt dip'],
    'kebab': ['kebap'],
};

// Create searchable product list with normalized names
const searchableProducts = products.map(product => ({
    ...product,
    normalizedName: normalizeTurkish(product.name),
    searchTerms: [
        normalizeTurkish(product.name),
        normalizeTurkish(product.category),
        product.description ? normalizeTurkish(product.description) : ''
    ].join(' ')
}));

// Configure Fuse.js for fuzzy search
const fuse = new Fuse(searchableProducts, {
    keys: [
        { name: 'normalizedName', weight: 0.7 },
        { name: 'searchTerms', weight: 0.3 }
    ],
    threshold: 0.4, // Lower = more strict matching
    distance: 100,
    includeScore: true,
    minMatchCharLength: 2
});

// Parse a line of text to extract quantity and product name
function parseLine(line) {
    const cleanLine = line.trim();
    if (!cleanLine) return null;

    // Common patterns for quantity extraction
    // "2x Mercimek Çorbası"
    // "2 adet Mercimek Çorbası"
    // "Mercimek Çorbası x2"
    // "Mercimek Çorbası 2"
    // "2 Mercimek Çorbası"

    let quantity = 1;
    let productName = cleanLine;

    // Pattern: "2x Product" or "2 x Product"
    const pattern1 = /^(\d+)\s*[xX]\s*(.+)$/;
    // Pattern: "2 adet Product"
    const pattern2 = /^(\d+)\s*(?:adet|porsiyon|kilo|kg)\s+(.+)$/i;
    // Pattern: "Product x2" or "Product x 2"
    const pattern3 = /^(.+?)\s*[xX]\s*(\d+)$/;
    // Pattern: "Product - 2" or "Product: 2"
    const pattern4 = /^(.+?)[\s\-:]+(\d+)$/;
    // Pattern: "2 Product" (number at start)
    const pattern5 = /^(\d+)\s+(.+)$/;

    let match;
    if ((match = cleanLine.match(pattern1))) {
        quantity = parseInt(match[1]);
        productName = match[2];
    } else if ((match = cleanLine.match(pattern2))) {
        quantity = parseInt(match[1]);
        productName = match[2];
    } else if ((match = cleanLine.match(pattern3))) {
        productName = match[1];
        quantity = parseInt(match[2]);
    } else if ((match = cleanLine.match(pattern4))) {
        productName = match[1];
        quantity = parseInt(match[2]);
    } else if ((match = cleanLine.match(pattern5))) {
        quantity = parseInt(match[1]);
        productName = match[2];
    }

    return {
        original: cleanLine,
        quantity,
        productName: productName.trim()
    };
}

// Match a product name to products in database
function matchProduct(productName) {
    const normalizedInput = normalizeTurkish(productName);

    // First try exact match
    const exactMatch = searchableProducts.find(
        p => p.normalizedName === normalizedInput
    );
    if (exactMatch) {
        return {
            product: exactMatch,
            confidence: 1.0,
            matchType: 'exact'
        };
    }

    // Try fuzzy search
    const results = fuse.search(normalizedInput);

    if (results.length === 0) {
        return null;
    }

    // Calculate confidence from Fuse score (0 = perfect match, 1 = worst)
    const bestMatch = results[0];
    const confidence = 1 - bestMatch.score;

    return {
        product: bestMatch.item,
        confidence,
        matchType: 'fuzzy',
        alternatives: results.slice(1, 4).map(r => ({
            product: r.item,
            confidence: 1 - r.score
        }))
    };
}

// Detect phone number pattern
function isPhoneNumber(text) {
    const cleaned = text.replace(/[\s\-\(\)\.]/g, '');
    // Dutch phone numbers: 06xxxxxxxx, +316xxxxxxxx, 00316xxxxxxxx
    // Turkish phone numbers: 05xxxxxxxxx, +905xxxxxxxxx
    return /^(\+?31|0031|0)?6\d{8}$/.test(cleaned) ||
        /^(\+?90|0090|0)?5\d{9}$/.test(cleaned) ||
        /^\d{10,12}$/.test(cleaned);
}

// Detect date patterns
function parseDate(text) {
    const cleanText = text.toLowerCase().trim();

    // Turkish month names
    const monthsTR = {
        'ocak': 0, 'şubat': 1, 'mart': 2, 'nisan': 3, 'mayıs': 4, 'mayis': 4,
        'haziran': 5, 'temmuz': 6, 'ağustos': 7, 'agustos': 7,
        'eylül': 8, 'eylul': 8, 'ekim': 9, 'kasım': 10, 'kasim': 10, 'aralık': 11, 'aralik': 11
    };

    // English month names
    const monthsEN = {
        'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
        'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5,
        'jul': 6, 'july': 6, 'aug': 7, 'august': 7,
        'sep': 8, 'sept': 8, 'september': 8, 'oct': 9, 'october': 9,
        'nov': 10, 'november': 10, 'dec': 11, 'december': 11
    };

    // Pattern: "22 Dec 2025", "22 December 2025", "22 Aralık 2025"
    const pattern1 = /(\d{1,2})\s+([a-zşçğüöıİ]+)\s+(\d{4})/i;
    // Pattern: "22/12/2025", "22-12-2025", "22.12.2025"
    const pattern2 = /(\d{1,2})[\/.\\-](\d{1,2})[\/.\\-](\d{4})/;
    // Pattern: "2025-12-22" (ISO format)
    const pattern3 = /(\d{4})-(\d{2})-(\d{2})/;

    let match;

    if ((match = cleanText.match(pattern1))) {
        const day = parseInt(match[1]);
        const monthName = match[2].toLowerCase();
        const year = parseInt(match[3]);

        const month = monthsTR[monthName] ?? monthsEN[monthName];
        if (month !== undefined && day >= 1 && day <= 31) {
            const date = new Date(year, month, day);
            return date.toISOString().split('T')[0];
        }
    }

    if ((match = cleanText.match(pattern2))) {
        const day = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const year = parseInt(match[3]);

        if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
            const date = new Date(year, month, day);
            return date.toISOString().split('T')[0];
        }
    }

    if ((match = cleanText.match(pattern3))) {
        return match[0]; // Already ISO format
    }

    return null;
}

// Check if line looks like an address
function isAddressLine(text) {
    const addressKeywords = [
        'straat', 'weg', 'laan', 'plein', 'gracht', 'kade',
        'nieuw', 'oud', 'noord', 'zuid', 'oost', 'west',
        'amsterdam', 'rotterdam', 'utrecht', 'den haag', 'almere',
        'sloten', 'buitenveldert', 'amstelveen',
        'adres', 'address', 'teslimat'
    ];

    const lowerText = text.toLowerCase();

    // Contains address keyword
    if (addressKeywords.some(kw => lowerText.includes(kw))) {
        return true;
    }

    // Looks like an address (contains number and letters)
    if (/\d+\s*[a-zA-Z]/.test(text) && text.length > 5) {
        return true;
    }

    return false;
}

// Check if line is likely a customer name (not a product)
function isLikelyName(text, productMatch) {
    // If it's a good product match, it's probably not a name
    if (productMatch && productMatch.confidence > 0.6) {
        return false;
    }

    // Names are usually 1-3 words and don't contain numbers
    const words = text.trim().split(/\s+/);
    if (words.length > 3 || words.length === 0) return false;
    if (/\d/.test(text)) return false;

    // First letter of each word should be uppercase (in original, not normalized)
    // This is a heuristic, not strict

    return true;
}

// Main function to parse WhatsApp message text with metadata extraction
export function parseOrderText(text, existingCustomers = []) {
    const lines = text.split(/[\n]+/).filter(line => line.trim());
    const results = [];

    // Extracted metadata
    let extractedDate = null;
    let extractedPhone = null;
    let extractedName = null;
    let extractedAddress = null;

    const productLines = [];

    // First pass: extract metadata
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Check for date
        const dateMatch = parseDate(trimmedLine);
        if (dateMatch) {
            extractedDate = dateMatch;
            continue;
        }

        // Check for phone number
        if (isPhoneNumber(trimmedLine)) {
            extractedPhone = trimmedLine.replace(/[\s\-\(\)\.]/g, '');
            // Normalize to international format
            if (extractedPhone.startsWith('06')) {
                extractedPhone = '+31' + extractedPhone.slice(1);
            } else if (extractedPhone.startsWith('316')) {
                extractedPhone = '+' + extractedPhone;
            }
            continue;
        }

        // Check for address (with keyword or format)
        if (isAddressLine(trimmedLine)) {
            // Remove "Adres:" prefix if present
            extractedAddress = trimmedLine.replace(/^adres\s*[:：]\s*/i, '').trim();
            continue;
        }

        // Try to match as product
        const parsed = parseLine(trimmedLine);
        if (parsed) {
            const productMatch = matchProduct(parsed.productName);

            // If it's not a good product match, might be a name
            if (!productMatch || productMatch.confidence < 0.5) {
                if (!extractedName && isLikelyName(trimmedLine, productMatch)) {
                    extractedName = trimmedLine;
                    continue;
                }
            }

            // Otherwise treat as product
            productLines.push({ line: trimmedLine, parsed, productMatch });
        }
    }

    // Second pass: process product lines
    for (const { line, parsed, productMatch } of productLines) {
        results.push({
            original: parsed.original,
            quantity: parsed.quantity,
            searchedName: parsed.productName,
            match: productMatch ? {
                product: productMatch.product,
                confidence: productMatch.confidence,
                matchType: productMatch.matchType,
                alternatives: productMatch.alternatives || []
            } : null
        });
    }

    // Try to find existing customer by phone or name
    let matchedCustomer = null;

    // First try to match by phone
    if (extractedPhone && existingCustomers.length > 0) {
        const normalizedPhone = extractedPhone.replace(/\D/g, '');
        matchedCustomer = existingCustomers.find(c => {
            const custPhone = c.phone.replace(/\D/g, '');
            return custPhone.endsWith(normalizedPhone.slice(-9)) ||
                normalizedPhone.endsWith(custPhone.slice(-9));
        });
    }

    // If no phone match, try to match by name
    if (!matchedCustomer && extractedName && existingCustomers.length > 0) {
        const normalizedName = normalizeTurkish(extractedName.toLowerCase().trim());
        matchedCustomer = existingCustomers.find(c => {
            const custName = normalizeTurkish(c.name.toLowerCase().trim());
            // Exact match or one contains the other
            return custName === normalizedName ||
                custName.includes(normalizedName) ||
                normalizedName.includes(custName);
        });
    }

    return {
        products: results,
        metadata: {
            date: extractedDate,
            phone: extractedPhone,
            name: extractedName,
            address: extractedAddress,
            matchedCustomer
        }
    };
}

// Search products for autocomplete
export function searchProducts(query) {
    if (!query || query.length < 2) return [];

    const normalizedQuery = normalizeTurkish(query);
    const results = fuse.search(normalizedQuery, { limit: 10 });

    return results.map(r => ({
        ...r.item,
        score: 1 - r.score
    }));
}

// Get all products
export function getAllProducts() {
    return products;
}

// Get products by category
export function getProductsByCategory() {
    const categories = {};
    for (const product of products) {
        if (!categories[product.category]) {
            categories[product.category] = [];
        }
        categories[product.category].push(product);
    }
    return categories;
}

// Get product by ID
export function getProductById(id) {
    return products.find(p => p.id === id);
}
