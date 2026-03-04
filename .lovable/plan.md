

## Plano: Corrigir Regras Moto — KM inter-cidades + Paradas = min_value

### Regras de Negocio Corretas (confirmadas)

| Rota | Formula |
|------|---------|
| Mesma cidade (A→A) | `base_value` da cidade. Sem KM, sem margem. |
| Inter-cidades (A→B) | `base_value` do **DESTINO** + KM × price_per_km. Sem margem. |
| Parada extra em cidade X | + `min_value` da cidade X |

Exemplos com filial Itapema (base R$15), Porto Belo (base R$22, min R$10), Tijucas (base R$18):
- Itapema → Itapema: **R$15**
- Porto Belo → Itapema: R$15 + (KM × preço/km) = ex: R$15 + 12 = **R$27**
- Porto Belo → Tijucas: R$18 + (KM × preço/km)
- Com parada em Porto Belo: + R$10 (min_value de Porto Belo)

### Mudanças no `calculate-freight/index.ts`

3 correções pontuais:

**1. `baseForCalc` para moto = destino (não o maior)**
```
// Linha 162: trocar cityBaseValue por destCity.base_value para moto
const baseForCalc = isMoto ? num(destCity.base_value) : Math.max(cityBaseValue, carMinValue);
```

**2. Inter-cidades moto: cobrar KM mas SEM margem**
```
// Linha 170: moto nunca aplica margem (nem mesma cidade, nem inter)
const margemTotal = isMoto ? 0 : (isSameCity ? 0 : calcMargin(...));
```

**3. Paradas extras: usar `min_value` em vez de `base_value`**
```
// Linhas 143-144, 148, 150, 157: trocar base_value por min_value
const { data: stopCity } = await supabase.from("cities").select("min_value").eq("id", stop.city_id).single();
motoExtras += num(stopCity?.min_value, num(originCity.min_value));
```

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `calculate-freight/index.ts` | baseForCalc=destino, margem=0 para moto, paradas=min_value |

