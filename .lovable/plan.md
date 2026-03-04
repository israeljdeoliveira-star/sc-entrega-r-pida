

## Plano: Melhorias no Simulador — Número Obrigatório, Referência, Paradas com Endereço, Mapa Escuro

### 1. Número obrigatório no endereço (`AddressAutocomplete.tsx`)

- Adicionar prop `requireNumber?: boolean` (default true)
- Após seleção, se `houseNumber` estiver vazio, exibir alerta vermelho: "⚠️ Informe o número do endereço (ex: Rua Brasil, 123)"
- Bloquear o `onSelect` de disparar cálculo até o número estar presente
- Callback `onSelect` só dispara quando número válido

### 2. Campo Referência abaixo de cada endereço (`Index.tsx`)

- Adicionar campo `Input` com placeholder "Ponto de referência (opcional)" abaixo de cada bloco de endereço (coleta e destino, tanto moto quanto carro)
- States: `originRef`, `destRef`, `carOriginRef`, `carDestRef`
- Incluir referência na mensagem do WhatsApp

### 3. Links do Google Maps na mensagem WhatsApp (`Index.tsx`)

- Para cada endereço com coordenadas, gerar link: `https://www.google.com/maps?q={lat},{lng}`
- Incluir na mensagem do WhatsApp junto ao endereço de coleta e destino

### 4. Peso estimado com exemplos claros (`Index.tsx`)

- Atualizar `WEIGHT_OPTIONS` para exibir exemplos mais descritivos:
  - `"🍉 Melancia Pequena (~5kg)"` em vez de `"🍉 Melancia pequena"`
  - Cada exemplo com nome completo + peso entre parênteses

### 5. Paradas extras com blocos de endereço (`Index.tsx`)

- Quando `motoExtraStops > 0`, renderizar N blocos de endereço (cidade + rua + referência) para cada parada
- Cada bloco usa `AddressAutocomplete` restrito à cidade de origem
- States: `extraStopAddresses: AddressSelection[]`, `extraStopRefs: string[]`
- Incluir endereços das paradas na mensagem do WhatsApp

### 6. Valor parada extra = min_value da cidade (`calculate-freight/index.ts`)

- Na edge function, ao calcular paradas extras do moto, usar `city.min_value` em vez de `moto_extra_stop_fee` fixo
- Buscar o `min_value` da cidade de origem já carregada

### 7. Mapa tema escuro (`FreightMap.tsx`)

- Trocar tile layer de `light_all` para `dark_all` do CartoDB:
  `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- Alterar cor da rota para algo mais visível no escuro (ex: `hsl(45, 100%, 60%)` amarelo)

### 8. Mapa mais próximo da rota (`FreightMap.tsx`)

- Reduzir padding do `fitBounds` de `[40, 40]` para `[30, 30]`
- Aumentar altura do mapa de `250px` para `300px`

---

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/AddressAutocomplete.tsx` | Validação número obrigatório |
| `src/components/FreightMap.tsx` | Tema escuro, zoom mais próximo, rota mais visível |
| `src/pages/Index.tsx` | Campo referência, paradas com endereço, links Google Maps, peso atualizado |
| `supabase/functions/calculate-freight/index.ts` | Parada extra usa min_value da cidade |

