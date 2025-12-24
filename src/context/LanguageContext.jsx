import { createContext, useContext, useState, useEffect } from 'react';

const translations = {
    tr: {
        online_order: 'Online Sipariş',
        select_product: 'Ürün Seç',
        write_order: 'Yazarak Sipariş',
        ai_placeholder: 'Siparişinizi buraya yazın... Örn: 2 Mercimek çorbası',
        add_to_list: 'Listeye Ekle',
        cart: 'Sepetiniz',
        delivery_method: 'Teslimat Yöntemi',
        home_delivery: 'Eve Teslimat',
        pickup: 'Evden Alacağım',
        your_info: 'Bilgileriniz',
        full_name: 'Adınız Soyadınız',
        phone_number: 'Telefon Numaranız',
        address: 'Teslimat Adresi',
        order_date: 'Sipariş Tarihi',
        notes: 'Ek Notlar',
        notes_placeholder: 'Alerjiler veya özel istekler...',
        subtotal: 'Ara Toplam',
        delivery_fee: 'Teslimat Ücreti',
        total: 'Toplam',
        confirm_order: 'Siparişi Onayla',
        success_title: 'Siparişiniz Alındı!',
        success_message: 'Mezzesalade\'yi tercih ettiğiniz için teşekkür ederiz.',
        order_summary: 'Sipariş Özeti',
        new_order_btn: 'Yeni Sipariş Oluştur',
        login_msg: 'Önceki siparişlerinizi görmek ve bilgilerinizi otomatik doldurmak için telefon numaranızı girin.',
        login_btn: 'Beni Tanı',
        previous_orders: 'Geçmiş Siparişleriniz',
        no_orders: 'Henüz siparişiniz bulunmuyor.',
        logout: 'Çıkış Yap',
        identifying: 'Kimlik Doğrulanıyor...',
        optional: 'Opsiyonel',
        edit: 'Düzenle',
        update_order: 'Siparişi Güncelle',
        status_new: 'Yeni',
        status_preparing: 'Hazırlanıyor',
        status_ready: 'Hazır',
        status_delivered: 'Teslim Edildi',
        cannot_edit: 'Bu sipariş işleme alındığı için artık düzenlenemez.',
    },
    en: {
        online_order: 'Online Order',
        select_product: 'Select Product',
        write_order: 'Order by Text',
        ai_placeholder: 'Write your order here... e.g. 2 Lentil soup',
        add_to_list: 'Add to List',
        cart: 'Your Cart',
        delivery_method: 'Delivery Method',
        home_delivery: 'Home Delivery',
        pickup: 'Pick up from home',
        your_info: 'Your Information',
        full_name: 'Full Name',
        phone_number: 'Phone Number',
        address: 'Delivery Address',
        order_date: 'Order Date',
        notes: 'Additional Notes',
        notes_placeholder: 'Allergies or special requests...',
        subtotal: 'Subtotal',
        delivery_fee: 'Delivery Fee',
        total: 'Total',
        confirm_order: 'Confirm Order',
        success_title: 'Order Received!',
        success_message: 'Thank you for choosing Mezzesalade.',
        order_summary: 'Order Summary',
        new_order_btn: 'Create New Order',
        login_msg: 'Enter your phone number to see previous orders and auto-fill your info.',
        login_btn: 'Identify Me',
        previous_orders: 'Your Previous Orders',
        no_orders: 'You have no orders yet.',
        logout: 'Logout',
        identifying: 'Identifying...',
        optional: 'Optional',
        edit: 'Edit',
        update_order: 'Update Order',
        status_new: 'New',
        status_preparing: 'Preparing',
        status_ready: 'Ready',
        status_delivered: 'Delivered',
        cannot_edit: 'This order is being processed and cannot be edited anymore.',
    },
    nl: {
        online_order: 'Online Bestellen',
        select_product: 'Product Selecteren',
        write_order: 'Bestellen via Tekst',
        ai_placeholder: 'Schrijf hier uw bestelling... bijv. 2 Linzensoep',
        add_to_list: 'Voeg toe aan lijst',
        cart: 'Uw Winkelmandje',
        delivery_method: 'Bezorgmethode',
        home_delivery: 'Thuisbezorging',
        pickup: 'Afhalen',
        your_info: 'Uw Informatie',
        full_name: 'Volledige Naam',
        phone_number: 'Telefoonnummer',
        address: 'Bezorgadres',
        order_date: 'Besteldatum',
        notes: 'Extra Notities',
        notes_placeholder: 'Allergieën of speciale verzoeken...',
        subtotal: 'Subtotaal',
        delivery_fee: 'Bezorgkosten',
        total: 'Totaal',
        confirm_order: 'Bestelling Bevestigen',
        success_title: 'Bestelling Ontvangen!',
        success_message: 'Bedankt dat u voor Mezzesalade heeft gekozen.',
        order_summary: 'Bestelling Overzicht',
        new_order_btn: 'Nieuwe Bestelling Plaatsen',
        login_msg: 'Voer uw telefoonnummer in om eerdere bestellingen te zien en uw gegevens automatisch in te vullen.',
        login_btn: 'Identificeer Mij',
        previous_orders: 'Uw Vorige Bestelling',
        no_orders: 'U heeft nog geen bestellingen.',
        logout: 'Uitloggen',
        identifying: 'Identificeren...',
        optional: 'Optioneel',
        edit: 'Bewerken',
        update_order: 'Bestelling Bijwerken',
        status_new: 'Nieuw',
        status_preparing: 'Voorbereiden',
        status_ready: 'Gereed',
        status_delivered: 'Geleverd',
        cannot_edit: 'Deze bestelling wordt verwerkt en kan niet meer worden bewerkt.',
    }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(localStorage.getItem('lang') || 'tr');

    useEffect(() => {
        localStorage.setItem('lang', lang);
    }, [lang]);

    const t = (key) => {
        return translations[lang][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
