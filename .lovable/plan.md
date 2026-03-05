

## Plano: Ajustar mensagem WhatsApp por modo

### Mudanças em `src/pages/Index.tsx` — função `buildWhatsAppUrl` (linhas 461-506)

**1. Header condicional (linhas 461-469):**
- **Motoboy** (`mode === "sc"`):
  ```
  Olá! 👋

  Acabei de fazer uma simulação e gostaria de solicitar uma entrega via motoboy.
  ```
- **Carro/Nacional** (`mode !== "sc"`):
  ```
  Olá! 👋

  Acabei de fazer uma simulação e gostaria de solicitar um frete.
  ```
Ambos seguidos dos mesmos dados (coleta, entrega, paradas, distância, valor) com emojis.

**2. Trecho de itens frágeis (linhas 496-497):**
- Incluir apenas quando `mode !== "sc"`. Motoboy não terá esse aviso.

**3. Aviso duplicado (linha 502-504):**
- Remover `|| mode === "sc"` da condição para não duplicar aviso no motoboy (já tem o aviso genérico da linha 493).

### Resumo das mudanças
- Abertura da mensagem fica condicional: motoboy pede entrega diretamente, carro/nacional pede frete
- Aviso de itens frágeis/transporte removido apenas para motoboy
- Aviso duplicado de ajuste de valor não aparece mais para motoboy

### Arquivo alterado
| Arquivo | Escopo |
|---------|--------|
| `src/pages/Index.tsx` | Função `buildWhatsAppUrl` — ~10 linhas alteradas |

