import Fuse from 'fuse.js';
import localProducts from '../data/products.json';

// Normalize Turkish characters for better matching
function normalizeTurkish(text) {
    if (!text) return '';
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

// Create searchable product list with normalized names
function getSearchableProducts(products) {
    return products.map(product => ({
        ...product,
        normalizedName: normalizeTurkish(product.name),
        searchTerms: [
            normalizeTurkish(product.name),
            normalizeTurkish(product.category),
            product.description ? normalizeTurkish(product.description) : ''
        ].join(' ')
    }));
}

// Create Fuse instance
function createFuse(searchableProducts) {
    return new Fuse(searchableProducts, {
        keys: [
            { name: 'normalizedName', weight: 0.7 },
            { name: 'searchTerms', weight: 0.3 }
        ],
        threshold: 0.4,
        distance: 100,
        includeScore: true,
        minMatchCharLength: 2
    });
}

// Parse a line of text to extract quantity and product name
function parseLine(line) {
    const cleanLine = line.trim();
    if (!cleanLine) return null;

    let quantity = 1;
    let productName = cleanLine;

    const pattern1 = /^(\d+)\s*[xX]\s*(.+)$/;
    const pattern2 = /^(\d+)\s*(?:adet|porsiyon|kilo|kg)\s+(.+)$/i;
    const pattern3 = /^(.+?)\s*[xX]\s*(\d+)$/;
    const pattern4 = /^(.+?)[\s\-:]+(\d+)$/;
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
function matchProduct(productName, searchableProducts, fuse) {
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
    return /^(\+?31|0031|0)?6\d{8}$/.test(cleaned) ||
        /^(\+?90|0090|0)?5\d{9}$/.test(cleaned) ||
        /^\d{10,12}$/.test(cleaned);
}

// Detect date patterns
function parseDate(text) {
    const cleanText = text.toLowerCase().trim();

    const monthsTR = {
        'ocak': 0, 'şubat': 1, 'mart': 2, 'nisan': 3, 'mayıs': 4, 'mayis': 4,
        'haziran': 5, 'temmuz': 6, 'ağustos': 7, 'agustos': 7,
        'eylül': 8, 'eylul': 8, 'ekim': 9, 'kasım': 10, 'kasim': 10, 'aralık': 11, 'aralik': 11
    };

    const monthsEN = {
        'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
        'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5,
        'jul': 6, 'july': 6, 'aug': 7, 'august': 7,
        'sep': 8, 'sept': 8, 'september': 8, 'oct': 9, 'october': 9,
        'nov': 10, 'november': 10, 'dec': 11, 'december': 11
    };

    const pattern1 = /(\d{1,2})\s+([a-zşçğüöıİ]+)\s+(\d{4})/i;
    const pattern2 = /(\d{1,2})[\/.\\-](\d{1,2})[\/.\\-](\d{4})/;
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
        return match[0];
    }

    return null;
}

function isAddressLine(text) {
    const addressKeywords = [
        'straat', 'weg', 'laan', 'plein', 'gracht', 'kade',
        'nieuw', 'oud', 'noord', 'zuid', 'oost', 'west',
        'amsterdam', 'rotterdam', 'utrecht', 'den haag', 'almere',
        'sloten', 'buitenveldert', 'amstelveen',
        'adres', 'address', 'teslimat'
    ];
    const lowerText = text.toLowerCase();
    if (addressKeywords.some(kw => lowerText.includes(kw))) return true;
    if (/\d+\s*[a-zA-Z]/.test(text) && text.length > 5) return true;
    return false;
}

function isLikelyName(text, productMatch) {
    if (productMatch && productMatch.confidence > 0.6) return false;
    const words = text.trim().split(/\s+/);
    if (words.length > 3 || words.length === 0) return false;
    if (/\d/.test(text)) return false;
    return true;
}

// Main function to parse WhatsApp message text
export function parseOrderText(text, productList = [], existingCustomers = []) {
    const productsToUse = productList.length > 0 ? productList : localProducts;
    const searchable = getSearchableProducts(productsToUse);
    const fuse = createFuse(searchable);

    const lines = text.split(/[\n]+/).filter(line => line.trim());
    const results = [];
    let extractedDate = null;
    let extractedPhone = null;
    let extractedName = null;
    let extractedAddress = null;

    const productLines = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const dateMatch = parseDate(trimmedLine);
        if (dateMatch) {
            extractedDate = dateMatch;
            continue;
        }

        if (isPhoneNumber(trimmedLine)) {
            extractedPhone = trimmedLine.replace(/[\s\-\(\)\.]/g, '');
            if (extractedPhone.startsWith('06')) {
                extractedPhone = '+31' + extractedPhone.slice(1);
            } else if (extractedPhone.startsWith('316')) {
                extractedPhone = '+' + extractedPhone;
            }
            continue;
        }

        if (isAddressLine(trimmedLine)) {
            extractedAddress = trimmedLine.replace(/^adres\s*[:：]\s*/i, '').trim();
            continue;
        }

        const parsed = parseLine(trimmedLine);
        if (parsed) {
            const productMatch = matchProduct(parsed.productName, searchable, fuse);

            if (!productMatch || productMatch.confidence < 0.5) {
                if (!extractedName && isLikelyName(trimmedLine, productMatch)) {
                    extractedName = trimmedLine;
                    continue;
                }
            }

            productLines.push({ line: trimmedLine, parsed, productMatch });
        }
    }

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

    let matchedCustomer = null;
    if (extractedPhone && existingCustomers.length > 0) {
        const normalizedPhone = extractedPhone.replace(/\D/g, '');
        matchedCustomer = existingCustomers.find(c => {
            const custPhone = c.phone.replace(/\D/g, '');
            return custPhone.endsWith(normalizedPhone.slice(-9)) ||
                normalizedPhone.endsWith(custPhone.slice(-9));
        });
    }

    if (!matchedCustomer && extractedName && existingCustomers.length > 0) {
        const normalizedName = normalizeTurkish(extractedName.toLowerCase().trim());
        matchedCustomer = existingCustomers.find(c => {
            const custName = normalizeTurkish(c.name.toLowerCase().trim());
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

export function searchProducts(query, productList = []) {
    if (!query || query.length < 2) return [];
    const productsToUse = productList.length > 0 ? productList : localProducts;
    const searchable = getSearchableProducts(productsToUse);
    const fuse = createFuse(searchable);

    const normalizedQuery = normalizeTurkish(query);
    const results = fuse.search(normalizedQuery, { limit: 10 });

    return results.map(r => ({
        ...r.item,
        score: 1 - r.score
    }));
}

export function getAllProducts(productList = []) {
    return productList.length > 0 ? productList : localProducts;
}

export function getProductsByCategory(productList = []) {
    const productsToUse = productList.length > 0 ? productList : localProducts;
    const categories = {};
    for (const product of productsToUse) {
        if (!categories[product.category]) {
            categories[product.category] = [];
        }
        categories[product.category].push(product);
    }
    return categories;
}

export function getProductById(id, productList = []) {
    const productsToUse = productList.length > 0 ? productList : localProducts;
    return productsToUse.find(p => p.id === id || p.id === parseInt(id));
}
