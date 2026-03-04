

## Plano: Moto sem seleção de cidade — cálculo 100% por KM

### Problema
O simulador moto exige selecionar cidade de origem e destino nos dropdowns. O usuário quer que as cidades cadastradas sirvam **apenas para exibir** quais cidades são atendidas, e o cálculo seja **100% baseado nos KM tiers + filial**.

### Mudanças

#### 1. Frontend — `src/pages/Index.tsx`
- **Remover dropdowns de cidade** no tab Moto (origin/dest Select)
- Usar `AddressAutocomplete` diretamente, sem precisar de `cityName` pré-selecionada
- Extrair o nome da cidade automaticamente do resultado do Nominatim (campo `address.town` ou `address.city`)
- Passar `origin_city_name` e `destination_city_name` extraídos do endereço para a edge function
- Manter a lista de cidades apenas para exibir "Cidades atendidas" (informativo)
- Remover dependência de `originCityId`/`destCityId` para o fluxo moto

#### 2. `AddressAutocomplete.tsx`
- Tornar `cityName` opcional — quando vazio/undefined, buscar sem filtro de cidade (apenas "SC, Brazil")
- Não filtrar resultados por `cityName` quando ele não for fornecido
- Adicionar campo `cityName` no retorno `AddressSelection` (extraído do Nominatim `address.town`/`address.city`)

#### 3. Edge Function — Sem mudanças
A edge function moto SC (linhas 89-201) já funciona corretamente:
- Usa `origin_city_name` (string) para comparar com filial
- Usa `distance_km` + `km_tiers` para calcular valor
- Não depende de `origin_city_id` / `destination_city_id`

### Fluxo Moto Atualizado

```text
1. Usuário digita endereço de coleta (sem selecionar cidade)
2. Nominatim retorna resultado com cidade detectada
3. Usuário digita endereço de destino
4. Mapa calcula distância via OSRM
5. Edge function recebe: distance_km + origin_city_name
6. Calcula: buscarValorPorKm(distância) + deslocamento (se fora da filial)
```

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `AddressAutocomplete.tsx` | cityName opcional, retornar cidade detectada |
| `Index.tsx` | Remover dropdowns cidade no tab moto, extrair cidade do endereço |

