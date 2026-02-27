

## Plan: Rebrand to Frete Garça + New Hero + Updated Simulator

### 1. Copy logo to project
- Copy `user-uploads://LOGo_tipo.png` to `src/assets/logo-frete-garca.png`

### 2. Update `HeroSection.tsx`
- Replace all "FreteExpress" with "Frete Garça"
- Add typewriter effect cycling through cities: Itapema, Porto Belo, Tijucas, Bombinhas, Bal. Camboriú, Itajaí
- Headline: "Fretes rápidos e entregas em [cidade digitando]"
- Two CTAs: "Simular Frete Agora" (scroll) + "Falar com Atendente no WhatsApp" (link to wa.me)
- Trust badges: "Entrega em até 45 minutos" + "Garantia de entrega"
- Update floating card to show Motoboy context
- Import and display logo

### 3. Update `Index.tsx`
- Replace all "FreteExpress" references with "Frete Garça"
- Use logo image in navbar and footer
- Update simulator form to collect: Cidade de coleta, Rua, Número, Complemento (optional)
- Default to Motoboy mode
- Update social proof text and features section to match brand

### 4. Update `AdminLayout.tsx`
- Replace "FreteExpress" branding with "Frete Garça"

### Files to edit
- `src/assets/logo-frete-garca.png` (copy from upload)
- `src/components/HeroSection.tsx` (full rewrite: typewriter, CTAs, logo, trust badges)
- `src/pages/Index.tsx` (rebrand, simulator fields update)
- `src/pages/admin/AdminLayout.tsx` (rebrand)

