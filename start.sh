#!/bin/bash
# Mezzesalade Sipariş Yönetim Sistemi Başlatma Scripti

cd "$(dirname "$0")"

echo "🍽️ Mezzesalade Sipariş Yönetimi başlatılıyor..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Bağımlılıklar yükleniyor..."
    npm install
fi

echo "🚀 Sunucu başlatılıyor..."
echo "📱 iPhone/iPad'den erişmek için aynı WiFi'a bağlı olun"
echo ""

npm run dev
