

## Plan: Simplificar e limpar o simulador de frete

O simulador atual tem muitos blocos aninhados (cards dentro de cards), labels pequenas (`text-xs`), muitos campos visíveis ao mesmo tempo, e bordas/sombras excessivas que criam ruído visual. A proposta e tornar tudo mais respirado, limpo e facil de seguir.

### Mudancas propostas no `src/pages/Index.tsx` (secao simulator):

1. **Reduzir ruido visual dos blocos internos** - Remover as bordas (`border`) e backgrounds (`bg-card`) dos sub-blocos de Coleta/Destino/Categoria. Usar apenas spacing e separadores sutis entre grupos.

2. **Aumentar tamanho das labels** - Trocar `text-xs` por `text-sm` nas labels para melhor legibilidade.

3. **Simplificar headers dos grupos** - Manter os icones mas com fonte mais limpa, sem blocos encaixotados.

4. **Remover campo Complemento do fluxo inicial** - Complemento e raramente usado; mover para campo opcional colapsado ou remover da vista principal para reduzir campos visiveis.

5. **Melhorar espacamento** - Aumentar gap entre secoes, dar mais "respiro" ao formulario.

6. **Simplificar secao Urgencia/Agendamento** - Mostrar as opcoes de urgencia como botoes/chips em vez de select dropdown com textos longos, tornando mais visual e rapido.

7. **Resultado mais destacado** - Manter como esta (ja funciona bem).

### Arquivos a editar
- `src/pages/Index.tsx` - Refatorar toda a secao do simulador (linhas ~296-543)

