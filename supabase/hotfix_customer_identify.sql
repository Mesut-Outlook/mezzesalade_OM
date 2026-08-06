-- ============================================================================
-- HOTFIX: müşteri tablosunun tarayıcıya dökülmesini durdur
-- ----------------------------------------------------------------------------
-- SORUN
--   src/lib/supabase.js fetchCustomerByPhone, customers tablosunu FİLTRESİZ
--   select('*') ile çekip eşleştirmeyi tarayıcıda yapıyordu. Bu fonksiyon
--   public /ozel-siparis sayfasından çağrıldığı için siteye giren HERKES
--   network sekmesinden tüm müşterilerin adı, telefonu, e-postası, adresi ve
--   notlarını indirebiliyordu.
--
-- ÇÖZÜM
--   Eşleştirme sunucuya taşınıyor. Bu fonksiyon SADECE eşleşen tek satırı ve
--   sadece istemcinin ihtiyacı olan alanları döner. E-posta ve notlar hiç
--   dönmez -- form sadece ad/adres prefill'i için kullanıyor.
--
-- BU BETİK GÜVENLİ Mİ?
--   Evet, tamamen additive. Sadece yeni bir fonksiyon oluşturur; hiçbir
--   tabloya, politikaya veya mevcut davranışa dokunmaz. RLS AÇILMIYOR --
--   bu önemli, çünkü canlıda admin paneli de aynı anon anahtarı kullanıyor
--   ve RLS admin ile müşteriyi birbirinden ayıramaz (admin paneli boşalırdı).
--
-- ÇALIŞTIRMA
--   Supabase SQL Editor -> yapıştır -> Run. Eski proje: hvcpjupsxuwfxnyfuyzw
--
-- GERİ ALMA
--   drop function if exists public.customer_identify(text);
-- ============================================================================

-- NOT: dönen kolonlar bilerek text olarak deklare edilip aşağıda ::text ile
-- cast ediliyor. Bu projede id'ler UUID ya da legacy integer olabiliyor ve
-- ad/adres kolonları varchar olabilir; sabit bir tip deklare etmek fonksiyonun
-- "structure of query does not match function result type" ile patlamasına yol
-- açardı. İstemci tarafı zaten String(a) === String(b) ile karşılaştırıyor.
create or replace function public.customer_identify(p_phone text)
returns table (
    id text,
    name text,
    phone text,
    address text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_digits text;
    v_suffix text;
begin
    -- İstemcideki normalizasyonun aynısı: rakam dışı her şeyi at
    v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

    -- Çok kısa girdiyle tablo taranmasın (9 hane = mevcut JS kuralı)
    if length(v_digits) < 9 then
        return;
    end if;

    v_suffix := right(v_digits, 9);

    -- Mevcut JS eşleştirmesiyle aynı mantık:
    --   custPhone.endsWith(input.slice(-9)) || input.endsWith(custPhone.slice(-9))
    -- Telefon kolonu formatlı olabildiği için (0634 31 69 02, +31 6 ...)
    -- karşılaştırma iki tarafta da rakama indirgenerek yapılır.
    return query
    select c.id::text, c.name::text, c.phone::text, c.address::text
    from public.customers c
    where right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 9) = v_suffix
    order by c.created_at desc
    limit 1;
end;
$$;

-- Anon çağırabilmeli (public sipariş sayfası kullanıyor)
grant execute on function public.customer_identify(text) to anon, authenticated;

-- ============================================================================
-- DOĞRULAMA (çalıştırdıktan sonra)
--
--   -- bilinen bir telefonla tek satır dönmeli:
--   select * from public.customer_identify('0634316902');
--
--   -- kısa girdi hiçbir şey dönmemeli:
--   select * from public.customer_identify('123');
--
--   -- bilinmeyen numara hiçbir şey dönmemeli:
--   select * from public.customer_identify('0600000000');
-- ============================================================================

-- ============================================================================
-- DAVRANIŞ FARKI -- ÇALIŞTIRMADAN ÖNCE BUNU ÖLÇ
--
-- Eski JS eşleştirmesi iki yönlüydü:
--     cust.endsWith(input.slice(-9))  VEYA  input.endsWith(cust.slice(-9))
-- Bu, kayıtlı numara 9 haneden kısaysa YANLIŞ müşteriyi döndürebiliyordu
-- (birinin adresi başka birine gösterilebilirdi).
--
-- Yeni fonksiyon son 9 hanenin tam eşitliğine bakar: daha doğru, ama 9 haneden
-- kısa kayıtlı numaralar artık tanınmaz -- o müşteriler "yeni müşteri" gibi
-- görünür (sipariş verebilirler, sadece ad/adres prefill'i olmaz).
--
-- Kaç müşteriyi etkilediğini gör (PII dönmez, sadece sayı):
--
--   select count(*) as toplam,
--          count(*) filter (
--              where length(regexp_replace(coalesce(phone,''), '\D', '', 'g')) < 9
--          ) as kisa_numarali
--   from public.customers;
--
-- kisa_numarali = 0 ise davranış farkı yok, gönül rahatlığıyla uygula.
-- Sıfırdan büyükse söyle, eşleştirmeyi gevşetip yine de güvenli tutarım.
-- ============================================================================
