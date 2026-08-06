-- ============================================================================
-- FAZ 1 / 4. DOSYA — STORAGE
-- ----------------------------------------------------------------------------
-- NEREDE: YENİ proje (pjtpnwxajocgdseqjfvn) -> SQL Editor. 03'ten SONRA.
--
-- ESKİ PROJEDEKİ DURUM
--   product-images bucket'ında dört politika vardı ve adları
--   "Authenticated users can upload/update/delete" idi -- ama üçünün de
--   roles alanı 'public' ve içlerinde hiçbir kimlik kontrolü yoktu. Yani
--   anon anahtarı olan herkes 93 ürün görselini silebilir, üzerine yazabilir
--   ya da bucket'a keyfi dosya yükleyebilirdi. Bucket'ta boyut limiti ve
--   mime tipi kısıtı da yoktu.
--
--   Politika adının ne dediği önemli değil, USING/WITH CHECK içeriği önemli.
-- ============================================================================


-- ============================================================================
-- 1) BUCKET
-- ----------------------------------------------------------------------------
-- public = true kalıyor: görseller wsrv.nl proxy'si üzerinden servis ediliyor
-- (src/utils/imageUtils.js) ve proxy imzalı URL kullanamaz. Görsel zaten
-- public bilgi -- menü fotoğrafı. Kapatılan şey OKUMA değil, YAZMA.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'product-images',
    'product-images',
    true,
    5242880,                                  -- 5 MB
    array['image/jpeg','image/png','image/webp','image/avif','image/gif']
)
on conflict (id) do update
set public            = excluded.public,
    file_size_limit   = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;


-- ============================================================================
-- 2) POLİTİKALAR
-- ----------------------------------------------------------------------------
-- Aynı adla politika varsa çakışmasın diye önce siliniyor (betik tekrar
-- çalıştırılabilir olsun).
-- ============================================================================
drop policy if exists product_images_public_read on storage.objects;
drop policy if exists product_images_admin_write on storage.objects;
drop policy if exists product_images_admin_update on storage.objects;
drop policy if exists product_images_admin_delete on storage.objects;

-- Okuma: herkes. Menü görselleri.
create policy product_images_public_read on storage.objects
    for select to anon, authenticated
    using (bucket_id = 'product-images');

-- Yazma: sadece admin. src/lib/supabase.js uploadProductImage buradan geçiyor.
create policy product_images_admin_write on storage.objects
    for insert to authenticated
    with check (bucket_id = 'product-images' and public.is_admin());

create policy product_images_admin_update on storage.objects
    for update to authenticated
    using      (bucket_id = 'product-images' and public.is_admin())
    with check (bucket_id = 'product-images' and public.is_admin());

create policy product_images_admin_delete on storage.objects
    for delete to authenticated
    using (bucket_id = 'product-images' and public.is_admin());


-- ============================================================================
-- DOĞRULAMA
--
--   -- bucket ayarları: herkese_acik=true, 5 MB limit, 5 mime tipi
--   select id, public, file_size_limit, allowed_mime_types
--   from storage.buckets where id = 'product-images';
--
--   -- 4 politika dönmeli, hepsinde admin kontrolü (okuma hariç)
--   select policyname, cmd, roles, qual, with_check
--   from pg_policies where schemaname='storage' order by policyname;
--
-- SALDIRI TESTİ (Faz 5) — anon anahtarla tarayıcı konsolundan:
--   supabase.storage.from('product-images').upload('x.png', file)  -> 403
--   supabase.storage.from('product-images').remove(['<mevcut>'])   -> 403
--   görselin public URL'i tarayıcıda açılmalı                      -> 200
--
-- ⚠️ VERİ TAŞIMASI İÇİN NOT
--   A1 taşıma betiği görselleri yüklerken anon anahtarla ÇALIŞMAZ artık
--   (kasıtlı). Taşıma secret key ile yapılmalı -- secret key RLS'i ve storage
--   politikalarını bypass eder. Anahtar env değişkeninden okunmalı.
--
-- GERİ ALMA
--   drop policy if exists product_images_admin_write  on storage.objects;
--   drop policy if exists product_images_admin_update on storage.objects;
--   drop policy if exists product_images_admin_delete on storage.objects;
--   drop policy if exists product_images_public_read  on storage.objects;
-- ============================================================================
