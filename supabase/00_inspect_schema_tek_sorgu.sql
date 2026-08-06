-- ============================================================================
-- KEŞİF (TEK SORGU) — eski projenin şemasını tek çıktıda topla
-- ----------------------------------------------------------------------------
-- 00_inspect_existing_schema.sql ile aynı bilgiyi verir, ama 8 ayrı sorgu
-- yerine tek JSON döner. Tek çalıştır, tek kopyala.
--
-- NEREDE:  ESKİ proje (hvcpjupsxuwfxnyfuyzw) -> SQL Editor
-- GÜVENLİ: hepsi salt-okunur katalog sorgusu. Müşteri/sipariş verisi DÖNMEZ,
--          sadece yapı bilgisi + satır sayıları.
--
-- Çıktı tek hücrede gelir: hücreye tıkla, tamamını kopyala, sohbete yapıştır.
-- Hücre kopyalanamazsa 00_inspect_existing_schema.sql'deki 8 sorguyu tek tek
-- çalıştır -- aynı bilgi.
-- ============================================================================

select jsonb_pretty(jsonb_build_object(

  -- 1) kolonlar: tip, null durumu, varsayılan
  '01_kolonlar', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.tablo, t.sira), '[]'::jsonb)
    from (
      select table_name::text            as tablo,
             ordinal_position::int       as sira,
             column_name::text           as kolon,
             data_type::text             as tip,
             is_nullable::text           as null_olabilir,
             column_default::text        as varsayilan
      from information_schema.columns
      where table_schema = 'public'
        and table_name in ('customers','orders','order_items','products')
    ) t
  ),

  -- 2) kısıtlar: PK / FK / UNIQUE / CHECK. FK'lerdeki ON DELETE kritik.
  '02_kisitlar', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.tablo, t.kisit), '[]'::jsonb)
    from (
      select con.conrelid::regclass::text  as tablo,
             con.conname::text             as kisit,
             pg_get_constraintdef(con.oid) as tanim
      from pg_constraint con
      join pg_class rel     on rel.oid = con.conrelid
      join pg_namespace ns  on ns.oid  = rel.relnamespace
      where ns.nspname = 'public'
        and rel.relname in ('customers','orders','order_items','products')
    ) t
  ),

  -- 3) indeksler
  '03_indeksler', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.tablo, t.indeks), '[]'::jsonb)
    from (
      select tablename::text as tablo, indexname::text as indeks, indexdef as tanim
      from pg_indexes
      where schemaname = 'public'
        and tablename in ('customers','orders','order_items','products')
    ) t
  ),

  -- 4) RLS açık mı  (beklenti: hepsinde false)
  '04_rls', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.tablo), '[]'::jsonb)
    from (
      select tablename::text as tablo, rowsecurity as rls_acik
      from pg_tables
      where schemaname = 'public'
        and tablename in ('customers','orders','order_items','products')
    ) t
  ),

  -- 5) mevcut politikalar  (beklenti: boş)
  '05_politikalar', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.tablo, t.politika), '[]'::jsonb)
    from (
      select schemaname::text as sema, tablename::text as tablo,
             policyname::text as politika, roles, cmd::text as komut,
             qual as kosul, with_check
      from pg_policies
      where schemaname in ('public','storage')
    ) t
  ),

  -- 6) anon / authenticated rollerinin tablo yetkileri
  '06_yetkiler', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.rol, t.tablo), '[]'::jsonb)
    from (
      select grantee::text as rol, table_name::text as tablo,
             string_agg(privilege_type::text, ', ' order by privilege_type::text) as yetkiler
      from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee in ('anon','authenticated')
        and table_name in ('customers','orders','order_items','products')
      group by grantee, table_name
    ) t
  ),

  -- 7) storage bucket ayarları
  '07_bucketlar', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]'::jsonb)
    from (
      select id::text, name::text, public as herkese_acik,
             file_size_limit as boyut_limiti,
             allowed_mime_types as izinli_tipler
      from storage.buckets
    ) t
  ),

  -- 8) realtime yayınındaki tablolar (App.jsx 3 kanala abone)
  '08_realtime', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.tablo), '[]'::jsonb)
    from (
      select schemaname::text as sema, tablename::text as tablo
      from pg_publication_tables
      where pubname = 'supabase_realtime'
    ) t
  ),

  -- 9) fonksiyonlar — customer_identify dışında ne var
  '09_fonksiyonlar', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.fonksiyon), '[]'::jsonb)
    from (
      select p.proname::text as fonksiyon,
             pg_get_function_identity_arguments(p.oid) as parametreler,
             case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end as guvenlik
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
    ) t
  ),

  -- 10) triggerlar (updated_at vb. otomasyon var mı)
  '10_triggerlar', (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.tablo, t.trigger_adi), '[]'::jsonb)
    from (
      select c.relname::text as tablo, tg.tgname::text as trigger_adi,
             pg_get_triggerdef(tg.oid) as tanim
      from pg_trigger tg
      join pg_class c      on c.oid = tg.tgrelid
      join pg_namespace n  on n.oid = c.relnamespace
      where not tg.tgisinternal
        and n.nspname = 'public'
    ) t
  ),

  -- 11) satır sayıları — taşıma sonrası doğrulamanın referansı
  '11_satir_sayilari', jsonb_build_object(
     'customers',   (select count(*) from public.customers),
     'orders',      (select count(*) from public.orders),
     'order_items', (select count(*) from public.order_items),
     'products',    (select count(*) from public.products)
  )

)) as sema_raporu;
