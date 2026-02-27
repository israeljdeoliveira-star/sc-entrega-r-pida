

## Plan: Complete Pricing Engine with Dynamic Rules, Commission & Multipliers

### Current State
- `freight_settings` table has basic fields: `price_per_km_moto`, `price_per_km_car`, `national_price_per_km`, `national_min_value`, `fixed_fee`
- Edge function `calculate-freight` handles SC and national modes with simple formulas
- Admin `FreightSettingsPage` manages basic values
- Missing: multipliers, commission, tolls, return fee, dynamic rules, pricing logs, national base value

### Database Changes (Migration)

**1. Add columns to `freight_settings`:**
- `multiplicador_moto` (numeric, default 1.0)
- `multiplicador_carro` (numeric, default 1.0)
- `comissao_moto` (numeric, default 15.0) -- percentage
- `comissao_carro` (numeric, default 15.0)
- `valor_base_nacional` (numeric, default 0)
- `taxa_retorno_carro` (numeric, default 0)
- `pedagios_padrao` (numeric, default 0)
- `margem_minima_moto` (numeric, default 0)
- `margem_minima_carro` (numeric, default 0)

**2. Create `dynamic_rules` table:**
- `id` uuid PK
- `name` text NOT NULL
- `condition_type` text NOT NULL (e.g., 'peak_hour', 'weekend', 'weather', 'demand')
- `multiplier` numeric NOT NULL default 1.0
- `is_active` boolean default false
- `created_at` timestamptz default now()
- RLS: admin ALL, public SELECT active rules

**3. Create `pricing_change_log` table:**
- `id` uuid PK
- `changed_by` uuid (user_id)
- `table_name` text
- `field_name` text
- `old_value` text
- `new_value` text
- `created_at` timestamptz default now()
- RLS: admin SELECT only

### Edge Function Update (`calculate-freight`)

Update formula for **MOTO (SC)**:
```
base = max(distance * price_per_km_moto, city_min_value)
total = (base + origin_fee + dest_fee + fixed_fee) * multiplicador_moto * dynamic_multiplier
final = max(total, margem_minima_moto)
```

Update formula for **CARRO (National)**:
```
base = valor_base_nacional + (distance * national_price_per_km)
total = (base + pedagios + taxa_retorno + fixed_fee) * multiplicador_carro * dynamic_multiplier
final = max(total, margem_minima_carro, national_min_value)
```

Both modes return commission breakdown:
```json
{
  "final_value": ...,
  "commission_percentage": ...,
  "driver_value": ...,
  "platform_value": ...,
  "multiplier_applied": ...
}
```

Dynamic multiplier = product of all active `dynamic_rules` multipliers.

### Admin Pages

**4. Update `FreightSettingsPage`:**
- Add sections for multipliers, commission percentages, national base value, tolls, return fee, minimum margins
- Add pricing change logging on save

**5. Create `DynamicRulesPage` (`/admin/rules`):**
- CRUD for dynamic rules (name, condition type, multiplier, active toggle)
- Condition types: Horário de Pico, Final de Semana, Clima, Demanda

**6. Create `PricingLogPage` (`/admin/pricing-log`):**
- Read-only table showing all pricing changes with timestamp, user, field, old/new values

**7. Update `AdminLayout`:**
- Add nav items for "Regras Dinâmicas" and "Log de Alterações"

**8. Update `App.tsx`:**
- Add routes for `/admin/rules` and `/admin/pricing-log`

### Frontend (Simulator)

**9. Update `Index.tsx` result display:**
- Show commission breakdown (valor motorista / valor plataforma)
- Show multiplier applied if > 1.0

### Files to Create/Edit
- **Migration SQL** (new columns + new tables + RLS)
- `supabase/functions/calculate-freight/index.ts` (new formulas)
- `src/pages/admin/FreightSettingsPage.tsx` (expanded config)
- `src/pages/admin/DynamicRulesPage.tsx` (new)
- `src/pages/admin/PricingLogPage.tsx` (new)
- `src/pages/admin/AdminLayout.tsx` (new nav items)
- `src/App.tsx` (new routes)
- `src/pages/Index.tsx` (commission display)

