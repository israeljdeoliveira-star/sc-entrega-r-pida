## Plano: Correção UX + Resumo + Precificação Inteligente + Alerta Volume

### Fase 1 — UX Simulação + Resumo ✅
- Removido `scrollIntoView` automático no recálculo
- Resultado mantido visível durante recálculo (loading overlay sem limpar `result`)
- Adicionada seção "Resumo dos endereços" no card de resultado (Coleta/Paradas/Entrega com letras A/B/C)

### Fase 2 — Admin Precificação Inteligente Carro ✅
- Criadas tabelas: `vehicle_profiles`, `pricing_cost_inputs`, `pricing_simulations` (RLS admin-only)
- Nova página `/admin/car-pricing` com formulários completos
- Gráficos: pizza composição custo, barras cenários, linha sensibilidade combustível
- Botão "Aplicar preço recomendado" → atualiza `freight_settings.price_per_km_car` + log

### Fase 3 — Backend Cálculo Carro com Feature Flag ✅
- Adicionada coluna `use_new_car_pricing` em `freight_settings` (default false)
- Regra: `max(98, 98 + (km-1) * price_per_km)` quando flag ativa
- Aplicada em SC carro e nacional carro

### Fase 4 — Alerta Inteligente de Volume ✅
- Heurística de volume/peso por item (sofá 1.5m³/40kg, geladeira 0.8m³/60kg, etc.)
- Cruzamento com capacidade do veículo (2.5m³ / 500kg)
- Estimativa de número de viagens e impacto mostrado ao usuário
