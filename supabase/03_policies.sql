-- ============================================================================
-- FAZ 1 / 3. DOSYA — YETKİLER VE RLS
-- ----------------------------------------------------------------------------
-- NEREDE: YENİ proje (pjtpnwxajocgdseqjfvn) -> SQL Editor. 02'den SONRA.
--
-- ESKİ PROJEDEKİ DURUM (00_inspect ile ölçüldü, tahmin değil)
--   anon rolünün dört tabloda da DELETE, INSERT, UPDATE, TRUNCATE yetkisi
--   vardı; tek politika "Allow all" USING (true) idi; products'ta RLS hiç
--   açık değildi. anon anahtar JS paketinin içinde herkese açık olduğu için
--   bu, "veri okunabilir"den öte "veri SİLİNEBİLİR" demekti.
--
--   Bu eski projede yamalanamıyordu çünkü admin paneli de aynı anon anahtarı
--   kullanıyordu: anon'dan DELETE'i almak admin panelini de bozardı.
--   Yeni modelde admin gerçek bir Auth kullanıcısı, o yüzden ayrılabiliyorlar.
--
-- KURAL
--   anon  -> tablolara erişimi YOK. Tek istisna: products'ta aktif satırları
--            okumak (menü). Geri kalan her şey 02'deki RPC'ler üzerinden.
--   authenticated -> sadece admins tablosunda satırı varsa tam CRUD.
-- ============================================================================


-- ============================================================================
-- 1) TABLO YETKİLERİNİ SIFIRLA
-- ----------------------------------------------------------------------------
-- Önce her şeyi geri al. RLS politikası, altta tablo yetkisi yoksa zaten
-- çalışmaz; ikisi birlikte çalışıyor. Bu sıralama önemli: politika yazıp
-- grant'ı unutmak "neden boş dönüyor" hatasının, tersi ise sessiz açığın
-- kaynağıdır.
-- ============================================================================
revoke all on public.customers, public.orders, public.order_items,
              public.products,  public.admins, public.rpc_rate_limit
    from anon, authenticated;

-- Yeni oluşturulacak tablolar da otomatik açılmasın.
alter default privileges in schema public revoke all on tables from anon, authenticated;


-- ============================================================================
-- 2) RLS'İ AÇ
-- Politikası olmayan + RLS açık tablo = kimse okuyamaz/yazamaz. Varsayılan
-- "kapalı"; aşağıda tek tek delik açıyoruz.
-- ============================================================================
alter table public.customers      enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.products       enable row level security;
alter table public.admins         enable row level security;
alter table public.rpc_rate_limit enable row level security;

-- ⚠️ FORCE ROW LEVEL SECURITY bilerek KULLANILMIYOR.
--    force, tablo sahibini de politikalara tabi kılar. 02'deki RPC'ler
--    SECURITY DEFINER, yani tablo sahibi olarak çalışıyorlar; force açık
--    olsaydı place_order kendi eklemek istediği siparişte RLS'e takılır ve
--    "new row violates row-level security policy" ile patlardı.
--    Normal (force'suz) RLS'te sahip muaf -- RPC katmanının çalışma biçimi
--    tam olarak buna dayanıyor.


-- ============================================================================
-- 3) ADMIN — authenticated + admins tablosunda satırı olan
-- ============================================================================
grant select, insert, update, delete
    on public.customers, public.orders, public.order_items, public.products
    to authenticated;

create policy admin_customers on public.customers
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

create policy admin_orders on public.orders
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

create policy admin_order_items on public.order_items
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

create policy admin_products on public.products
    for all to authenticated
    using (public.is_admin()) with check (public.is_admin());

-- İstemci "bu kullanıcı admin mi" diye sorabilsin diye fonksiyon açılıyor;
-- admins TABLOSU açılmıyor (kimlerin admin olduğu listesi dışarı çıkmasın).
grant execute on function public.is_admin() to authenticated;


-- ============================================================================
-- 4) ANON — tek delik: aktif ürünleri okumak
-- ----------------------------------------------------------------------------
-- Müşteri menüsü ürün listesini doğrudan okuyor (src/lib/supabase.js
-- fetchProducts). Bunu RPC'ye çevirmedim: products zaten public bilgi (menü),
-- ve doğrudan okuma realtime aboneliğinin çalışmasını sağlıyor.
--
-- ⚠️ DAVRANIŞ DEĞİŞİKLİĞİ: fetchProducts şu an is_active filtresi
--    UYGULAMIYOR, yani pasif ürünler müşteri menüsünde görünüyor olabilir.
--    Bu politika onu sessizce düzeltiyor. Geçişte eski ve yeni menüyü
--    karşılaştır: eksilen ürün varsa is_active'i yanlış olan üründür.
-- ============================================================================
grant select on public.products to anon;

create policy anon_active_products on public.products
    for select to anon
    using (is_active);

-- customers, orders, order_items, admins, rpc_rate_limit için anon'a
-- HİÇBİR politika ve hiçbir grant yok. Bilerek. Public yüzey sadece RPC.


-- ============================================================================
-- 5) ADMIN KULLANICISINI BAĞLA — bunu Auth kullanıcısını oluşturduktan sonra çalıştır
-- ----------------------------------------------------------------------------
-- SIRA:
--   1. Supabase paneli -> Authentication -> Users -> "Add user"
--      Şifreyi password manager ile üret. 'admin123!' KESİNLİKLE kullanma --
--      o şifre git geçmişinde duruyor. Şifreyi bana da yazma.
--   2. Authentication -> Providers -> Email -> "Allow new users to sign up"
--      KAPAT. Açık kalırsa herkes authenticated olur (admin olamaz ama
--      gereksiz yüzey).
--   3. Aşağıdaki satırdaki e-postayı kendi admin e-postanla değiştirip çalıştır.
-- ============================================================================
-- insert into public.admins (user_id, email)
-- select id, email from auth.users where email = 'BURAYA_ADMIN_EPOSTASI'
-- on conflict (user_id) do nothing;


-- ============================================================================
-- DOĞRULAMA
--
--   -- anon'un tablo yetkileri: SADECE products/SELECT dönmeli
--   select grantee, table_name, privilege_type
--   from information_schema.role_table_grants
--   where table_schema='public' and grantee='anon' order by 2,3;
--
--   -- altı tabloda da rls_acik = true olmalı
--   select tablename, rowsecurity as rls_acik from pg_tables
--   where schemaname='public' order by 1;
--
--   -- admin kaydı bağlandı mı (kullanıcıyı oluşturduktan sonra): 1 satır
--   select count(*) from public.admins;
--
-- CANLI SALDIRI TESTİ (Faz 5) — anon anahtarla, tarayıcı konsolundan:
--   supabase.from('customers').select('*')  -> boş dizi ya da hata
--   supabase.from('orders').delete().neq('id', '...')  -> reddedilmeli
--   supabase.from('products').select('*')   -> sadece is_active olanlar
--
-- GERİ ALMA
--   alter table public.customers   disable row level security;  -- vb.
--   drop policy if exists admin_customers on public.customers;  -- vb.
-- ============================================================================
