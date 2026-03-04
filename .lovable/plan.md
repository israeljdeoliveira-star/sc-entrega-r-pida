

## Plano: Tornar busca de endereço tolerante a erros e amigável para idosos

### Problemas identificados

1. **`extractNumberFromInput` exige vírgula + espaço** — `rua 230,570` não extrai número porque o regex espera `,\s*(\d+)` mas o `570` vem colado
2. **Busca exige mínimo 3 chars E `cityName`** — linha 95: `if (q.length < 3 || !cityName)` bloqueia a busca quando `cityName` está vazio (que é o caso novo do fluxo moto sem dropdown)
3. **Sem normalização do input** — maiúsculas, acentos, espaços extras atrapalham
4. **Debounce de 800ms** — muito lento para feedback rápido
5. **Limite de 6 resultados** — ok, manter

### Mudanças em `AddressAutocomplete.tsx`

**1. Corrigir guarda de busca** — remover `!cityName` da condição de bloqueio (já que cityName agora é opcional)

**2. Normalizar input antes de enviar ao Nominatim**
- Remover espaços extras, normalizar vírgulas coladas (`rua 230,570` → `rua 230, 570`)
- Função `normalizeQuery(q)`: limpar e formatar

**3. Melhorar `extractNumberFromInput`**
- Aceitar número colado na vírgula: `/,\s*(\d+)/` → aceitar também número no final ou separado por espaço
- Regex mais flexível: procurar qualquer sequência numérica que pareça número de casa (ex: último grupo de dígitos)

**4. Busca com fallback**
- Se busca com query completa retorna 0 resultados, tentar busca só com a parte textual (sem números)
- Isso ajuda quando o usuário digita "rua 230, 570" — busca "rua 230" se a primeira falhar

**5. Reduzir debounce** para 500ms

**6. Não filtrar por cityName quando vazio** — já parcialmente feito, mas a guarda na linha 95 bloqueia tudo

### Arquivo alterado

| Arquivo | Alteração |
|---------|-----------|
| `AddressAutocomplete.tsx` | Normalização, regex flexível, fallback de busca, remover bloqueio cityName |

