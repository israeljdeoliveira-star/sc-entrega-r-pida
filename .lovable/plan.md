

## Plano: Reestruturação Completa do Motor de Precificação

Este é um projeto grande dividido em 5 fases. Vou detalhar cada uma.

---

### FASE 1 — Migrações de Banco de Dados

**Tabela `cities`** — adicionar colunas:
- `base_value` numeric DEFAULT 0 (valor base da cidade)
- `density` text DEFAULT 'media' (baixa/media/alta)
- `observation` text nullable (observação interna)

**Tabela `freight_settings`** — adicionar colunas para:
- Raio máximo: `max_radius_km` numeric DEFAULT 100, `enable_radius_limit` boolean DEFAULT false
- Multiplicadores MOTO: `mult_moto_peak`, `mult_moto_night`, `mult_moto_rain`, `mult_moto_severe`, `mult_moto_risk_medium`, `mult_moto_risk_high` (todos numeric DEFAULT 1.0)
- Multiplicadores CARRO: mesmos 6 campos com prefixo `mult_car_`
- Margem Inteligente: `margin_base` numeric DEFAULT 15, `margin_peak` DEFAULT 0, `margin_rain` DEFAULT 0, `margin_risk_high` DEFAULT 0, `margin_long_distance` DEFAULT 0, `long_distance_km` DEFAULT 50

**Tabela `simulations_log`** — adicionar:
- `operational_value` numeric nullable
- `margin_applied` numeric nullable
- `config_snapshot` jsonb nullable

---

### FASE 2 — Admin: Reestruturar Páginas

**Novo menu lateral** no AdminLayout com seção "Configurações de Frete" agrupando:

1. **CitiesPage** — refatorar com novos campos (base_value, density, observation). Adicionar validação visual de cidade ativa/inativa.

2. **KmSettingsPage** (nova) — Valor por KM Moto, Valor por KM Carro, Raio máximo, Toggle limite de raio. Cada campo com texto explicativo visível abaixo.

3. **MultipliersPage** (nova) — Tabs MOTO / CARRO. Cada aba com 6 multiplicadores (pico, noturno, chuva, clima severo, risco médio, risco alto). Textos explicativos em cada campo.

4. **SmartMarginPage** (nova) — Margem base (%), adicionais por condição, distância considerada longa. Textos explicativos didáticos.

5. **SimulationsLogPage** (nova) — Log de simulações com cidade, veículo, distância, valor operacional, margem, valor final, data, config utilizada. Somente visualização admin.

---

### FASE 3 — Edge Function: Novo Motor de Cálculo

Reescrever `calculate-freight/index.ts`:

```text
valorOperacional = 
  cidadeBaseValue + (distanciaKm × valorPorKm) × multiplicadoresCombinados

multiplicadoresCombinados = 
  densityMultiplier × peakHour × night × rain × severe × riskArea

margemTotal = 
  margemBase + (condições ativas: peak + rain + risk + longDistance)

valorFinal = valorOperacional × (1 + margemTotal/100)
```

- Validar cidade cadastrada e ativa
- Validar raio máximo se habilitado
- Separar totalmente lógica MOTO vs CARRO
- Gravar snapshot da config no simulations_log
- Retornar ao cliente APENAS: `final_value`, `distance_km`, `estimated_time_min`

---

### FASE 4 — Cliente: Simplificar Resultado

**Index.tsx** — No bloco de resultado, mostrar apenas:
- "Valor da entrega: R$ XX,XX"
- "Valor calculado com base na distância e condições da entrega."
- Distância e tempo estimado
- Botão WhatsApp

Remover: valor base, taxas de bairro, taxa fixa, pedágios, multiplicador, comissão — tudo invisível ao cliente.

Adicionar validação: se cidade não atendida, mostrar "No momento não atendemos essa cidade." e bloquear simulação.

---

### FASE 5 — Validações e Logging

- Validar que bairro pertence à cidade selecionada (já existe parcialmente)
- Validar cidade ativa antes de permitir simulação
- Log completo no `simulations_log` com valor operacional, margem e config snapshot
- Registrar alterações de todas as novas configurações no `pricing_change_log`

---

### Resumo de Arquivos

| Ação | Arquivo |
|------|---------|
| Migração SQL | 3 ALTER TABLE (cities, freight_settings, simulations_log) |
| Refatorar | `src/pages/admin/CitiesPage.tsx` |
| Criar | `src/pages/admin/KmSettingsPage.tsx` |
| Criar | `src/pages/admin/MultipliersPage.tsx` |
| Criar | `src/pages/admin/SmartMarginPage.tsx` |
| Criar | `src/pages/admin/SimulationsLogPage.tsx` |
| Refatorar | `src/pages/admin/AdminLayout.tsx` (novo menu) |
| Reescrever | `supabase/functions/calculate-freight/index.ts` |
| Refatorar | `src/pages/Index.tsx` (resultado simplificado + validações) |
| Refatorar | `src/App.tsx` (novas rotas) |
| Remover/deprecar | `src/pages/admin/FreightSettingsPage.tsx` (substituída pelas novas) |

