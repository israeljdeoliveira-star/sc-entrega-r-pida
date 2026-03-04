

## Plano: Separar Cidades Moto/Carro + Estados + Bairros Automáticos

### Problema Atual
A tabela `cities` mistura cidades de moto e carro. O frontend moto carrega todas as cidades (incluindo as que deveriam ser apenas para carro), causando conflito na simulação. Os bairros precisam ser cadastrados manualmente um a um.

### Mudanças

#### 1. Banco de dados
- Adicionar coluna `vehicle_type` (text, default 'moto') na tabela `cities` para separar registros
- Criar tabela `served_states` com colunas: `id`, `state_code` (ex: "SC"), `state_name`, `is_active`, `min_value`, `base_value`, `created_at` — usada para controlar quais estados o frete carro atende
- Migrar as cidades existentes para `vehicle_type = 'moto'`

#### 2. Admin — CitiesPage
- Adicionar Tabs: "🛵 Moto (Cidades)" e "🚗 Carro (Estados)"
- Tab Moto: formulário atual de cidades (filtrado por `vehicle_type = 'moto'`)
- Tab Carro: CRUD de estados atendidos (tabela `served_states`) com campos: Estado (sigla), Nome, Valor Mínimo, Valor Base, Ativa

#### 3. Admin — NeighborhoodsPage
- Ao selecionar uma cidade no formulário de novo bairro, buscar automaticamente bairros via Nominatim (`q=bairros em [cidade], [estado]` ou query structurada)
- Exibir lista de bairros encontrados com checkboxes para o admin selecionar quais adicionar em lote
- Manter opção de adicionar bairro manualmente

#### 4. Frontend — Index.tsx (Moto)
- Filtrar `cities` carregadas com `vehicle_type = 'moto'` (já feito via query)
- Na query inicial: `supabase.from("cities").select("*").eq("is_active", true).eq("vehicle_type", "moto")`

#### 5. Frontend — CityAutocomplete (Carro)
- No `CityAutocomplete`, carregar `served_states` em vez de `cities`
- Quando o usuário selecionar uma cidade no Nominatim, verificar se o estado está na tabela `served_states` e ativo
- Se o estado não for atendido, mostrar aviso

#### 6. Edge Function — calculate-freight
- Para modo carro: buscar `served_states` pelo estado da cidade selecionada para obter `min_value` e `base_value` do estado
- Fallback para valores nacionais se estado não encontrado

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| Migration SQL | Adicionar `vehicle_type` em `cities`, criar `served_states` |
| `CitiesPage.tsx` | Tabs Moto/Carro, CRUD de estados |
| `NeighborhoodsPage.tsx` | Auto-busca de bairros via Nominatim |
| `Index.tsx` | Filtrar cities por `vehicle_type='moto'` |
| `CityAutocomplete.tsx` | Validar contra `served_states` |
| `calculate-freight/index.ts` | Usar `served_states` para carro |

