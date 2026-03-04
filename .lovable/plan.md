

## Plano: Fix Cálculo Moto (Mesma Cidade = Base Value) + Descrições Admin

### Problema Principal

A fórmula atual na edge function sempre soma `distanceKm * pricePerKm`:

```
valorOperacional = baseForCalc + (distanceKm * pricePerKm) * combinedMult + extras
```

Para Itapema → Itapema (4.8km, base R$15): 15 + (4.8 × 2.5) = R$27 → com margem 15% = **R$32**. Mas deveria ser **R$15** porque entrega na mesma cidade cobra apenas o valor base, sem quilometragem.

### Regra de Negócio Correta

- **Mesma cidade (A → A)**: valor = `base_value` da cidade (sem cobrança por KM)
- **Cidades diferentes (A → B)**: valor = `max(base_value_A, base_value_B)` + KM × pricePerKm (cobrança por deslocamento inter-cidades)
- **Parada extra na cidade onde já está**: cobra `base_value` daquela cidade
- **`min_value`**: piso mínimo — o valor nunca fica abaixo desse valor

### Mudanças

#### 1. Edge Function — `calculate-freight/index.ts`

Alterar a lógica SC/moto para detectar se origem e destino são a mesma cidade:

```
if (origin_city_id === destination_city_id) {
  // Mesma cidade: apenas base_value, sem KM
  valorOperacional = baseForCalc + additionalsTotal + motoExtras;
} else {
  // Inter-cidades: base + KM
  valorOperacional = baseForCalc + (distanceKm * pricePerKm) * combinedMult + additionalsTotal + motoExtras;
}
```

A margem e o min_value continuam aplicados normalmente depois.

#### 2. Admin — `CitiesPage.tsx` — Descrições claras nos campos

Melhorar os textos explicativos de cada campo no formulário de cidade:

| Campo | Descrição atual | Descrição nova |
|-------|----------------|----------------|
| Valor Base | "Valor base adicionado a todo frete" | "Quanto custa uma entrega dentro desta cidade (ex: R$15). Para fretes entre cidades, o maior valor base é usado como ponto de partida." |
| Valor Mínimo | (sem descrição) | "Piso mínimo do frete. Nenhum frete que envolva esta cidade terá valor abaixo deste." |
| Densidade | (sem descrição) | "Afeta o multiplicador do frete. Baixa (−10%): cidades com pouco trânsito. Média (padrão). Alta (+15%): cidades com trânsito intenso, ruas estreitas." |
| Observação | (sem descrição) | "Notas internas visíveis apenas para administradores." |

Também melhorar descrições na tab Carro (served_states):
- Valor Base: "Valor base para fretes com origem neste estado."
- Valor Mínimo: "Piso mínimo para fretes neste estado."

#### 3. Outros arquivos admin que precisam de descrições melhores

- **`SmartMarginPage.tsx`**: já tem descrições boas, manter
- **`KmSettingsPage.tsx`**: verificar se as descrições dos campos de preço por KM estão claras (adicionar nota que KM só é cobrado em fretes inter-cidades para moto)

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `calculate-freight/index.ts` | Não cobrar KM quando mesma cidade |
| `CitiesPage.tsx` | Descrições explicativas nos campos |

