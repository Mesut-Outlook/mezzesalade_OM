// Email Service - Sends order notifications via API

const API_URL = import.meta.env.PROD
    ? '/api/send-email'
    : 'http://localhost:3000/api/send-email';

export async function sendOrderNotification(order, customer) {
    try {
        console.log('📧 Sending order notification email...');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ order, customer })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Email notification failed:', data.error);
            return { success: false, error: data.error };
        }

        console.log('✅ Email notification sent successfully');
        return { success: true, id: data.id };
    } catch (error) {
        console.error('❌ Email service error:', error);
        return { success: false, error: error.message };
    }
}
