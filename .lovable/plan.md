

## Plan: Map Integration, Autocomplete, WhatsApp & Social Proof

### Overview
Rebuild the simulator with Leaflet map, Nominatim address autocomplete, weight field, WhatsApp integration, and add social proof section with reviews.

### 1. Install Dependencies
- `leaflet` + `@types/leaflet` for map
- `react-leaflet` for React integration

### 2. Create `src/components/AddressAutocomplete.tsx`
- Input with debounced Nominatim API calls (`https://nominatim.openstreetmap.org/search`)
- Filter by city name using `city` param in Nominatim query
- Display dropdown: "Rua - Bairro" format
- On select: set street name, neighborhood, and coordinates (lat/lng)
- Respect Nominatim usage policy (1 req/sec, User-Agent header)

### 3. Create `src/components/FreightMap.tsx`
- Leaflet map component using OpenStreetMap tiles
- Show origin marker (green) and destination marker (red)
- Draw route polyline using OSRM free routing API (`https://router.project-osrm.org/route/v1/driving/`)
- Auto-fit bounds to show full route
- Minimal/clean style, small height (~250px)
- Update when coordinates change

### 4. Rewrite Simulator in `src/pages/Index.tsx`

**SC (Moto) flow:**
- City dropdown (origin) → AddressAutocomplete filtered to that city → Number field
- City dropdown (destination) → AddressAutocomplete filtered to that city → Number field
- Weight field with label: "Peso estimado (ex: 5kg - cesta de frutas, 15kg - caixa de frutas)"
- Complement fields (optional)
- Map shows route after both addresses have coordinates
- Distance calculated client-side from OSRM route response
- Value calculated by calling `calculate-freight` edge function with distance
- Show: distance, estimated time (from OSRM), final value

**Nacional (Carro) flow:**
- Free text origin city → AddressAutocomplete → Number
- Free text destination city → AddressAutocomplete → Number
- Same map + route logic

**Result section changes:**
- Remove "Confirmar Pedido" flow with name/phone
- Replace with "Solicitar pelo WhatsApp" button
- Keep value breakdown display
- Add estimated time from OSRM response

### 5. WhatsApp Button
- Generate message template:
```
Olá, gostaria de solicitar um frete:

Modalidade: MOTO/CARRO
Origem: Rua X, Nº Y - Bairro - Cidade
Destino: Rua X, Nº Y - Bairro - Cidade
Distância: XX km
Tempo estimado: XX minutos
Valor calculado: R$ XX,XX

Rota: https://www.google.com/maps/dir/?api=1&origin=LAT1,LNG1&destination=LAT2,LNG2
```
- Open `https://wa.me/5547999999999?text=ENCODED_MESSAGE`

### 6. Update Edge Function (`calculate-freight`)
- Accept optional `distance_km` param directly (client already calculated from OSRM)
- When provided, skip ORS geocoding/routing, use provided distance
- Keep existing formula logic unchanged

### 7. Create `src/components/SocialProof.tsx`
- Reviews section with hardcoded testimonials (since Google My Business API requires payment)
- 3-4 review cards with: name, city, star rating (5 stars), review text
- Example reviews from SC region cities
- Star rating display with filled/empty stars
- Google rating badge: "4.9 ★ no Google" style

### 8. Update `Index.tsx` page structure
- Add SocialProof section between Features and Simulator
- Add weight state for moto mode
- Store origin/destination coordinates in state
- Pass coordinates to FreightMap component

### Files to Create
- `src/components/AddressAutocomplete.tsx`
- `src/components/FreightMap.tsx`
- `src/components/SocialProof.tsx`

### Files to Edit
- `src/pages/Index.tsx` (major rewrite of simulator section)
- `supabase/functions/calculate-freight/index.ts` (accept distance_km param)
- `package.json` (add leaflet deps)

### Technical Notes
- Nominatim: free, 1 req/sec limit, no API key needed
- OSRM: free routing, no API key needed, returns distance + duration
- Leaflet + OpenStreetMap: fully free, no API key
- All three APIs are free and don't require keys

