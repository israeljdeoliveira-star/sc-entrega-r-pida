

## Plan: Fix City Selection, Reorder Layout, Rename Labels & Mobile Optimization

### Problem
The cities table is **empty** in the database (returns `[]`), so the Select dropdowns have no options. Plus several UI/naming/layout changes needed.

### 1. Database: Seed SC Cities
Insert the 6 SC cities into the `cities` table via migration:
- Itapema, Porto Belo, Tijucas, Bombinhas, Balneário Camboriú, Itajaí (all state=SC, is_active=true)

### 2. Reorder Page Layout (`src/pages/Index.tsx`)
Current order: Hero → Stats → Features → Services → Social Proof → **Simulator** → Footer

New order: Hero → Stats → **Simulator** → Features → Services → Social Proof → Footer

Move the simulator section right after the stats bar for faster access.

### 3. Rename Labels (`src/pages/Index.tsx`)
- Tab "Moto (SC)" → "Motoboy (SC)"
- Tab "Carro (Brasil)" → "Carro / Camionete (Brasil)"
- `Bike` icon label and all "Moto" references → "Motoboy"
- `currentVehicleLabel`: "Moto" → "Motoboy", "Carro" → "Carro/Camionete"
- WhatsApp message: "MOTO" → "MOTOBOY", "CARRO" → "CARRO/CAMIONETE"

### 4. Hero Text Change (`src/components/HeroSection.tsx`)
- Change h1 from "Fretes rápidos e entregas em" → "Fretes rápidos e entregas Motoboy em"
- Make logo larger: `h-16 sm:h-20` → `h-24 sm:h-32`

### 5. Navbar Logo Bigger (`src/pages/Index.tsx`)
- Logo in navbar: `h-9` → `h-12`

### 6. Mobile Optimization (`src/pages/Index.tsx`)
- Urgency/scheduling grid: `sm:grid-cols-2` → stack on mobile with proper spacing
- Simulator card: reduce padding on mobile
- Stats section: ensure 2-col grid works well on small screens (already `grid-cols-2`)
- Address fields: full width on mobile

### 7. Services Section SEO (`src/components/ServicesSection.tsx`)
- Update title to include "Motoboy" keyword: "Serviços de Motoboy em Itapema, Porto Belo e Região"

### Files to Edit
- `src/pages/Index.tsx` (reorder sections, rename labels, mobile tweaks)
- `src/components/HeroSection.tsx` (text + logo size)
- `src/components/ServicesSection.tsx` (already has good SEO, minor keyword update)
- Migration SQL (seed cities)

