-- ============================================================================
-- FAZ 1 / 2. DOSYA — PUBLIC YÜZEYİN RPC KATMANI
-- ----------------------------------------------------------------------------
-- NEREDE: YENİ proje (pjtpnwxajocgdseqjfvn) -> SQL Editor. 01'den SONRA.
--
-- ANA FİKİR
--   Anonim istemcinin tablolara doğrudan erişimi tamamen kapatılıyor
--   (03_policies.sql). Yerine buradaki SECURITY DEFINER fonksiyonlar geçiyor.
--   Fark şu: `.from('orders')` çağrısında ne döneceğine istemci karar verir;
--   RPC'de ne döneceğine sunucu karar verir.
--
--   Bu, "istemciden gelen veriye güvenme" kuralının tek uygulanabilir yeri.
--   Saldırgan bizim JS'imizi kullanmak zorunda değil -- anon anahtarla
--   doğrudan PostgREST'e istek atabilir. Dolayısıyla istemci tarafındaki
--   hiçbir kontrol güvenlik sayılmaz.
--
-- HEPSİ SECURITY DEFINER
--   Yani RLS'i atlarlar. Bu yüzden her biri kendi yetki kontrolünü kendisi
--   yapmak zorunda. search_path sabitlenmiş (şema kaçırma saldırısına karşı).
-- ============================================================================


-- ============================================================================
-- İSTEK KİMLİĞİ — rate limit için
-- ----------------------------------------------------------------------------
-- Telefon numarası doğrulanmamış bir kimlik: saldırgan istediği numarayı
-- deneyebilir. Bu yüzden asıl sayaç IP üzerinde tutuluyor. PostgREST istek
-- başlıklarını request.headers altında veriyor; SQL editöründen çağrılınca
-- bu ayar yok, o durumda 'unknown' dönüyor.
-- ============================================================================
create or replace function public.client_ip()
returns text
language sql
stable
as $$
    select coalesce(
        nullif(split_part(
            (nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for'),
            ',', 1
        ), ''),
        'unknown'
    );
$$;


create table public.rpc_rate_limit (
    bucket       text        not null,
    window_start timestamptz not null,
    hits         integer     not null default 0,
    primary key (bucket, window_start)
);

comment on table public.rpc_rate_limit is
    'RPC hız sınırı sayaçları. Kimseye açık değil; sadece SECURITY DEFINER fonksiyonlar yazar.';


-- true  -> istek serbest
-- false -> sınır aşıldı
create or replace function public.rate_limit_ok(
    p_bucket text,
    p_limit  integer,
    p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_seconds numeric := extract(epoch from p_window);
    v_window  timestamptz;
    v_hits    integer;
begin
    -- Pencereyi sabit dilimlere yuvarla (kayan pencere değil; basit ve ucuz).
    v_window := to_timestamp(floor(extract(epoch from now()) / v_seconds) * v_seconds);

    insert into public.rpc_rate_limit as r (bucket, window_start, hits)
    values (p_bucket, v_window, 1)
    on conflict (bucket, window_start)
        do update set hits = r.hits + 1
    returning r.hits into v_hits;

    -- Eski satırları ara sıra temizle: her çağrıda silmek gereksiz yük olurdu.
    if random() < 0.01 then
        delete from public.rpc_rate_limit where window_start < now() - interval '1 day';
    end if;

    return v_hits <= p_limit;
end;
$$;


-- Telefonu karşılaştırılabilir hale getirir (customers.phone_digits ile aynı kural).
create or replace function public.phone_key(p_phone text)
returns text
language sql
immutable
as $$
    select right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
$$;


-- ============================================================================
-- 1) customer_identify — telefonla tanıma
-- ----------------------------------------------------------------------------
-- Eski projedeki hotfix'in aynısı, iki farkla: artık phone_digits indeksini
-- kullanıyor (tablo taraması yok) ve rate limit'e bağlı.
--
-- Dönen alanlar bilinçli olarak dar: e-posta ve notlar HİÇ dönmez. Form
-- sadece ad/adres prefill'i için kullanıyor.
-- ============================================================================
create or replace function public.customer_identify(p_phone text)
returns table (id text, name text, phone text, address text)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_key text := public.phone_key(p_phone);
begin
    -- 9 haneden kısa girdiyle arama yapılmaz (numara tarama denemesi).
    if length(v_key) < 9 then
        return;
    end if;

    -- IP başına dakikada 20 deneme. Normal bir müşteri 1-2 kez dener.
    if not public.rate_limit_ok('identify:' || public.client_ip(), 20, interval '1 minute') then
        raise exception 'Çok fazla deneme yapıldı, lütfen biraz bekleyin.'
            using errcode = 'P0001';
    end if;

    return query
    select c.id::text, c.name::text, c.phone::text, c.address::text
    from public.customers c
    where c.phone_digits = v_key
    limit 1;
end;
$$;


-- ============================================================================
-- 2) customer_orders — sipariş geçmişi
-- ----------------------------------------------------------------------------
-- Eskiden fetchOrdersByCustomerId(customerId) vardı: müşteri id'sini bilen
-- herkes o müşterinin tüm siparişlerini okuyabiliyordu, üstelik id sipariş
-- akışında istemciye zaten veriliyordu.
--
-- Artık anahtar telefon numarası. Bu da güçlü bir kimlik değil (doğrulanmamış),
-- ama en azından tahmin edilebilir bir UUID değil ve rate limit'e tabi.
-- Gerçek çözüm SMS doğrulaması olurdu; kapsam dışı, bilinçli kabul edilen risk.
-- ============================================================================
create or replace function public.customer_orders(p_phone text)
returns table (
    id       text,
    date     date,
    status   text,
    total    numeric,
    shipping numeric,
    notes    text,
    items    jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_key text := public.phone_key(p_phone);
begin
    if length(v_key) < 9 then
        return;
    end if;

    if not public.rate_limit_ok('orders:' || public.client_ip(), 20, interval '1 minute') then
        raise exception 'Çok fazla deneme yapıldı, lütfen biraz bekleyin.'
            using errcode = 'P0001';
    end if;

    return query
    select o.id::text,
           o.date,
           o.status,
           o.total,
           o.shipping,
           o.notes,
           coalesce(
               (select jsonb_agg(jsonb_build_object(
                           'productId', oi.product_id,
                           'name',      oi.name,
                           'price',     oi.price,
                           'quantity',  oi.quantity,
                           'variation', oi.variation,
                           'category',  oi.category)
                        order by oi.name)
                from public.order_items oi
                where oi.order_id = o.id),
               '[]'::jsonb
           )
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where c.phone_digits = v_key
    order by o.date desc;
end;
$$;


-- ============================================================================
-- 3) public_menu_days — anonim menü listesi
-- ----------------------------------------------------------------------------
-- fetchPublicOrders'ın yerine geçer. Eskisi orders tablosuna doğrudan select
-- atıyordu; anonimleştirmeyi tarayıcıda yapıyordu, yani ham satırlar yine de
-- ağdan geçiyordu. Artık sunucu zaten anonimleştirilmiş satırlar dönüyor:
-- müşteri, tutar, not, sipariş id'si hiç çıkmıyor.
--
-- Satır satır dönüyor; gruplama supabase.js'te zaten var, istemci şekli
-- değişmesin diye orada bırakıldı.
-- ============================================================================
create or replace function public.public_menu_days()
returns table (
    date      date,
    name      text,
    variation text,
    price     numeric,
    category  text
)
language sql
security definer
set search_path = public
stable
as $$
    select distinct o.date, oi.name, oi.variation, oi.price, oi.category
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.date >= (now() at time zone 'Europe/Amsterdam')::date
    order by o.date, oi.name;
$$;


-- ============================================================================
-- 4) place_order — sipariş oluşturma
-- ----------------------------------------------------------------------------
-- EN ÖNEMLİ FONKSİYON. Eskiden istemci addCustomer + addOrder çağırıyor ve
-- fiyatı, kargoyu, toplamı KENDİSİ gönderiyordu. Yani anon anahtarla istek
-- atan biri 200 €'luk siparişi 0,01 € olarak kaydedebilirdi.
--
-- Burada istemciden gelen fiyat/toplam BİLGİSİ HİÇ KULLANILMIYOR. İstemci
-- sadece "hangi ürün, hangi varyasyon, kaç adet" diyor; fiyatı da kargoyu da
-- toplamı da sunucu hesaplıyor.
--
-- p_items formatı:
--   [{"productId": "<uuid>", "variation": "500g" | null, "quantity": 2}, ...]
-- ============================================================================
create or replace function public.place_order(
    p_name     text,
    p_phone    text,
    p_address  text,
    p_date     date,
    p_delivery text,          -- 'home' | 'pickup'
    p_notes    text,
    p_items    jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_key         text := public.phone_key(p_phone);
    v_customer_id uuid;
    v_order_id    uuid;
    v_item        jsonb;
    v_product     public.products%rowtype;
    v_variation   text;
    v_quantity    integer;
    v_price       numeric(10,2);
    v_subtotal    numeric(10,2) := 0;
    v_shipping    numeric(10,2) := 0;
    v_is_ams      boolean;
    v_count       integer;
begin
    -- ---- Girdi doğrulama -------------------------------------------------
    if coalesce(btrim(p_name), '') = '' then
        raise exception 'İsim zorunlu.' using errcode = 'P0001';
    end if;

    if length(v_key) < 9 then
        raise exception 'Geçerli bir telefon numarası girin.' using errcode = 'P0001';
    end if;

    if p_delivery not in ('home', 'pickup') then
        raise exception 'Teslimat yöntemi geçersiz.' using errcode = 'P0001';
    end if;

    if p_delivery = 'home' and coalesce(btrim(p_address), '') = '' then
        raise exception 'Eve teslimat için adres zorunlu.' using errcode = 'P0001';
    end if;

    -- Geçmişe sipariş yazılamaz.
    if p_date < (now() at time zone 'Europe/Amsterdam')::date then
        raise exception 'Geçmiş bir tarihe sipariş verilemez.' using errcode = 'P0001';
    end if;

    v_count := jsonb_array_length(coalesce(p_items, '[]'::jsonb));
    if v_count = 0 then
        raise exception 'Sepet boş.' using errcode = 'P0001';
    end if;
    if v_count > 100 then
        raise exception 'Tek siparişte en fazla 100 farklı ürün olabilir.' using errcode = 'P0001';
    end if;

    -- ---- Hız sınırı ------------------------------------------------------
    -- IP başına saatte 10 sipariş; aynı numaradan saatte 5.
    if not public.rate_limit_ok('place:' || public.client_ip(), 10, interval '1 hour') then
        raise exception 'Çok fazla sipariş denemesi. Lütfen daha sonra tekrar deneyin.'
            using errcode = 'P0001';
    end if;
    if not public.rate_limit_ok('place-phone:' || v_key, 5, interval '1 hour') then
        raise exception 'Bu numaradan çok fazla sipariş verildi. Lütfen bizi arayın.'
            using errcode = 'P0001';
    end if;

    -- ---- Müşteriyi bul ya da oluştur -------------------------------------
    select c.id into v_customer_id
    from public.customers c
    where c.phone_digits = v_key;

    if v_customer_id is null then
        insert into public.customers (name, phone, address, notes)
        values (btrim(p_name), btrim(p_phone), nullif(btrim(p_address), ''), 'Yeni Müşteri (Online)')
        returning id into v_customer_id;
    else
        -- Var olan kaydın adını EZMİYORUZ: müşterinin panelde düzeltilmiş adı
        -- olabilir. Adres sadece boşsa doldurulur.
        update public.customers
        set address = coalesce(address, nullif(btrim(p_address), ''))
        where id = v_customer_id;
    end if;

    -- ---- Kargo ücreti (sunucuda) -----------------------------------------
    -- CustomerOrderView.jsx:109-114'teki kuralın sunucu tarafı karşılığı:
    -- Amsterdam (adreste 'amsterdam' geçiyor ya da posta kodu 10xx/11xx) 8 €,
    -- diğer eve teslimat 10 €, gel-al 0 €.
    if p_delivery = 'home' then
        v_is_ams := (lower(coalesce(p_address, '')) like '%amsterdam%')
                    or (coalesce(p_address, '') ~ '\m1[01]\d{2}\M');
        v_shipping := case when v_is_ams then 8 else 10 end;
    else
        v_shipping := 0;
    end if;

    -- ---- Siparişi aç -----------------------------------------------------
    insert into public.orders (customer_id, date, status, notes, shipping, total)
    values (v_customer_id, p_date, 'new', p_notes, v_shipping, 0)
    returning id into v_order_id;

    -- ---- Kalemler: fiyat sunucudan --------------------------------------
    for v_item in select * from jsonb_array_elements(p_items)
    loop
        v_quantity  := coalesce((v_item ->> 'quantity')::integer, 0);
        v_variation := nullif(btrim(coalesce(v_item ->> 'variation', '')), '');

        if v_quantity < 1 or v_quantity > 999 then
            raise exception 'Ürün adedi geçersiz.' using errcode = 'P0001';
        end if;

        select * into v_product
        from public.products p
        where p.id = (v_item ->> 'productId')::uuid
          and p.is_active;

        if not found then
            raise exception 'Menüde olmayan bir ürün seçildi.' using errcode = 'P0001';
        end if;

        -- Varyasyonlu fiyat varsa o, yoksa ürünün temel fiyatı.
        -- (CustomerOrderView.jsx:232 ile aynı mantık, ama sunucuda.)
        v_price := coalesce(
            (v_product.variation_prices ->> v_variation)::numeric,
            v_product.price
        );

        insert into public.order_items
            (order_id, product_id, name, price, quantity, variation, category)
        values
            (v_order_id, v_product.id, v_product.name, v_price, v_quantity,
             v_variation, v_product.category);

        v_subtotal := v_subtotal + (v_price * v_quantity);
    end loop;

    -- ---- Toplamı sunucuda yaz -------------------------------------------
    update public.orders
    set total = v_subtotal + v_shipping
    where id = v_order_id;

    return jsonb_build_object(
        'id',         v_order_id,
        'customerId', v_customer_id,
        'subtotal',   v_subtotal,
        'shipping',   v_shipping,
        'total',      v_subtotal + v_shipping
    );
end;
$$;


-- ============================================================================
-- 5) customer_update_order — müşterinin kendi siparişini düzenlemesi
-- ----------------------------------------------------------------------------
-- Eskiden public route'a updateOrder veriliyordu (src/App.jsx:253): sipariş
-- id'sini bilen anonim biri O SİPARİŞİN kalemlerini silip yeniden yazabilir,
-- total ve status'ünü değiştirebilirdi.
--
-- Artık: sadece telefonu eşleşen müşterinin siparişi, sadece status='new'
-- ise, ve status/total yine istemciden alınmıyor -- yeniden hesaplanıyor.
-- ============================================================================
create or replace function public.customer_update_order(
    p_order_id uuid,
    p_phone    text,
    p_date     date,
    p_delivery text,
    p_notes    text,
    p_items    jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_key       text := public.phone_key(p_phone);
    v_order     public.orders%rowtype;
    v_item      jsonb;
    v_product   public.products%rowtype;
    v_variation text;
    v_quantity  integer;
    v_price     numeric(10,2);
    v_subtotal  numeric(10,2) := 0;
    v_shipping  numeric(10,2) := 0;
    v_address   text;
    v_is_ams    boolean;
begin
    if length(v_key) < 9 then
        raise exception 'Geçerli bir telefon numarası girin.' using errcode = 'P0001';
    end if;

    if not public.rate_limit_ok('update:' || public.client_ip(), 20, interval '1 hour') then
        raise exception 'Çok fazla değişiklik denemesi. Lütfen biraz bekleyin.'
            using errcode = 'P0001';
    end if;

    -- Sahiplik + durum kontrolü tek sorguda. Sipariş başkasınınsa ya da
    -- hazırlanmaya başlandıysa buradan geçemez.
    select o.* into v_order
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where o.id = p_order_id
      and c.phone_digits = v_key
      and o.status = 'new';

    if not found then
        -- Sipariş yok / başkasının / artık düzenlenemez -- üçünü ayırmıyoruz:
        -- ayırmak, id tahmin eden birine bilgi verirdi.
        raise exception 'Bu sipariş düzenlenemiyor.' using errcode = 'P0001';
    end if;

    if p_date < (now() at time zone 'Europe/Amsterdam')::date then
        raise exception 'Geçmiş bir tarihe sipariş verilemez.' using errcode = 'P0001';
    end if;

    if p_delivery not in ('home', 'pickup') then
        raise exception 'Teslimat yöntemi geçersiz.' using errcode = 'P0001';
    end if;

    select c.address into v_address
    from public.customers c where c.id = v_order.customer_id;

    if p_delivery = 'home' then
        v_is_ams := (lower(coalesce(v_address, '')) like '%amsterdam%')
                    or (coalesce(v_address, '') ~ '\m1[01]\d{2}\M');
        v_shipping := case when v_is_ams then 8 else 10 end;
    end if;

    delete from public.order_items where order_id = p_order_id;

    for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
    loop
        v_quantity  := coalesce((v_item ->> 'quantity')::integer, 0);
        v_variation := nullif(btrim(coalesce(v_item ->> 'variation', '')), '');

        if v_quantity < 1 or v_quantity > 999 then
            raise exception 'Ürün adedi geçersiz.' using errcode = 'P0001';
        end if;

        select * into v_product
        from public.products p
        where p.id = (v_item ->> 'productId')::uuid and p.is_active;

        if not found then
            raise exception 'Menüde olmayan bir ürün seçildi.' using errcode = 'P0001';
        end if;

        v_price := coalesce(
            (v_product.variation_prices ->> v_variation)::numeric,
            v_product.price
        );

        insert into public.order_items
            (order_id, product_id, name, price, quantity, variation, category)
        values
            (p_order_id, v_product.id, v_product.name, v_price, v_quantity,
             v_variation, v_product.category);

        v_subtotal := v_subtotal + (v_price * v_quantity);
    end loop;

    update public.orders
    set date = p_date, notes = p_notes,
        shipping = v_shipping, total = v_subtotal + v_shipping
    where id = p_order_id;

    return jsonb_build_object(
        'id', p_order_id, 'subtotal', v_subtotal,
        'shipping', v_shipping, 'total', v_subtotal + v_shipping
    );
end;
$$;


-- ============================================================================
-- YETKİLER
-- ----------------------------------------------------------------------------
-- Public sayfaların ihtiyacı olan beş fonksiyon anon'a açılır. Yardımcı
-- fonksiyonlar (rate_limit_ok, client_ip, phone_key) dışarıya AÇILMAZ --
-- anon rate_limit_ok'u doğrudan çağırabilseydi sayaçları şişirip kendi
-- sınırını sıfırlayabilir ya da başkasını kilitleyebilirdi.
-- ============================================================================
revoke all on function public.rate_limit_ok(text, integer, interval) from public, anon, authenticated;
revoke all on function public.client_ip()                            from public, anon, authenticated;

grant execute on function public.customer_identify(text)      to anon, authenticated;
grant execute on function public.customer_orders(text)        to anon, authenticated;
grant execute on function public.public_menu_days()           to anon, authenticated;
grant execute on function public.place_order(text, text, text, date, text, text, jsonb)
                                                              to anon, authenticated;
grant execute on function public.customer_update_order(uuid, text, date, text, text, jsonb)
                                                              to anon, authenticated;

-- Sayaç tablosu kimseye açık değil.
revoke all on public.rpc_rate_limit from anon, authenticated;


-- ============================================================================
-- DOĞRULAMA — 03 ve 04 çalıştıktan, veri taşındıktan sonra
--
--   -- bilinen numarayla tek satır:
--   select * from public.customer_identify('0634316902');
--
--   -- kısa girdi hiçbir şey dönmemeli:
--   select * from public.customer_identify('123');
--
--   -- menü günleri (müşteri/tutar/not sızmamalı):
--   select * from public.public_menu_days() limit 5;
--
--   -- fiyat manipülasyonu testi: aşağıdaki çağrıda fiyat GÖNDERİLMİYOR,
--   -- dönen total ürünün gerçek fiyatıyla eşleşmeli
--   select public.place_order(
--       'Test', '0600000001', 'Teststraat 1, 1012 AB Amsterdam',
--       current_date, 'home', 'test',
--       jsonb_build_array(jsonb_build_object(
--           'productId', (select id from public.products where is_active limit 1),
--           'variation', null, 'quantity', 2))
--   );
--   -- ardından temizle:
--   -- delete from public.customers where phone_digits = '600000001';
--
-- GERİ ALMA
--   drop function if exists public.place_order(text,text,text,date,text,text,jsonb),
--        public.customer_update_order(uuid,text,date,text,text,jsonb),
--        public.customer_orders(text), public.public_menu_days(),
--        public.customer_identify(text), public.rate_limit_ok(text,integer,interval),
--        public.client_ip(), public.phone_key(text);
--   drop table if exists public.rpc_rate_limit;
-- ============================================================================
