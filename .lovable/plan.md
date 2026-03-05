

## Plano: Roteiro unificado com letras, persistência de resultado e mapa atualizado

### Causa raiz
1. `handleSimulate` faz `setResult(null)` na linha 348 antes de chamar a API — o card some durante recálculo.
2. Paradas são lista separada; origem/destino não participam da reordenação visual.
3. Mapa usa ícones numéricos (1, 2, 3) em vez de letras.

---

### Mudanças

#### 1. `src/pages/Index.tsx` — Persistência de resultado (~3 linhas)

- **Remover `setResult(null)` da linha 348** dentro de `handleSimulate`.
- No bloco `catch`, **não sobrescrever** `result` — manter último válido, apenas mostrar erro via `setError`.
- O loading overlay já renderiza junto ao resultado (linhas 876-891), basta não apagar `result`.

#### 2. `src/pages/Index.tsx` — Modelo unificado de roteiro (~80 linhas)

Criar tipo e lógica para lista unificada:

```typescript
type RoutePointType = "origin" | "stop" | "destination";
interface RoutePoint {
  id: string;
  type: RoutePointType;
  label: string; // "A", "B", "C"...
  cityName: string;
  address: AddressSelection | null;
  reference: string;
}
```

- Computar `routePoints` via `useMemo`: juntar origem (se preenchida) + paradas ordenadas + destino (se preenchido).
- Atribuir letras sequenciais: `String.fromCharCode(65 + index)` → A, B, C, D...
- Renderizar na UI do modo moto uma seção "Roteiro" mostrando todos os pontos com letra e tipo.
- Origem e destino mostram badge "Coleta" / "Entrega" e **não podem ser removidos** (botão remove desabilitado).
- Paradas intermediárias podem ser removidas e reordenadas (botões up/down + drag).
- Etiqueta "Ordem manual" ou "Ordem otimizada" conforme toggle.

#### 3. `src/components/ExtraStopCard.tsx` → Refatorar para `RoutePointCard.tsx` (~30 linhas alteradas)

- Aceitar prop `label: string` (letra) e `pointType: RoutePointType`.
- Exibir letra em vez de "Parada 1".
- Mostrar badge de tipo: "Coleta", "Parada", "Entrega".
- Desabilitar botão remover se `pointType !== "stop"`.
- Desabilitar campos de cidade/endereço para origin/destination (já preenchidos via formulário principal).

#### 4. `src/components/FreightMap.tsx` — Letras nos pinos (~15 linhas)

- Substituir `createNumberedIcon(number)` por `createLetteredIcon(letter: string)`.
- O ícone mostra a letra (A, B, C...) em vez do número.
- Aceitar nova prop `pointLabels?: string[]` para popups: `"A — Coleta"`, `"B — Parada"`, etc.
- Aplicar letras também a origem (A) e destino (última letra), substituindo os ícones verde/vermelho por ícones com letra e cor diferenciada (verde para origem, vermelho para destino, azul para paradas).

#### 5. `src/pages/Index.tsx` — Payload e waypoints (~10 linhas)

- Gerar `extraStopCoords` e `extra_stops` do backend a partir de `routePoints` filtrados por `type === "stop"`.
- Waypoints do mapa seguem ordem exata de `routePoints`.
- Nenhuma alteração no backend/edge function.

---

### Arquivos alterados

| Arquivo | Escopo |
|---------|--------|
| `src/pages/Index.tsx` | Remover `setResult(null)`, criar `routePoints`, renderizar roteiro unificado, ajustar payloads |
| `src/components/ExtraStopCard.tsx` | Adicionar props `label` e `pointType`, exibir letra e badge de tipo |
| `src/components/FreightMap.tsx` | Trocar ícones numéricos por letras, aceitar `pointLabels` |

### O que NÃO muda
- Fluxo de carro (sem paradas, sem roteiro unificado).
- Backend / edge function `calculate-freight`.
- Cálculo de taxa de paradas (conta apenas `type === "stop"`).

