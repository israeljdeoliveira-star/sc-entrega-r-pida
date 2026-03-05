

## Plano: Corrigir validação travada no modo Carro

### Causa raiz
O efeito de recálculo automático (linha 418-425) só depende de `routeDistance`. Quando a rota já está calculada e o erro de validação aparece, digitar nos campos `carItemDescription`/`carItemDetails` não dispara novo cálculo — o erro fica preso na tela.

### Mudanças em `src/pages/Index.tsx`

**1. Limpeza imediata de erro ao digitar (novo efeito):**
```typescript
useEffect(() => {
  if (mode !== "national") return;
  if (error && carItemDescription.trim() && carItemDetails.trim()) {
    setError(null);
  }
}, [carItemDescription, carItemDetails, mode, error]);
```

**2. Recálculo automático ao mudar campos do carro (novo efeito):**
```typescript
useEffect(() => {
  if (mode !== "national" || !routeDistance || routeDistance <= 0) return;
  if (!carItemDescription.trim() || !carItemDetails.trim()) return;
  if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  debounceTimerRef.current = setTimeout(() => {
    handleSimulateRef.current?.(routeDistance);
  }, 400);
  return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
}, [carItemDescription, carItemDetails, carNeedHelper, carNeedStairs, carIsApartment, carHasElevator, carNeedBubbleWrap, carHasFragile, carMultiTrip]);
```

Ambos os efeitos serão inseridos logo após o efeito existente de volume alert (linha 442). Nenhuma outra alteração necessária.

### Arquivo alterado
| Arquivo | Escopo |
|---------|--------|
| `src/pages/Index.tsx` | +2 efeitos (~15 linhas) após linha 442 |

