

## Plan: UI Overhaul + Urgency System + Dark Mode + Admin Codes + WhatsApp Config

This is a large plan touching ~12 files. Here's the breakdown:

---

### 1. Database Migration

Create new table `site_settings` to store WhatsApp number and external codes:

```sql
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number text NOT NULL DEFAULT '5547999999999',
  show_whatsapp_button boolean NOT NULL DEFAULT true,
  gtm_id text DEFAULT '',
  ga4_id text DEFAULT '',
  google_verification text DEFAULT '',
  facebook_pixel_id text DEFAULT '',
  custom_tracking_code text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);
-- Insert default row
-- RLS: public SELECT, admin ALL
```

---

### 2. Color & Font Overhaul (`src/index.css`)

- Match reference image: white/clean background hero option, dark bold headings (`foreground`), blue primary buttons, green WhatsApp buttons
- Ensure dark mode variables are properly set for all new components
- Hero section: switch from gradient dark hero to **clean white background** with dark text and colored city name (matching the screenshot)

---

### 3. Dark Mode Support (`src/App.tsx` + `src/components/ThemeToggle.tsx`)

- Install `next-themes` (already installed)
- Wrap app with `ThemeProvider`
- Create `ThemeToggle` component (sun/moon icon)
- Add toggle to navbar

---

### 4. Remove Admin Button from Navbar (`src/pages/Index.tsx`)

- Remove the `<Link to="/login">` Admin button from the public navbar (lines 234-236)

---

### 5. Rewrite Hero to Match Reference (`src/components/HeroSection.tsx`)

- White/light background instead of gradient
- Dark bold heading: "Fretes rápidos e entregas em 🚗 {cidade}" with city in colored text
- Subtitle: "Simule online em segundos"
- Blue "Simular Frete Agora" button + Green "Falar com Atendente no WhatsApp" button
- Pill badges: "Entrega em até 45 minutos" + "Garantia de entrega"
- Remove floating card on the right (simpler layout like reference)
- WhatsApp number pulled from `site_settings`

---

### 6. Add Services Section (`src/components/ServicesSection.tsx`)

New component listing motoboy services with SEO-optimized content:
- Coleta de pacotes Mercado Livre / Shopee
- Entrega de lanches e refeições
- Entrega de chaves
- Entrega de documentos e papéis
- Entrega de celulares e eletrônicos
- Coleta e entrega geral

Each with icon, title, short description. SEO: proper h2/h3 headings, descriptive text.

---

### 7. Urgency & Scheduling System in Simulator (`src/pages/Index.tsx`)

Add new fields after destination:

**"Quando é a entrega?"** — Select: `Hoje` | `Agendar`
- If `Hoje`: show optional time picker (not required)
  
**"Urgência"** — Select: `Express` | `Normal` | `Urgente`
- `Express`: subtitle "Tempo estimado: 1 hora"
- `Normal`: subtitle "Combinar horário"
- `Urgente`: subtitle "Em até 40 min + 5 min deslocamento até coleta"

---

### 8. Map Simplification (`src/components/FreightMap.tsx`)

- Switch tile layer to a cleaner/lighter style: use CartoDB Positron (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`) — free, minimal, light blue-ish
- Route line in subtle light blue (`hsl(210, 80%, 70%)`)
- Keep markers but simpler styling

---

### 9. Floating WhatsApp Button (`src/components/WhatsAppFloat.tsx`)

- Fixed bottom-right green WhatsApp icon button
- Number and visibility from `site_settings` table
- Shown on all pages

---

### 10. Admin: External Codes Page (`src/pages/admin/ExternalCodesPage.tsx`)

New admin page with form fields:
- Google Tag Manager ID
- Google Analytics 4 ID
- Google Site Verification meta tag
- Facebook Pixel ID
- Custom tracking code (textarea)
- WhatsApp number (used across entire site)
- Toggle: show WhatsApp floating button

Save to `site_settings` table.

---

### 11. Admin: Update Layout & Routes

- Add "Códigos Externos" nav item to `AdminLayout.tsx`
- Add route `/admin/external-codes` in `App.tsx`

---

### 12. Inject External Codes (`src/components/ExternalScripts.tsx`)

- Component that reads `site_settings` and injects GTM/GA4/Pixel scripts into `<head>` via `useEffect`
- Rendered in `App.tsx`

---

### 13. SEO Meta Tags

- Update `index.html` with proper meta description, og tags for "Frete Garça - Entregas rápidas por motoboy em Itapema, Porto Belo, Tijucas, Bombinhas, Balneário Camboriú e Itajaí"

---

### Files to Create
- `src/components/ThemeToggle.tsx`
- `src/components/ServicesSection.tsx`
- `src/components/WhatsAppFloat.tsx`
- `src/components/ExternalScripts.tsx`
- `src/pages/admin/ExternalCodesPage.tsx`
- Migration SQL

### Files to Edit
- `src/index.css` (hero colors, dark mode refinement)
- `src/App.tsx` (ThemeProvider, routes, ExternalScripts)
- `src/pages/Index.tsx` (remove admin btn, add services section, urgency fields)
- `src/components/HeroSection.tsx` (white bg style matching reference)
- `src/components/FreightMap.tsx` (lighter tile layer)
- `src/pages/admin/AdminLayout.tsx` (new nav item)
- `index.html` (SEO meta tags)

