

## Corrigir Autocomplete: Bairro Validado pelo Mapa + Número na Sugestão

### Problema
Quando o usuário digita um endereço, o sistema não mostra o número junto com a rua nas sugestões, e se o usuário digitar/pensar um bairro errado, o sistema não corrige. O bairro deve vir **sempre do Nominatim** (fonte verdadeira), sobrepondo qualquer suposição do usuário.

### Solução — `src/components/AddressAutocomplete.tsx`

1. **Adicionar `house_number` à interface `NominatimResult`** (`address.house_number`)

2. **Extrair número do input do usuário** via regex (ex: "Rua Brasil, 570" → extrai "570") quando Nominatim não retornar `house_number`

3. **Atualizar `formatResult`** para exibir:
   ```
   Rua 230, 570 - Meia Praia
   Rua Brasil, 123 - Centro
   ```
   Formato: `[Rua], [Número] - [Bairro]`

4. **Bairro sempre do mapa**: O `neighborhood` retornado no `onSelect` vem exclusivamente do Nominatim (`suburb` → `neighbourhood` → `city_district` → fallback do `display_name`). O usuário nunca define o bairro manualmente — o sistema corrige automaticamente com base na localização real da rua.

5. **Adicionar `houseNumber` ao `AddressSelection`** para uso no log e WhatsApp

6. **Exibir badge do bairro detectado** abaixo do campo após seleção, mostrando: `📍 Bairro: Centro` — confirmação visual ao usuário de que o sistema identificou o bairro correto.

### Arquivo alterado
| Arquivo | Alteração |
|---------|-----------|
| `src/components/AddressAutocomplete.tsx` | Número nas sugestões, bairro do mapa, badge visual |

