<div align="center">

# ⚡ Immaculate AI

### Yeni Nesil Yapay Zekâ Destekli Kod Üretim Platformu

**Prompt yaz → gerçek zamanlı araştırmayla desteklenmiş, çalışmaya hazır, eksiksiz proje al.**

[![License: MIT](https://img.shields.io/badge/License-MIT-d97757.svg)](./LICENSE)
[![Made with React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E.svg?logo=supabase&logoColor=white)](https://supabase.com)

[Demo](https://immaculate.eu.cc) · [Özellikler](#-özellikler) · [Kurulum](#-kurulum) · [Kullanım](#-kullanım-kılavuzu) · [Mimari](#-mimari) · [Sorun Giderme](#-sorun-giderme)

</div>

---

## 📖 İçindekiler

1. [Proje Hakkında](#-proje-hakkında)
2. [Özellikler](#-özellikler)
3. [Mimari](#-mimari)
4. [Gereksinimler](#-gereksinimler)
5. [Kurulum](#-kurulum)
   - [1. Depoyu Klonlama](#1-depoyu-klonlama)
   - [2. Bağımlılıkları Yükleme](#2-bağımlılıkları-yükleme)
   - [3. Supabase Projesi Kurulumu](#3-supabase-projesi-kurulumu)
   - [4. Ortam Değişkenleri (.env)](#4-ortam-değişkenleri-env)
   - [5. Veritabanı Migration'larını Uygulama](#5-veritabanı-migrationlarını-uygulama)
   - [6. Edge Function'ları Deploy Etme](#6-edge-functionları-deploy-etme)
   - [7. Google OAuth Kurulumu](#7-google-oauth-kurulumu)
   - [8. Yerel Geliştirme Sunucusu](#8-yerel-geliştirme-sunucusu)
6. [Kullanım Kılavuzu](#-kullanım-kılavuzu)
7. [Yapay Zekâ Sağlayıcı Zinciri](#-yapay-zekâ-sağlayıcı-zinciri)
8. [Dağıtım (Deployment)](#-dağıtım-deployment)
9. [Proje Yapısı](#-proje-yapısı)
10. [Kod Kalitesi ve Güvenlik Filtreleri](#-kod-kalitesi-ve-güvenlik-filtreleri)
11. [Test Üretici](#-test-üretici)
12. [SEO ve Yapılandırılmış Veri (Schema.org)](#-seo-ve-yapılandırılmış-veri-schemaorg)
13. [Sorun Giderme](#-sorun-giderme)
14. [Katkıda Bulunma](#-katkıda-bulunma)
15. [Lisans](#-lisans)

---

## 🧭 Proje Hakkında

**Immaculate AI**, doğal dilde (Türkçe veya İngilizce) yazılan bir isteği alıp; canlı olarak paket kayıtçıları (npm, PyPI, crates.io, Maven), kod barındırma servisleri (GitHub, GitLab, Bitbucket) ve dokümantasyon kaynaklarından (MDN, StackOverflow, Wikipedia, DuckDuckGo) **gerçek zamanlı araştırma** yaparak, bu bağlamla zenginleştirilmiş, güncel ve gerçekten var olan kütüphane/sürüm isimlerine dayanan **eksiksiz, çalışmaya hazır kod projeleri** üreten bir platformdur.

Üretilen her proje; dosya ağacı, kurulum kılavuzu, performans/SEO/güvenlik analizi, canlı kod editörü, canlı önizleme, otomatik test iskeleti ve yorum bölümüyle birlikte kalıcı olarak saklanır ve paylaşılabilir bir bağlantı üretir.

> **Not:** Bu platform "her isteği anında ChatGPT gibi cevaplayan" bir kutu değildir — arka planda gerçek bir araştırma + üretim + kalite filtreleme zinciri çalışır. Aşağıdaki [Yapay Zekâ Sağlayıcı Zinciri](#-yapay-zekâ-sağlayıcı-zinciri) bölümü bunu ayrıntılı açıklar.

---

## ✨ Özellikler

| Kategori | Açıklama |
|---|---|
| 🤖 **AI Kod Üretimi** | Doğal dil isteğini gerçek paket/repo/dokümantasyon araştırmasıyla zenginleştirip eksiksiz proje üretir |
| 🔎 **17 Dış Kaynak Entegrasyonu** | Wikipedia, DuckDuckGo, Google, Yandex, GitHub, GitLab, Bitbucket, Gist, CodePen, Internet Archive, MDN, StackOverflow, npm, PyPI, crates.io, Laravel Docs, Microsoft Docs |
| 🧑‍💻 **Canlı Kod Editörü** | Monaco tabanlı (VS Code motoru) editör, çoklu dosya desteği, gerçek zamanlı ortak çalışma (kim hangi dosyaya bakıyor göstergesi dahil) |
| ▶️ **Canlı Önizleme (Sandbox)** | HTML/CSS/JS projelerini izole `iframe` içinde anında çalıştırıp gösterir — hem editör panelinde hem Testler sekmesinde |
| 🧪 **Otomatik Test Üretici** | Statik analizle Python / JS-TS / PHP dosyalarındaki fonksiyon, route ve bileşenleri tarayıp test iskeleti üretir (tamamen yerel, AI çağrısı yok) |
| 📦 **İndirme Seçenekleri** | Tam proje `.zip`, yapılandırılmış `.json` export, tek dosya indirme |
| 🔗 **Paylaşım** | Her proje için benzersiz, kalıcı, kopyalanabilir bağlantı |
| 🛡️ **Kalite/Güvenlik Filtreleri** | Minified/obfuscated/"anti-copy" tuzaklı üçüncü parti kodların sonuca sızmasını engelleyen otomatik filtre |
| 👤 **Google ile Giriş** | Supabase Auth üzerinden tek tıkla giriş |
| 🛠️ **Admin Paneli** | Kullanıcı yönetimi, yasaklama, moderasyon, debug logları |
| 💬 **Yorumlar** | Her proje sayfasında yorum/tartışma bölümü |
| 🌐 **Çok Dilli (i18n)** | Türkçe / İngilizce arayüz, tek tık dil değişimi |
| 📱 **%100 Mobil Uyumlu** | Header, sekmeler, editör ve tüm paneller taşma yapmadan responsive |
| 🔍 **SEO & Schema.org** | Open Graph, Twitter Card, JSON-LD (`Organization`, `WebSite`, `WebApplication`) tam uyumlu |
| 🗺️ **Otomatik Sitemap** | Saatlik cron ile `sitemap.xml` ve statik veri anlık senkronize edilir |

---

## 🏗️ Mimari

```
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────────────┐
│   React + Vite   │ ───▶ │  Supabase Edge Funcs  │ ───▶ │   Dış Kaynaklar (API)   │
│  (Frontend, SPA)  │◀─── │  generate-code        │◀───  │  Pollinations.ai         │
│                   │      │  search-sources       │      │  GitHub REST API        │
└─────────────────┘      └──────────────────────┘      │  npm / PyPI / crates.io  │
        │                          │                     │  MDN / StackOverflow ... │
        ▼                          ▼                     └─────────────────────────┘
┌─────────────────┐      ┌──────────────────────┐
│  Supabase Auth    │      │  Supabase Postgres    │
│  (Google OAuth)   │      │  (projects, profiles, │
│                   │      │   comments, debug_logs)│
└─────────────────┘      └──────────────────────┘
```

**Frontend:** React 18 + TypeScript + Vite, yönlendirme için hafif özel bir router (`src/lib/router.ts`), stil için Tailwind + özel CSS (`src/index.css`), kod editörü için `@monaco-editor/react`.

**Backend:** Supabase (Postgres + Auth + Edge Functions). Sunucu tarafı mantığın tamamı Deno tabanlı iki Edge Function'da toplanır:

- `generate-code` — istek doğrulama, moderasyon, ekosistem araştırması, LLM çağrısı, GitHub fallback
- `search-sources` — dış kaynak arama/tam içerik çekme proxy'si (CORS bypass)

**Statik Dağıtım:** GitHub Pages + özel alan adı (`immaculate.eu.cc`), saatlik GitHub Actions cron ile veri/sitemap senkronizasyonu.

---

## ✅ Gereksinimler

- **Node.js** ≥ 18 (önerilen: 20)
- **npm** ≥ 9
- Ücretsiz bir **Supabase** hesabı ve projesi ([supabase.com](https://supabase.com))
- **Supabase CLI** (migration ve edge function deploy için) — `npm i -g supabase`
- (Opsiyonel) **GitHub hesabı** — GitHub Pages üzerinden otomatik dağıtım için

> 💡 Hiçbir adım **ücretli bir API anahtarı gerektirmez**. Birincil AI sağlayıcısı (Pollinations.ai) tamamen ücretsiz ve anonimdir; dış kaynak aramaları da varsayılan olarak anahtarsız (keyless) modda çalışır.

---

## 🚀 Kurulum

### 1. Depoyu Klonlama

```bash
git clone https://github.com/<kullanici-adiniz>/immaculate-ai.git
cd immaculate-ai
```

### 2. Bağımlılıkları Yükleme

```bash
npm install
```

### 3. Supabase Projesi Kurulumu

1. [supabase.com/dashboard](https://supabase.com/dashboard) üzerinden yeni bir proje oluşturun.
2. **Project Settings → API** sayfasından şu iki değeri not edin:
   - `Project URL` (örn. `https://xxxxxxxx.supabase.co`)
   - `anon public` anahtarı
3. **Project Settings → API → service_role** anahtarını da not edin (yalnızca sunucu tarafında/CI'da kullanılacak, **asla frontend'e koymayın**).

### 4. Ortam Değişkenleri (.env)

Proje kök dizininde bir `.env` dosyası oluşturun:

```bash
# .env  (yerel geliştirme için — frontend'e gömülür, "anon" anahtar public olabilir)
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> Bu iki değişken atlanırsa proje demo Supabase projesine (`src/lib/supabase.ts` içindeki varsayılan) bağlanır — **kendi verileriniz için kendi projenizi kullanmanız önerilir.**

Sunucu tarafı (Edge Functions ve `scripts/sync-data.mjs`) için ayrıca şu değişkenler **CI/CD ortam değişkeni veya Supabase Edge Function secret'ı** olarak tanımlanmalı (bunlar `.env` dosyasına değil, GitHub repo secrets'a veya `supabase secrets set` komutuna girilir):

| Değişken | Zorunlu mu? | Açıklama |
|---|:---:|---|
| `SUPABASE_URL` | ✅ | Proje URL'i (Edge Functions runtime tarafından otomatik enjekte edilir) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | RLS'i bypass eden servis anahtarı (otomatik enjekte edilir) |
| `GITHUB_API` | ➖ opsiyonel | GitHub personal access token — arama rate limit'ini 10/dk → 30/dk yükseltir |
| `GITLAB_API` | ➖ opsiyonel | GitLab personal access token |
| `BITBUCKET_API` | ➖ opsiyonel | Bitbucket access token |
| `STACKOVERFLOW_API` | ➖ opsiyonel | Stack Exchange app key — günlük kotayı 300 → 10.000 yükseltir |
| `SUPABASE_ACCESS_TOKEN` | ✅ (yalnızca CI) | `supabase db push` / `functions deploy` için CLI kimlik doğrulama |
| `SUPABASE_DB_URL` | ✅ (yalnızca CI) | Doğrudan Postgres bağlantı dizesi (migration push için) |

### 5. Veritabanı Migration'larını Uygulama

```bash
supabase login
supabase link --project-ref <supabase-project-ref>
supabase db push
```

Bu komut `supabase/migrations/` altındaki dört migration'ı sırayla uygular:

- `create_projects_table` — ana `projects` tablosu
- `add_analysis_and_owner_token` — performans/SEO analiz kolonları + sahiplik token'ı
- `profiles_admin_schema` — kullanıcı profilleri, admin/ban şeması
- `add_temp_debug_logs` — geçici hata ayıklama log tablosu

### 6. Edge Function'ları Deploy Etme

```bash
supabase functions deploy generate-code
supabase functions deploy search-sources
```

İsterseniz opsiyonel secret'ları tanımlayın:

```bash
supabase secrets set GITHUB_API=ghp_xxxxxxxxxxxx
supabase secrets set STACKOVERFLOW_API=xxxxxxxxxxxx
```

### 7. Google OAuth Kurulumu

1. Supabase Dashboard → **Authentication → Providers → Google** sekmesine gidin ve etkinleştirin.
2. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) üzerinden bir OAuth 2.0 Client ID oluşturun.
3. Yetkili yönlendirme URI'sine Supabase'in verdiği `https://<proje-ref>.supabase.co/auth/v1/callback` adresini ekleyin.
4. İstemci kimliği ve gizli anahtarı Supabase Google provider ayarlarına yapıştırın.

### 8. Yerel Geliştirme Sunucusu

```bash
npm run dev
```

Tarayıcıda `http://localhost:5173` adresini açın. 🎉

Diğer faydalı komutlar:

```bash
npm run build       # üretim derlemesi (dist/ klasörüne)
npm run preview     # üretim derlemesini yerelde önizleme
npm run lint        # ESLint ile statik analiz
npm run typecheck   # TypeScript tip kontrolü (derleme yapmadan)
```

---

## 📘 Kullanım Kılavuzu

### Yeni Proje Üretme

1. Ana sayfadaki **prompt kutusuna** ne istediğinizi Türkçe veya İngilizce yazın (örn. *"Next.js ile karanlık modu olan bir blog admin paneli"*).
2. **Üret** butonuna basın. Sistem şu adımları sırasıyla yapar:
   - İsteğinizin gerçekten bir kod isteği olup olmadığını doğrular
   - İçerik moderasyonundan geçirir
   - İlgili paket/repo/dokümantasyon kaynaklarını canlı olarak tarar
   - Bu bağlamla LLM'e gönderip eksiksiz bir proje üretir
3. Sonuç sayfasında sekmeler arasında gezinin:
   - **Proje Özeti** — genel açıklama
   - **Klasör Yapısı** — dosya ağacı
   - **Kod Dosyaları** — Monaco editör, canlı düzenleme, işbirlikçi imleçler
   - **Kurulum Kılavuzu** — adım adım çalıştırma talimatları
   - **İndir** — `.zip` / `.json` / paylaşım bağlantısı
   - **Performans & SEO** — otomatik analiz kartları
   - **Testler** — canlı önizleme + otomatik test üretici
   - **Yorumlar** — tartışma bölümü

### Canlı Önizleme Kullanma

HTML/CSS/JS içeren projelerde **Testler** sekmesinin üstünde otomatik olarak bir **Canlı Önizleme** paneli belirir:

- 🔄 **Yenile** — dosyaları düzenledikten sonra önizlemeyi günceller
- ↗️ **Yeni sekmede aç** — tam ekran, ayrı bir sekmede test eder
- ⌃ **Daralt/Genişlet** — paneli gizleyip gösterir

> Önizleme, güvenlik için `sandbox` özniteliğiyle izole edilmiş bir `<iframe>` içinde çalışır; sayfa içeriğinizin geri kalanına erişemez.

### Test Üretme

**Testler** sekmesinde **"Testleri Üret"** butonuna basın. Sistem dosyalarınızı statik olarak tarar, tanıdığı fonksiyon/route/bileşenler için bir test iskeleti oluşturur ve `.zip` olarak indirmenizi sağlar. Bu işlem **tamamen yerel ve ücretsizdir**, hiçbir AI/API çağrısı yapılmaz.

### Kod Düzenleme ve İşbirliği

Giriş yaptıysanız (ve yasaklı değilseniz), **Kod Dosyaları** sekmesinde dosyaları doğrudan düzenleyebilir, yeni dosya ekleyebilir, mevcut dosyaları silebilirsiniz (silme yalnızca admin). Aynı anda başka biri de projeye bakıyorsa, kimin hangi dosyada olduğunu gösteren canlı işbirlikçi göstergesi belirir.

### Paylaşma / İndirme

- **Paylaş** — projenin benzersiz URL'sini panoya kopyalar
- **ZIP İndir** — tüm dosyaları tek bir arşivde indirir
- **JSON Export** — projeyi yapılandırılmış veri olarak dışa aktarır

---

## 🔗 Yapay Zekâ Sağlayıcı Zinciri

`generate-code` fonksiyonu, isteğinizi karşılamak için sırayla şu sağlayıcı zincirini dener:

1. **Pollinations.ai** *(birincil)* — tamamen ücretsiz, **anonim**, anahtar/kayıt gerektirmez. Uygulamanın hiçbir gizli anahtar olmadan çalışmasını sağlar.
2. **GitHub deposu fallback** *(yedek)* — Pollinations başarısız olursa (hız sınırı, kesinti vb.), sistem GitHub'ın anahtarsız genel repo arama API'sini kullanarak isteğinizle eşleşen gerçek açık kaynaklı bir proje bulur ve birkaç gerçek kaynak dosyasını Contents API üzerinden çeker. Bu, uç noktanın neredeyse hiçbir zaman "gösterilecek hiçbir şey yok" diye tamamen başarısız olmamasını garanti eder.

Bu fallback devreye girdiğinde, sonuç **açıkça** "GitHub deposundan alındı" olarak etiketlenir (`#fallback` etiketi) — asla gerçek üretim gibi gösterilmez.

### 🛡️ Otomatik Kalite Filtresi

GitHub fallback modu, çektiği dosyaları **doğrudan olduğu gibi sunmaz**. Aşağıdaki kalite kontrolünden geçirir ve uyan dosyaları otomatik eler:

- `.min.js` / `.min.css` ve bundle/paketlenmiş dosyalar
- jQuery/Bootstrap gibi hazır vendor kütüphaneleri
- Hex isimli değişkenlerle (`_0x...`) gizlenmiş (obfuscated) kod
- `eval()` / `unescape()` tabanlı decoder kalıpları
- Tek satıra sıkıştırılmış (minified) dosyalar
- `onkeydown` + `alert()` tabanlı "kopyalamayı engelleme" tuzakları

Bir depoda kabul edilebilir hiçbir dosya kalmazsa, sistem **sessizce çöp/obfuscated kod döndürmek yerine** bir sonraki aday depoyu dener; hiçbiri uygun değilse dürüst bir hata döner.

---

## ☁️ Dağıtım (Deployment)

Bu proje **GitHub Pages** + özel alan adı (`immaculate.eu.cc`, bkz. `public/CNAME`) üzerinden otomatik dağıtılacak şekilde yapılandırılmıştır (`.github/workflows/deploy.yml`):

- `main` dalına her push'ta: bağımlılıklar kurulur → Supabase verisi `public/data/*.json(.gz)` olarak dışa aktarılır → proje derlenir → GitHub Pages'e yayınlanır
- **Saatlik cron** (`0 * * * *`): kod değişmeden de veri ve `sitemap.xml`'i Supabase ile senkron tutar
- Kod push'larında ayrıca: veritabanı migration'ları uygulanır ve edge function'lar otomatik deploy edilir

Kendi fork'unuzda otomatik dağıtımı etkinleştirmek için repo **Settings → Secrets and variables → Actions** altına şu secret'ları ekleyin:

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_URL
```

Kendi alan adınızı kullanmak isterseniz `public/CNAME` içeriğini güncelleyin ve DNS sağlayıcınızda ilgili CNAME/A kayıtlarını GitHub Pages'e yönlendirin.

**Manuel derleme + kendi barındırmanız için:**

```bash
npm run build
# dist/ klasörünü herhangi bir statik hosting'e (Vercel, Netlify, Cloudflare Pages, kendi sunucunuz) yükleyin
```

> ⚠️ `vite.config.ts` içindeki `base: '/'` ayarı kök dizinden servis edilmeyi varsayar. Alt dizinden (örn. `example.com/immaculate/`) servis edecekseniz bu değeri güncelleyin.

---

## 🗂️ Proje Yapısı

```
immaculate-ai/
├── .github/workflows/deploy.yml     # CI/CD: build + Pages deploy + saatlik veri senkronu
├── public/
│   ├── data/                        # Supabase'den dışa aktarılan statik JSON'lar
│   ├── favicon.svg, logo.png, og-image.webp, apple-touch-icon.png
│   ├── manifest.webmanifest         # PWA manifesti
│   ├── sitemap.xml, robots.txt
│   └── CNAME                        # Özel alan adı
├── scripts/
│   └── sync-data.mjs                # Supabase → public/data + sitemap üretici
├── src/
│   ├── components/                  # Tüm React bileşenleri (Header, ProjectResult, AdminView, ...)
│   ├── lib/
│   │   ├── aiClient.ts              # generate-code fonksiyonunu çağıran istemci
│   │   ├── auth.tsx                 # Supabase Auth context'i
│   │   ├── collab.ts                # Gerçek zamanlı ortak düzenleme
│   │   ├── generator.ts             # (yerel/demo) anahtar kelime tabanlı üretim yardımcıları
│   │   ├── search/                  # Dış kaynak arama istemcileri + Türkçe arama desteği
│   │   ├── testgen/                 # Statik analiz tabanlı test üretici
│   │   ├── seo.ts                   # Sayfa başına dinamik SEO etiketleri
│   │   └── types.ts                 # Paylaşılan TypeScript tipleri
│   ├── App.tsx, main.tsx, index.css
├── supabase/
│   ├── functions/
│   │   ├── generate-code/           # Ana üretim edge function'ı
│   │   └── search-sources/          # Dış kaynak proxy edge function'ı
│   └── migrations/                  # Postgres şema geçmişi
├── index.html                       # SEO/OG/schema.org meta etiketleri + boot-error yakalayıcı
├── vite.config.ts, tailwind.config.js, tsconfig*.json
└── package.json
```

---

## 🧪 Test Üretici

`src/lib/testgen/` altındaki motor:

- **Analiz** (`analyze.ts`): dosyaları dil bazında ayrıştırıp fonksiyon/route/bileşen imzalarını çıkarır
- **Üretim** (`generateTests.ts`): her imza için ilgili dilin test çatısına uygun (Python → `pytest`, JS/TS → uygun test dosyası, PHP → PHPUnit tarzı) iskelet dosya üretir

Desteklenen diller: **Python, JavaScript/TypeScript, PHP**. Tanınan sembol bulunamazsa panelde bilgilendirici bir mesaj gösterilir — sessizce boş/yanlış test üretmez.

---

## 🔍 SEO ve Yapılandırılmış Veri (Schema.org)

`index.html` şunları içerir:

- Tam **Open Graph** ve **Twitter Card** meta etiketleri (`og-image.webp` — 1200×630)
- **Apple touch icon**, **web manifest**, favicon
- `@graph` içinde üç şema tipi barındıran **JSON-LD**: `Organization`, `WebSite` (site içi arama `potentialAction` dahil), `WebApplication`
- `canonical` bağlantı, `robots` direktifleri, `theme-color`

`scripts/sync-data.mjs`, her proje sayfası için `/p/<slug>` temiz URL'lerini içeren `sitemap.xml`'i saatlik olarak yeniden üretir, böylece arama motorları her zaman güncel bir harita bulur.

> Yapılandırılmış veriyi doğrulamak için [Schema Markup Validator](https://validator.schema.org) veya [Google Rich Results Test](https://search.google.com/test/rich-results) kullanabilirsiniz.

---

## 🩺 Sorun Giderme

| Belirti | Olası Neden | Çözüm |
|---|---|---|
| "6 saniye sonra hâlâ hiçbir şey yüklenmedi" hatası | Bir asset/script hiç yüklenemedi | Tarayıcı konsolunu kontrol edin; genellikle 404 veya ağ engeli |
| Giriş yapılamıyor (Google) | OAuth redirect URI yanlış | Supabase → Authentication → URL Configuration'ı kontrol edin |
| Proje üretilirken hata alınıyor | `generate-code` fonksiyonu hata döndürdü | Supabase Dashboard → Edge Functions → generate-code → Logs; ayrıca `debug_logs` tablosuna bakın |
| Üretilen kod "GitHub'dan alındı" etiketli ve beklenmedik | Birincil AI sağlayıcısı geçici olarak kullanılamıyordu | Bu normal, açıkça belirtilen bir yedek moddur — birkaç dakika sonra tekrar deneyin |
| Mobilde header/sekmeler taşıyor gibi görünüyor | Sekme çubuğu kasıtlı olarak yatay kaydırmalıdır | Parmakla sağa kaydırın; kenardaki soluklaşma efekti daha fazla sekme olduğunu gösterir |
| `npm install` sırasında paket hatası | Kilitli sürüm uyuşmazlığı | `rm -rf node_modules package-lock.json && npm install` deneyin |
| `supabase db push` migration hatası veriyor | Remote'ta commit edilmemiş bir migration kaydı var | `supabase migration repair --status reverted <versiyon>` çalıştırıp tekrar deneyin |

---

## 🤝 Katkıda Bulunma

1. Bu depoyu fork'layın
2. Bir özellik dalı oluşturun: `git checkout -b ozellik/harika-seyler`
3. Değişikliklerinizi commit'leyin: `git commit -m "feat: harika bir şey ekle"`
4. Dalınıza push'layın: `git push origin ozellik/harika-seyler`
5. Bir Pull Request açın

Göndermeden önce lütfen çalıştırın:

```bash
npm run lint
npm run typecheck
```

---

## 📄 Lisans

Bu proje [MIT Lisansı](./LICENSE) ile lisanslanmıştır.

---

<div align="center">

Made with ⚡ by **Immaculate AI**

</div>
