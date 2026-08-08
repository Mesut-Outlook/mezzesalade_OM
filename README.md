# Mezzesalade Sipariş Yönetim Sistemi

Türk mutfağı restoran siparişlerini yönetmek için mobil uyumlu web uygulaması.

## 🚀 Özellikler

- 📅 **Takvim Görünümü** - Günlük sipariş sayıları
- 📝 **Sipariş Oluşturma** - Müşteri ve ürün seçimi
- 📊 **Günlük Özet** - Mutfak için hazırlanacak ürün listesi
- 🤖 **AI Metin Ayrıştırıcı** - WhatsApp mesajından sipariş oluşturma
- 📱 **WhatsApp Entegrasyonu** - Tek tıkla sipariş detayı gönderme
- 👥 **Müşteri Yönetimi** - Müşteri kayıtları
- 📦 **90+ Ürün** - Kategori bazında organize

## 📲 iPhone/iPad'de Kullanım

1. Safari'de siteyi aç
2. Paylaş butonuna (⬆️) tıkla
3. "Ana Ekrana Ekle" seç
4. Uygulama gibi kullan!

## 🏠 Lokal Çalıştırma

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Uygulama: http://localhost:5173
```

## ☁️ Vercel'e Deploy

1. GitHub'a push et
2. Vercel.com'da "New Project" 
3. Repo'yu seç
4. Deploy!

Ya da CLI ile:
```bash
npm install -g vercel
vercel
```

## 📁 Proje Yapısı

```
src/
├── components/
│   ├── AI/           # AI metin ayrıştırıcı
│   ├── Customers/    # Müşteri yönetimi
│   ├── Dashboard/    # Takvim görünümü
│   ├── Layout/       # Navigasyon
│   ├── Orders/       # Sipariş yönetimi
│   └── Products/     # Ürün kataloğu
├── data/
│   └── products.json # Ürün veritabanı
├── hooks/            # React hooks
└── utils/            # Yardımcı fonksiyonlar
```

## 💾 Veri Saklama

Veriler tarayıcının LocalStorage'ında saklanır:
- `mezzesalade-orders` - Siparişler
- `mezzesalade-customers` - Müşteriler

**Not:** Her cihaz kendi verisini tutar.

## 🔄 İş Akışı

1. **Sipariş Al**: WhatsApp'tan mesaj gelince
2. **AI ile Ayrıştır**: Mesajı yapıştır, ürünler otomatik eşleşsin
3. **Siparişi Kaydet**: Müşteri seç ve kaydet
4. **Günlük Özet**: Eşin mutfakta ne hazırlayacağını görsün
5. **WhatsApp Gönder**: Sipariş detayını müşteriye gönder
# mezzesalade
