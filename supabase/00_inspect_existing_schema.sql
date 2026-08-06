-- ============================================================================
-- KEŞİF: mevcut (eski) projenin şemasını çıkar
-- ----------------------------------------------------------------------------
-- NEDEN
--   Bu repoda şema tanımı yok: migration klasörü, SQL dosyası, supabase/config
--   hiçbiri mevcut değil. Şema sadece canlı veritabanında duruyor. Yeni projeyi
--   (pjtpnwxajocgdseqjfvn) kurabilmek için önce eskisini birebir çıkarmak
--   gerekiyor -- tahminle kurulan bir şema veri taşımada patlar.
--
-- NEREDE ÇALIŞTIRILACAK
--   ESKİ proje: hvcpjupsxuwfxnyfuyzw -> SQL Editor
--
-- GÜVENLİ Mİ
--   Evet. Hepsi salt-okunur katalog sorgusu. Hiçbir müşteri/sipariş verisi
--   dönmez, sadece yapı bilgisi. Çıktıyı gönül rahatlığıyla paylaşabilirsin.
--
-- NASIL
--   Sorguları TEK TEK çalıştır, çıktılarını sırayla yapıştır.
-- ============================================================================


-- ============================================================================
-- 1) KOLONLAR — tip, null durumu, varsayılan
-- ============================================================================
select table_name, ordinal_position as sira, column_name, data_type,
       is_nullable as null_olabilir, column_default as varsayilan
from information_schema.columns
where table_schema = 'public'
  and table_name in ('customers','orders','order_items','products')
order by table_name, ordinal_position;


-- ============================================================================
-- 2) KISITLAR — primary key, foreign key, unique, check
--    (FK'lerde ON DELETE davranışı kritik: order_items cascade olmalı)
-- ============================================================================
select con.conrelid::regclass::text as tablo,
       con.conname                  as kisit_adi,
       case con.contype
            when 'p' then 'PRIMARY KEY'
            when 'f' then 'FOREIGN KEY'
            when 'u' then 'UNIQUE'
            when 'c' then 'CHECK'
            else con.contype::text
       end                          as tur,
       pg_get_constraintdef(con.oid) as tanim
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace ns on ns.oid = rel.relnamespace
where ns.nspname = 'public'
  and rel.relname in ('customers','orders','order_items','products')
order by tablo, tur, kisit_adi;


-- ============================================================================
-- 3) İNDEKSLER
-- ============================================================================
select tablename as tablo, indexname as indeks, indexdef as tanim
from pg_indexes
where schemaname = 'public'
  and tablename in ('customers','orders','order_items','products')
order by tablo, indeks;


-- ============================================================================
-- 4) RLS DURUMU ve MEVCUT POLİTİKALAR
--    Beklenti: rls_acik = false (hepsinde), politika sayısı 0.
--    Farklıysa yeni projede birebir tekrarlamak yerine gözden geçirmem gerek.
-- ============================================================================
select tablename as tablo, rowsecurity as rls_acik
from pg_tables
where schemaname = 'public'
  and tablename in ('customers','orders','order_items','products')
order by tablo;

select schemaname, tablename as tablo, policyname as politika,
       roles, cmd as komut, qual as kosul, with_check
from pg_policies
where schemaname in ('public','storage')
order by tablo, politika;


-- ============================================================================
-- 5) anon / authenticated ROLLERİNİN TABLO YETKİLERİ
--    Şu anki durumu görmek için: yeni projede bunlar kaldırılacak.
-- ============================================================================
select grantee as rol, table_name as tablo,
       string_agg(privilege_type, ', ' order by privilege_type) as yetkiler
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon','authenticated')
  and table_name in ('customers','orders','order_items','products')
group by grantee, table_name
order by rol, tablo;


-- ============================================================================
-- 6) STORAGE BUCKET AYARLARI
-- ============================================================================
select id, name, public as herkese_acik,
       file_size_limit as boyut_limiti,
       allowed_mime_types as izinli_tipler
from storage.buckets;


-- ============================================================================
-- 7) REALTIME YAYINI — hangi tablolar canlı yayında
--    App.jsx 3 kanala abone: products, orders(+order_items), customers
-- ============================================================================
select schemaname, tablename as tablo
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablo;


-- ============================================================================
-- 8) MEVCUT FONKSİYONLAR — customer_identify dışında bir şey var mı
-- ============================================================================
select p.proname as fonksiyon,
       pg_get_function_identity_arguments(p.oid) as parametreler,
       case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end as guvenlik
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by fonksiyon;
