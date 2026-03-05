

## Plano: Scroll automático até o resultado após calcular

### Problema
Quando a simulação é concluída com sucesso, o card de resultado aparece abaixo do mapa e do formulário, fora da área visível. O usuário não percebe que o cálculo foi feito.

### Solução
Após `setResult(...)`, fazer `scrollIntoView` automático até o card de resultado.

### Mudanças em `Index.tsx`

1. **Criar um `ref`** para o container de resultado: `const resultRef = useRef<HTMLDivElement>(null)`
2. **Adicionar `ref={resultRef}`** no `div` do resultado (linha ~804)
3. **Após `setResult`** (linha ~329), adicionar um `setTimeout` com `resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })` para scroll suave até o resultado

### Arquivo alterado

| Arquivo | Alteração |
|---------|-----------|
| `Index.tsx` | Adicionar ref + scrollIntoView automático ao resultado |

