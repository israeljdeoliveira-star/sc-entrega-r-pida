

## Plan: Complemento, peso corrigido e taxa de urgência

### 1. Adicionar campos "Complemento (opcional)" na UI
- **SC Motoboy**: Adicionar input após "Número" na Coleta (linha ~332) e Destino (linha ~356)
- **Nacional**: Adicionar input após "Número" na Origem (linha ~412) e Destino (linha ~432)
- Adicionar states `natOriginComplement` e `natDestComplement` para modo nacional

### 2. Corrigir opções de peso estimado
Tornar os exemplos mais realistas e úteis:
- 1 kg — peso de um pacote de café
- 2 kg — peso de um notebook
- 3 kg — peso de um abacaxi
- 5 kg — peso de uma melancia pequena
- 10 kg — peso de um micro-ondas
- 15 kg — peso de um monitor
- 20 kg — peso de uma mala grande

### 3. Taxa de urgência no card de resultado
- Express: +R$ 8,00
- Urgente: +R$ 12,00
- Normal: +R$ 0
- Mostrar linha "Taxa de urgência" no card de resultado quando > 0
- Somar ao valor final exibido (client-side, sobre o `final_value` retornado)
- Incluir no texto do WhatsApp

### 4. Incluir complemento no texto do WhatsApp
- Adicionar complemento ao `originText` e `destText` na função `buildWhatsAppUrl`

### Arquivo a editar
- `src/pages/Index.tsx`

