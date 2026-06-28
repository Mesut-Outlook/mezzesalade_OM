// Simple in-memory rate limiter (per serverless instance)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // max 5 emails per minute per IP

function isRateLimited(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.set(ip, { windowStart: now, count: 1 });
        return false;
    }
    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) return true;
    return false;
}

function sanitizeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const ALLOWED_ORIGINS = [
    'https://mezzesalade.nl',
    'https://www.mezzesalade.nl',
    'https://mezzesalade-om.vercel.app'
];

export default async function handler(req, res) {
    // CORS headers — restrict to known origins
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limiting
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const { order, customer } = req.body;

    if (!order || !customer) {
        return res.status(400).json({ error: 'Missing order or customer data' });
    }

    // Input validation
    if (!customer.name || typeof customer.name !== 'string' || customer.name.length > 200) {
        return res.status(400).json({ error: 'Invalid customer name' });
    }
    if (!customer.phone || typeof customer.phone !== 'string' || customer.phone.length > 30) {
        return res.status(400).json({ error: 'Invalid customer phone' });
    }
    if (!order.items || !Array.isArray(order.items) || order.items.length === 0 || order.items.length > 100) {
        return res.status(400).json({ error: 'Invalid order items' });
    }
    if (typeof order.total !== 'number' || order.total < 0 || order.total > 100000) {
        return res.status(400).json({ error: 'Invalid order total' });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not set');
        return res.status(500).json({ error: 'Email service not configured' });
    }

    // Format order items
    const itemsList = order.items
        .map(item => `• ${item.quantity}x ${item.name}${item.variation ? ` (${item.variation})` : ''} - €${(item.price * item.quantity).toFixed(2)}`)
        .join('\n');

    const deliveryMethod = order.notes?.includes('(Delivery)') ? '🏠 Eve Teslimat' : '🛍️ Teslim Alma';
    const orderDate = new Date(order.date).toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #2d5a27 0%, #4a8f3c 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .customer-info { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .customer-info p { margin: 5px 0; }
        .items-list { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .item:last-child { border-bottom: none; }
        .totals { background: #2d5a27; color: white; padding: 20px; border-radius: 8px; }
        .totals .row { display: flex; justify-content: space-between; margin: 5px 0; }
        .totals .total { font-size: 20px; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.3); }
        .delivery-badge { display: inline-block; background: #e8f5e9; color: #2d5a27; padding: 8px 16px; border-radius: 20px; font-weight: 500; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🥗 Yeni Sipariş!</h1>
            <p>Mezzesalade Online Sipariş</p>
        </div>
        <div class="content">
            <div class="section">
                <div class="section-title">👤 Müşteri Bilgileri</div>
                <div class="customer-info">
                    <p><strong>İsim:</strong> ${sanitizeHtml(customer.name)}</p>
                    <p><strong>Telefon:</strong> ${sanitizeHtml(customer.phone)}</p>
                    ${customer.address ? `<p><strong>Adres:</strong> ${sanitizeHtml(customer.address)}</p>` : ''}
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">📦 Sipariş Detayları</div>
                <div class="items-list">
                    ${order.items.map(item => `
                        <div class="item">
                            <span>${parseInt(item.quantity) || 0}x ${sanitizeHtml(item.name)}${item.variation ? ` (${sanitizeHtml(item.variation)})` : ''}</span>
                            <span>€${(parseFloat(item.price) * (parseInt(item.quantity) || 0)).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="section">
                <div class="totals">
                    <div class="row">
                        <span>Ara Toplam:</span>
                        <span>€${(order.total - (order.shipping || 0)).toFixed(2)}</span>
                    </div>
                    ${order.shipping > 0 ? `
                        <div class="row">
                            <span>Teslimat Ücreti:</span>
                            <span>€${order.shipping.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="row total">
                        <span>TOPLAM:</span>
                        <span>€${order.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            <div class="section" style="text-align: center;">
                <div class="section-title">🚚 Teslimat Yöntemi</div>
                <span class="delivery-badge">${deliveryMethod}</span>
            </div>
            
            <div class="section">
                <div class="section-title">📅 Sipariş Tarihi</div>
                <p style="font-size: 16px; margin: 0;">${orderDate}</p>
            </div>
            
            ${order.notes ? `
                <div class="section">
                    <div class="section-title">📝 Notlar</div>
                    <p style="margin: 0; color: #666;">${sanitizeHtml(String(order.notes).replace(' (Delivery)', '').replace(' (Pickup)', ''))}</p>
                </div>
            ` : ''}
        </div>
        <div class="footer">
            <p>Bu email Mezzesalade Online Sipariş sistemi tarafından otomatik olarak gönderilmiştir.</p>
        </div>
    </div>
</body>
</html>
    `;

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Mezzesalade <onboarding@resend.dev>',
                to: ['mezzesalade@gmail.com', 'ozdemiralv@gmail.com'],
                subject: `🥗 Yeni Sipariş: ${sanitizeHtml(customer.name)} - €${order.total.toFixed(2)}`,
                html: emailHtml
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Resend API error:', data);
            return res.status(response.status).json({ error: data.message || 'Failed to send email' });
        }

        console.log('✅ Email sent successfully:', data);
        return res.status(200).json({ success: true, id: data.id });
    } catch (error) {
        console.error('Email send error:', error);
        return res.status(500).json({ error: 'Failed to send email' });
    }
}
