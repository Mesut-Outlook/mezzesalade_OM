-- ============================================================================
-- FAZ 1 / 1. DOSYA — YENİ PROJENİN ŞEMASI
-- ----------------------------------------------------------------------------
-- NEREDE ÇALIŞTIRILACAK
--   YENİ proje: pjtpnwxajocgdseqjfvn -> SQL Editor
--   ESKİ projede (hvcpjupsxuwfxnyfuyzw) ÇALIŞTIRMA.
--
-- SIRA
--   01_schema.sql -> 02_functions.sql -> 03_policies.sql -> 04_storage.sql
--   Dördü de aynı oturumda çalıştırılmalı. 01 ile 03 arasında tablolar
--   Supabase'in varsayılan yetkileriyle açık kalır; bu yüzden dosyanın sonunda
--   geçici bir revoke var, ama asıl kilit 03'te.
--
-- KAYNAK
--   Eski projenin şeması 00_inspect_schema_tek_sorgu.sql ile birebir çıkarıldı.
--   Aşağısı o yapı + bilinçli olarak yapılan düzeltmeler. Her düzeltmenin
--   gerekçesi yanında yazıyor.
-- ============================================================================


-- ============================================================================
-- ÖN KONTROL — yanlış projede çalıştırmaya karşı
-- Yeni proje boş olmalı. Tablolardan biri varsa betik durur.
-- ============================================================================
do $$
begin
    if exists (
        select 1 from information_schema.tables
        where table_schema = 'public'
          and table_name in ('customers','orders','order_items','products')
    ) then
        raise exception
            'public şemasında bu tablolardan biri zaten var. Yanlış projede olabilirsin (bu betik YENİ, boş proje içindir).';
    end if;
end $$;


-- ============================================================================
-- ADMIN KİMLİĞİ
-- ----------------------------------------------------------------------------
-- Eski projede admin girişi kozmetikti: şifre kaynak kodda, oturum
-- localStorage'da, ve admin ile müşteri AYNI anon anahtarı kullanıyordu.
-- Bu yüzden RLS admin'i müşteriden ayıramıyordu.
--
-- Yeni modelde admin gerçek bir Supabase Auth kullanıcısı. Ama "giriş yapmış
-- olmak" tek başına admin yapmaz -- self-signup açık kalırsa veya ileride
-- müşteri hesapları eklenirse herkes 'authenticated' olur. Yetki bu tabloda
-- satırı olmaya bağlı.
-- ============================================================================
create table public.admins (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    email      text,
    created_at timestamptz not null default now()
);

comment on table public.admins is
    'Yönetici yetkisi olan auth kullanıcıları. Buraya satır EKLEMEK yetki vermektir.';

-- Politikaların hepsi bunu çağıracak (03_policies.sql).
-- SECURITY DEFINER: admins tablosunun kendi RLS''ine takılmadan okuyabilmesi için.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.admins a where a.user_id = auth.uid()
    );
$$;


-- ============================================================================
-- updated_at OTOMASYONU
-- Eski şemada hiç trigger ve hiç updated_at yoktu: bir kaydın en son ne zaman
-- değiştiğini söylemek imkansızdı. Sipariş durumu değişimlerini takip etmek
-- ve ileride çakışma çözmek için gerekli.
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;


-- ============================================================================
-- CUSTOMERS
-- ============================================================================
create table public.customers (
    id         uuid primary key default gen_random_uuid(),
    name       text not null,
    phone      text not null,
    address    text,
    notes      text,
    email      text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Telefonun karşılaştırılabilir hali: rakam dışı her şey atılır, son 9 hane
    -- alınır. Kolon olarak tutuluyor çünkü:
    --   1) customer_identify artık tablo taramak yerine indeks kullanıyor,
    --   2) benzersizlik bunun üzerinden zorlanabiliyor.
    -- Telefonlar "0634 31 69 02", "+31 6 34 31 69 02" gibi farklı yazılıyor;
    -- ham kolona unique koymak işe yaramazdı.
    phone_digits text generated always as (
        right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9)
    ) stored
);

-- Aynı numarayla ikinci müşteri kaydı açılamaz.
-- (Eski projede bu kısıt yoktu; 7 adet mükerrer test kaydı böyle oluşmuştu.)
-- Kısmi indeks: rakam içermeyen/boş telefonlar kısıtın dışında kalır.
create unique index customers_phone_digits_key
    on public.customers (phone_digits)
    where phone_digits <> '';

create index customers_created_at_idx on public.customers (created_at desc);

create trigger customers_touch_updated_at
    before update on public.customers
    for each row execute function public.touch_updated_at();


-- ============================================================================
-- ORDERS
-- ============================================================================
create table public.orders (
    id          uuid primary key default gen_random_uuid(),

    -- ON DELETE SET NULL (eskiden CASCADE idi).
    -- Müşteri silinince sipariş ve tutarı DURUR, sadece kişiyle bağı kopar.
    -- Böylece ciro raporları bozulmaz, ve AVG/GDPR "silinme hakkı" talebi
    -- muhasebe verisini yok etmeden karşılanabilir.
    customer_id uuid references public.customers(id) on delete set null,

    date        date not null,
    status      text not null default 'new'
                check (status in ('new','preparing','ready','delivered')),
    notes       text,
    total       numeric(10,2) not null default 0 check (total    >= 0),
    shipping    numeric(10,2) not null default 0 check (shipping >= 0),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- ⚠️ status CHECK'i koddaki dört değerden çıkarıldı. Taşımadan önce ESKİ
--    projede şunu çalıştır; beklenmedik bir değer çıkarsa bana söyle:
--        select distinct status from public.orders;

create index orders_customer_id_idx on public.orders (customer_id);
create index orders_date_idx        on public.orders (date);
create index orders_created_at_idx  on public.orders (created_at desc);

create trigger orders_touch_updated_at
    before update on public.orders
    for each row execute function public.touch_updated_at();


-- ============================================================================
-- ORDER_ITEMS
-- ----------------------------------------------------------------------------
-- product_id'de bilerek FK YOK. Satır kendi name/price/variation/category
-- kopyasını tutuyor; ürün sonradan silinse veya zamlansa bile eski siparişin
-- tutarı değişmiyor. Eski şemadaki bu tercih korundu.
-- ============================================================================
create table public.order_items (
    id         uuid primary key default gen_random_uuid(),

    -- Eskiden nullable idi. Siparişi olmayan sipariş satırı anlamsız, ve
    -- öksüz satırlar ciro toplamlarına sessizce karışır.
    order_id   uuid not null references public.orders(id) on delete cascade,

    product_id uuid not null,
    name       text not null,
    price      numeric(10,2) not null check (price >= 0),
    quantity   integer not null default 1 check (quantity > 0),
    variation  text,
    category   text
);

create index order_items_order_id_idx on public.order_items (order_id);


-- ============================================================================
-- PRODUCTS
-- ============================================================================
create table public.products (
    id               uuid primary key default gen_random_uuid(),
    name             text not null,
    category         text not null,
    price            numeric(10,2) not null check (price >= 0),
    description      text,
    ingredients      text,
    image            text,

    -- ⚠️ Bu iki kolon eski veritabanında YOKTU, ama istemci ikisini de
    --    yazmaya çalışıyor (src/lib/supabase.js:407,409). Sonuç: admin
    --    panelinden yeni ürün ekleme ve DietManager'dan diyet etiketi
    --    kaydetme şu an canlıda ÇALIŞMIYOR (PostgREST bilinmeyen kolonu
    --    reddediyor), public menüdeki diyet filtresi de hep boş dönüyor.
    --    Kolonlar eklenince bu üç şey kendiliğinden düzeliyor.
    extra_images     text[]  not null default '{}',
    dietary_tags     text[]  not null default '{}',

    variations       text[]  not null default '{}',
    variation_prices jsonb   not null default '{}',
    is_active        boolean not null default true,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

-- Müşteri menüsü yalnızca aktif ürünleri isim sırasıyla listeliyor.
create index products_active_name_idx on public.products (name) where is_active;

create trigger products_touch_updated_at
    before update on public.products
    for each row execute function public.touch_updated_at();


-- ============================================================================
-- REALTIME YAYINI
-- ----------------------------------------------------------------------------
-- Eski projede yayında SADECE products vardı, oysa src/App.jsx:105-107 üç
-- kanala abone oluyor. subscribeToOrders ve subscribeToCustomers hiç
-- tetiklenmiyordu -- hata vermeden, sessizce. Pratik sonucu: iki cihaz açıkken
-- biri sipariş girince diğerinin ekranı güncellenmiyordu.
-- ============================================================================
do $$
declare
    t text;
begin
    foreach t in array array['customers','orders','order_items','products'] loop
        if not exists (
            select 1 from pg_publication_tables
            where pubname = 'supabase_realtime'
              and schemaname = 'public'
              and tablename = t
        ) then
            execute format('alter publication supabase_realtime add table public.%I', t);
        end if;
    end loop;
end $$;


-- ============================================================================
-- GEÇİCİ KİLİT
-- ----------------------------------------------------------------------------
-- Supabase, public şemasındaki YENİ tablolara anon ve authenticated için
-- otomatik yetki veriyor. 03_policies.sql çalışana kadar tablolar açık kalırdı.
-- Asıl yetki modeli 03'te kuruluyor; burası sadece o aradaki boşluğu kapatıyor.
-- ============================================================================
revoke all on public.customers, public.orders, public.order_items,
              public.products,  public.admins
    from anon, authenticated;


-- ============================================================================
-- DOĞRULAMA — çalıştırdıktan sonra
--
--   -- 5 tablo dönmeli: admins, customers, order_items, orders, products
--   select table_name from information_schema.tables
--   where table_schema = 'public' order by 1;
--
--   -- 4 satır dönmeli (realtime yayını)
--   select tablename from pg_publication_tables
--   where pubname = 'supabase_realtime' and schemaname = 'public' order by 1;
--
--   -- telefon benzersizlik indeksi yerinde mi
--   select indexname from pg_indexes
--   where schemaname = 'public' and indexname = 'customers_phone_digits_key';
--
-- GERİ ALMA (yeni proje boşken güvenli)
--   drop table if exists public.order_items, public.orders,
--                        public.customers, public.products, public.admins cascade;
--   drop function if exists public.is_admin(), public.touch_updated_at();
-- ============================================================================
