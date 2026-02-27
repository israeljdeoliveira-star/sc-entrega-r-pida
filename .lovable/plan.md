

## Plan: Tagline Bar, Tab Renames, CTA Animation, Weight Comparisons, Google Reviews Link, Footer SEO, City Animation Fix, Nav Menu, Service Photos Carousel

### 1. Tagline → Top border bar (`src/pages/Index.tsx`)
- Move "📍 Somos de Itapema — fretes via motoboy a partir de R$ 15,00" from HeroSection to a thin bar ABOVE the navbar (always visible, not affected by scroll hide)
- Remove that text from `HeroSection.tsx`

### 2. Tab renames (`src/pages/Index.tsx`)
- "Motoboy (SC)" → "Simular Motoboy"
- "Carro / Camionete" → "Simular meu Frete"

### 3. CTA "Simular Frete Agora" animation (`src/components/HeroSection.tsx`)
- Add framer-motion pulse/bounce animation to the CTA button (scale loop)

### 4. Remove "24/7 Suporte" from stats bar (`src/pages/Index.tsx`)
- Remove that stat item, keep only 3 items

### 5. Weight options with fruit comparisons (`src/pages/Index.tsx`)
- Max 20kg, remove 25kg and 30kg
- Add fruit comparisons: "1 kg - 🍎 Uma maçã grande", "2 kg - 🍊 Duas laranjas", "3 kg - 🍍 Um abacaxi", "5 kg - 🍉 Uma melancia pequena", "10 kg - 🎃 Uma abóbora média", "15 kg - 🍉🍉 Duas melancias", "20 kg - 🎃🎃 Duas abóboras"

### 6. Google reviews link (`src/components/SocialProof.tsx`)
- Wrap the "4.9 ★ no Google" badge and each review card with an `<a>` link to Google reviews page (configurable, use placeholder URL like `https://g.page/frete-garca/review`)

### 7. Footer with SEO links (`src/pages/Index.tsx`)
- Replace minimal footer with multi-column footer: Serviços, Cidades Atendidas, Contato, Links Úteis
- Include internal anchor links for SEO

### 8. City animation stays on same line (`src/components/HeroSection.tsx`)
- Alternate between 🏍️ and 🚗 icons with each city change
- Use `whitespace-nowrap` and adequate `min-w` to prevent line break during typing

### 9. Navigation menu (`src/pages/Index.tsx`)
- Add nav links in navbar: Início, Simulador, Serviços, Avaliações
- Each scrolls to the corresponding section via `id` anchors

### 10. Service Photos Carousel — DB + Storage + Admin + Frontend

**Database migration:**
- Create `service_photos` table: `id`, `title`, `image_url`, `sort_order`, `is_active`, `created_at`
- Create storage bucket `service-photos` (public)
- RLS: public SELECT, admin ALL

**Admin (`src/pages/admin/AdminLayout.tsx` + new `src/pages/admin/ServicePhotosPage.tsx`):**
- New admin page to upload/manage service photos
- Add nav item "Fotos Serviços" + route

**Frontend (`src/components/ServicePhotosCarousel.tsx`):**
- Carousel component using embla-carousel showing service photos from DB
- Place between Services and SocialProof sections

### Files to Create
- `src/pages/admin/ServicePhotosPage.tsx`
- `src/components/ServicePhotosCarousel.tsx`
- Migration SQL (service_photos table + storage bucket)

### Files to Edit
- `src/pages/Index.tsx` (tagline bar, tab renames, stats, weight, footer, nav menu, carousel placement)
- `src/components/HeroSection.tsx` (remove tagline, CTA animation, city line fix with alternating icons)
- `src/components/SocialProof.tsx` (Google reviews link)
- `src/pages/admin/AdminLayout.tsx` (new nav item)
- `src/App.tsx` (new admin route)

