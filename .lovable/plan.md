

## Plan: Hero Cleanup, Sticky Navbar, Stats Bar, Motoboy Fields & Carro City Search

### 1. HeroSection — Remove logo, add tagline (`src/components/HeroSection.tsx`)
- Remove the `<motion.img>` logo block (lines 64-71)
- Add a tagline above h1: "Somos de Itapema — fretes via motoboy a partir de R$ 15,00"
- Reduce vertical padding (`py-12 sm:py-20`)

### 2. Navbar — Logo clickable, auto-hide on scroll (`src/pages/Index.tsx`)
- Wrap navbar logo in `<a href="#top">` or `onClick` scroll to top
- Add state to track scroll direction; hide navbar when scrolling down, show when scrolling up (CSS transform + transition)

### 3. Stats Bar — Single line, more subtle (`src/pages/Index.tsx`)
- Change from grid to horizontal flex in one row: `flex items-center justify-between`
- Reduce text sizes: value `text-lg font-semibold`, label `text-[11px]`
- Reduce padding: `py-2`
- Add dividers between items

### 4. Motoboy (SC) — Add category & weight dropdowns per reference image (`src/pages/Index.tsx`)
- Replace free-text weight input with two selects matching the uploaded image:
  - **"O que vamos buscar?"** — Select with options: `Eletrônicos`, `Documentos`, `Alimentos`, `Chaves`, `Pacotes`, `Outros`
  - **"Peso"** — Select with options: `1 kg`, `2 kg`, `3 kg`, `5 kg`, `10 kg`, `15 kg`, `20 kg`, `25 kg`, `30 kg`
  - Helper text: "Exemplo: do peso de uma Melancia pequena"
- Update urgency select labels:
  - `normal` → "Normal - 40-45 min + 5 min deslocamento"
  - `express` → "Express - Até 1 hora"
  - `urgente` → "Urgente - Até 30 min"

### 5. Carro (Nacional) — City search from DB (`src/pages/Index.tsx`)
- For national mode, instead of free text input, use AddressAutocomplete-style search that queries Nominatim for Brazilian cities
- After city is selected, lock the AddressAutocomplete to that city so street suggestions are filtered

### Files to Edit
- `src/components/HeroSection.tsx` — remove logo, add tagline, reduce padding
- `src/pages/Index.tsx` — navbar scroll behavior, logo click, stats layout, motoboy fields, urgency labels

