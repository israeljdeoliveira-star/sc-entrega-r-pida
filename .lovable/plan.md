

## Plano: Corrigir cálculo travado + melhorar feedback visual + animar rota no mapa

### Problemas identificados

1. **Cálculo fica carregando infinitamente** — O `handleSimulate` é chamado pelo `useEffect` que observa `routeDistance`, mas o `loading` nunca é limpo se a edge function retornar erro com `data.error`. Na linha 325: `if (data?.error) { setError(data.error); return; }` — faz `return` sem passar pelo `finally` block? Na verdade passa pelo finally sim. Mas o problema real é que **`originAddress`** pode ser `null` quando o auto-calculate dispara, pois `routeDistance` é setado pelo mapa antes de o `handleSimulate` ter os dados completos. Mais: se `originAddress?.lat` é undefined, o edge function não recebe coords do origin e retorna `distanciaDeslocamento = 0` mas funciona. O problema mais provável: **o cálculo no modo moto não está sendo disparado** porque `originCityName` pode estar vazio (cidade não detectada pelo Nominatim). Preciso verificar se a cidade é necessária. Na edge function, `cidadeColeta` vazio não causa erro, mas `isColetaNaFilial` será `false`, o que faria cobrar deslocamento com `originLat=0`, resultando em valor estranho mas não erro. Vou olhar mais de perto.

   **Causa raiz provável**: O `isCalculatingRef.current` pode ficar `true` se uma chamada anterior falhou silenciosamente (ex: network error não capturado), bloqueando chamadas futuras. Além disso, o debounce de 300ms + a lógica de `isCalculatingRef` pode travar.

2. **Feedback de "Calculando" é fraco** — apenas um spinner pequeno com texto
3. **Rota no mapa é estática** — sem animação do trajeto

### Mudanças

#### 1. `FreightMap.tsx` — Animação da rota
- Após desenhar a rota completa, animar um marcador (ícone de moto/carro) percorrendo os pontos da rota
- Usar `setInterval` para mover o marcador ponto a ponto ao longo das coordenadas da rota
- A rota amarela aparece progressivamente (polyline animada) ou um marcador se move sobre ela
- Implementação: desenhar a rota completa em cor mais clara, depois animar uma polyline mais escura/brilhante crescendo do início ao fim

#### 2. `Index.tsx` — Corrigir cálculo travado
- Adicionar timeout safety no `isCalculatingRef` — se ficar `true` por mais de 15s, resetar
- Melhorar o indicador de "Calculando" com texto mais visível, pulsante
- Garantir que erros de rede no edge function não travem o ref
- Adicionar `originAddress` nas dependências do cálculo para garantir que coords estão disponíveis

#### 3. `Index.tsx` — Feedback visual melhorado
- Substituir o spinner simples por um card com animação pulsante e mensagem mais clara
- Mostrar "Calculando sua rota..." com ícone animado maior

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `FreightMap.tsx` | Animação da rota (marcador percorrendo trajeto) |
| `Index.tsx` | Fix cálculo travado (safety timeout no ref), feedback "Calculando" melhorado |

