

## Plano: Otimização, Paradas Inteligentes, Mapa e Fix CityAutocomplete

### 1. Fix CityAutocomplete — Porto Belo e cidades pequenas não aparecem

**Problema**: O Nominatim usa `featuretype=city` que exclui cidades menores classificadas como "town" ou "village". Porto Belo é classificado como "town".

**Solução** em `CityAutocomplete.tsx`:
- Remover o parâmetro `featuretype: "city"` da busca Nominatim
- Reduzir o debounce de 600ms para 350ms para resposta mais rápida
- Primeiro verificar se a cidade existe no banco local (`cities` table) antes de ir ao Nominatim — se encontrar match local, retornar imediatamente
- Manter o filtro por `addr.city || addr.town || addr.village`

### 2. Paradas extras com cobrança por base_value da cidade

**Lógica atual**: A edge function cobra `originCity.min_value` por parada. O usuário quer cobrar `base_value` da cidade onde a parada acontece.

**Solução** em `Index.tsx` e `calculate-freight/index.ts`:
- Cada parada extra precisa informar em qual cidade está (origem ou destino)
- No frontend, ao selecionar endereço da parada, determinar se está mais perto da cidade de origem ou destino via Haversine
- Enviar array `extra_stops` com `{ city_id, lat, lng }` para a edge function
- Na edge function, para cada parada: buscar o `base_value` da cidade correspondente e somar ao total
- Se a cidade da parada não estiver cadastrada, usar um valor base padrão

### 3. Opção "Otimizar Rota" para paradas

**Solução** em `Index.tsx`:
- Adicionar toggle `optimizeRoute` (default: false) que aparece quando `motoExtraStops > 0`
- Quando ativado, reordenar as paradas usando algoritmo nearest-neighbor (greedy TSP) baseado nas coordenadas
- Exibir a ordem otimizada para o usuário antes de calcular
- Cada parada gera um pino adicional no mapa

### 4. Pinos extras no mapa para paradas

**Solução** em `FreightMap.tsx`:
- Adicionar prop `extraStopCoords: [number, number][]`
- Renderizar marcadores azuis para cada parada intermediária
- Quando houver paradas, calcular rota OSRM passando por todos os pontos na ordem (origin → stops → destination)
- Ajustar `fitBounds` para incluir todos os pinos

### 5. Mapa com cor menos escura

**Solução** em `FreightMap.tsx`:
- Trocar de `dark_all` para `voyager` do CartoDB: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`
- Tema moderno, neutro, legível — funciona bem em light e dark mode
- Manter a cor da rota amarela para contraste

### 6. Otimização de performance

**Solução** em `Index.tsx`:
- Reduzir debounce de cálculo de 500ms para 300ms
- Lazy load do componente `FreightMap` com `React.lazy` + `Suspense`
- Memoizar componentes pesados com `useMemo`
- No `CityAutocomplete`, reduzir debounce para 350ms

### 7. Fix loop infinito de cálculo

**Problema**: O `handleSimulate` no `useCallback` tem muitas dependências (toggles). Mudar qualquer toggle recria a função, que dispara o `useEffect` auto-calculate novamente.

**Solução**:
- Separar o `useEffect` auto-calculate para depender apenas de `routeDistance` (não de `handleSimulate`)
- Usar um ref para armazenar a versão mais recente de `handleSimulate`
- O effect chama `handleSimulateRef.current(routeDistance)` — assim não recria quando toggles mudam
- Os toggles só recalculam quando o usuário clica explicitamente ou quando uma nova rota é calculada

---

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/CityAutocomplete.tsx` | Fix Porto Belo, remover featuretype, reduzir debounce, priorizar banco local |
| `src/components/FreightMap.tsx` | Tema voyager, pinos de paradas extras, rota multi-waypoint |
| `src/pages/Index.tsx` | Paradas com base_value, otimizar rota, fix loop, lazy map, performance |
| `supabase/functions/calculate-freight/index.ts` | Cobrar base_value por parada baseado na cidade |

