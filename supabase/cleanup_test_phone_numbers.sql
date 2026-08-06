-- ============================================================================
-- TEK SEFERLİK VERİ DÜZELTMESİ: test müşterilerinin telefon numaralarını ayır
-- ----------------------------------------------------------------------------
-- DURUM
--   customers tablosunda 7 kayıt aynı telefon numarasını paylaşıyor: işletme
--   sahibinin kendi numarası (son 3 hane 902), test amaçlı girilmiş.
--
--   Bu, telefonla tanıma özelliğini bozuyor: o numarayla giren birine 7
--   kayıttan biri dönüyor, hangisi olduğu created_at sırasına bağlı. Yani
--   yanlış isim ve yanlış adres prefill edilebiliyor.
--
-- YAPILACAK
--   Bu kayıtlara belirgin şekilde SAHTE, birbirinden farklı numaralar atanır:
--   0699999991, 0699999992, ... (en eski kayıttan başlayarak)
--
-- ⚠️ ÖNCE OKU
--   Bu numarayı GERÇEK bir siparişte de kullanmış olabilirsin. O 7 kayıttan
--   biri gerçek bir müşteriyse, numarası değişince siteye telefonuyla girip
--   kendini tanıtamaz. ADIM 1'deki isim listesine bakıp emin ol.
--
-- ÇALIŞTIRMA SIRASI: ADIM 1 -> ADIM 2 -> ADIM 3 -> ADIM 4. Atlama.
-- ============================================================================


-- ============================================================================
-- ADIM 1 — ÖNİZLEME (hiçbir şeyi değiştirmez)
-- Ne olacağını göster. İsimlere bakıp hepsinin test kaydı olduğunu doğrula.
-- ============================================================================
with hedef as (
    select right(regexp_replace(coalesce(phone,''),'\D','','g'), 9) as son9
    from public.customers
    where phone is not null and btrim(phone) <> ''
    group by 1
    having count(*) > 1
)
select c.id,
       c.name                                    as isim,
       c.phone                                   as eski_telefon,
       c.created_at                              as olusturma,
       '06' || lpad(
           row_number() over (order by c.created_at, c.id)::text, 8, '9'
       )                                         as yeni_telefon
from public.customers c
join hedef h
  on right(regexp_replace(coalesce(c.phone,''),'\D','','g'), 9) = h.son9
order by c.created_at, c.id;

-- Beklenen: 7 satır, yeni_telefon sütunu 0699999991 ... 0699999997.
-- İsimlerden biri gerçek müşteriyse BURADA DUR, bana söyle.


-- ============================================================================
-- ADIM 1b — "gerçek mi test mi" için nesnel ölçüt (yine hiçbir şeyi değiştirmez)
-- ----------------------------------------------------------------------------
-- İsme bakarak karar vermek zayıf. Asıl soru: bu kaydın gerçek sipariş
-- geçmişi var mı? 0 sipariş -> rahatça test kabul edilir.
-- Gerçek tutarlı ve yakın tarihli siparişleri varsa dikkat.
-- ============================================================================
with hedef as (
    select right(regexp_replace(coalesce(phone,''),'\D','','g'), 9) as son9
    from public.customers
    where phone is not null and btrim(phone) <> ''
    group by 1
    having count(*) > 1
)
select c.name                    as isim,
       c.address                 as adres,
       c.created_at::date        as olusturma,
       count(o.id)               as siparis_sayisi,
       coalesce(sum(o.total), 0) as toplam_tutar,
       max(o.date)               as son_siparis
from public.customers c
join hedef h
  on right(regexp_replace(coalesce(c.phone,''),'\D','','g'), 9) = h.son9
left join public.orders o on o.customer_id = c.id
group by c.id, c.name, c.address, c.created_at
order by count(o.id) desc, c.created_at;


-- ============================================================================
-- ADIM 2 — YEDEK (geri alabilmek için şart)
-- ----------------------------------------------------------------------------
-- ⚠️ Yedek 'public' şemasına KONMAZ. İçinde isim + gerçek telefon var, yani
--    PII. Supabase public şemasındaki yeni tablolara anon için varsayılan
--    yetki veriyor ve yeni tabloda RLS kapalı geliyor -- yedek orada olsaydı
--    anon key'i olan herkes okuyabilirdi. PostgREST yalnızca 'public' şemasını
--    dışa açtığı için 'arsiv' şemasındaki tabloya hiçbir REST isteği ulaşamaz.
-- ============================================================================
create schema if not exists arsiv;
revoke all on schema arsiv from anon, authenticated;

create table if not exists arsiv.customers_phone_backup_20260806 as
select c.id, c.name, c.phone, c.created_at, now() as yedeklendi
from public.customers c
where right(regexp_replace(coalesce(c.phone,''),'\D','','g'), 9) in (
    select right(regexp_replace(coalesce(phone,''),'\D','','g'), 9)
    from public.customers
    where phone is not null and btrim(phone) <> ''
    group by 1
    having count(*) > 1
);

revoke all on arsiv.customers_phone_backup_20260806 from anon, authenticated;

-- Doğrula: 7 satır olmalı
select count(*) as yedeklenen from arsiv.customers_phone_backup_20260806;


-- ============================================================================
-- ADIM 3 — GÜNCELLEME
-- ============================================================================
with hedef as (
    select right(regexp_replace(coalesce(phone,''),'\D','','g'), 9) as son9
    from public.customers
    where phone is not null and btrim(phone) <> ''
    group by 1
    having count(*) > 1
),
numaralanmis as (
    select c.id,
           '06' || lpad(
               row_number() over (order by c.created_at, c.id)::text, 8, '9'
           ) as yeni_telefon
    from public.customers c
    join hedef h
      on right(regexp_replace(coalesce(c.phone,''),'\D','','g'), 9) = h.son9
)
update public.customers c
set phone = n.yeni_telefon
from numaralanmis n
where c.id = n.id
  -- güvenlik: üretilen numara başka bir müşteride zaten varsa dokunma
  and not exists (
      select 1 from public.customers x
      where x.id <> c.id
        and right(regexp_replace(coalesce(x.phone,''),'\D','','g'), 9)
          = right(regexp_replace(n.yeni_telefon,'\D','','g'), 9)
  );

-- Beklenen: UPDATE 7


-- ============================================================================
-- ADIM 4 — DOĞRULAMA
-- ============================================================================

-- 4a) Artık hiçbir numara tekrar etmemeli: bu sorgu 0 satır dönmeli
select right(regexp_replace(coalesce(phone,''),'\D','','g'), 9) as son9,
       count(*) as kayit_sayisi
from public.customers
where phone is not null and btrim(phone) <> ''
group by 1
having count(*) > 1;

-- 4b) Kendi kendine tutarlılık: artık toplam == kendini_bulan olmalı
--     (telefonu boş kayıtlar hariç)
select count(*) as toplam,
       count(*) filter (where exists (
           select 1 from public.customer_identify(c.phone) f
           where f.id = c.id::text
       )) as kendini_bulan
from public.customers c
where c.phone is not null and btrim(c.phone) <> '';


-- ============================================================================
-- GERİ ALMA (bir şey ters giderse)
-- ============================================================================
-- update public.customers c
-- set phone = b.phone
-- from arsiv.customers_phone_backup_20260806 b
-- where c.id = b.id;
--
-- Yedeği işin sonuna kadar TUT. Veri taşıma bitip yeni projede doğrulama
-- yapıldıktan sonra sil:
-- drop schema arsiv cascade;
--
-- NOT: veri taşıma betiği (A1) yalnızca 'public' şemasını kopyalar;
--      'arsiv' şemasının yeni projeye taşınmaması gerekir.
-- ============================================================================
