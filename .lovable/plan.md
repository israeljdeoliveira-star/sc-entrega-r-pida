

## Plano: Correções Múltiplas no Simulador

### Problemas Identificados

1. **Loop infinito no cálculo** — O `useEffect` auto-calculate dispara `handleSimulate` que atualiza state, causando re-renders. A função `handleSimulate` não é estável (não usa `useCallback`), e o efeito pode re-disparar ao mudar toggles durante o cálculo.

2. **Seletor de peso mostra exemplo junto** — O `SelectItem` exibe `w.example` (ex: "📦 Pacote de Café (~500g)") em vez de apenas o peso. O exemplo deveria aparecer abaixo do seletor, não dentro dele.

3. **"Simular Frete Agora" cai no meio do formulário** — `scrollToSimulator` usa `block: "center"` no ref `simulatorRef` que aponta para a `section`. Deveria rolar para o topo da seção (tabs).

4. **Carro limita cidades cadastradas** — Usa dropdown com `cities` do banco (apenas 6 cidades SC). Precisa ser campo de texto livre com autocomplete para qualquer cidade do Brasil.

5. **Falta campo "Nome do destinatário"** no destino.

6. **Falta aviso quando origem > 50km de Itapema**.

---

### Soluções — Arquivo: `src/pages/Index.tsx`

#### 1. Fix loop infinito
- Envolver `handleSimulate` em `useCallback` com deps corretas
- Adicionar `useRef` de controle (`isCalculating`) para evitar chamadas concorrentes
- No `useEffect` auto-calculate, usar debounce de 500ms e verificar `isCalculating`

#### 2. Seletor de peso: mostrar só peso, exemplo embaixo
- No `SelectContent`, trocar `w.example` por `w.label` (ex: "1 kg")
- Abaixo do `Select`, renderizar o `selectedWeight?.example` como texto de referência:
  ```
  📚 Equivale a: Livro Grande (~1kg)
  ```

#### 3. Scroll "Simular Frete Agora" → topo da seção
- Mudar `scrollToSimulator` para usar `block: "start"` em vez de `"center"`
- Adicionar offset negativo para compensar o header fixo

#### 4. Carro: campo cidade livre para todo Brasil
- Trocar o `Select` de cidade (origem e destino carro) por um `Input` com autocomplete via Nominatim
- Criar componente `CityAutocomplete` que busca cidades no Nominatim com `type=city`
- Priorizar resultados próximos a Itapema (viewbox parameter)
- Se a cidade digitada estiver no banco `cities`, usar seu `id`; senão, usar modo "national" na edge function
- Quando a cidade for selecionada, alimentar o `AddressAutocomplete` existente com o nome da cidade

#### 5. Aviso origem > 50km de Itapema
- Calcular distância entre coordenadas de origem e coordenadas fixas de Itapema (-27.09, -48.61) usando fórmula Haversine
- Se > 50km, mostrar `Alert` amarelo: "📍 Somos de Itapema/SC. A distância da origem pode impactar o valor."

#### 6. Campo "Nome do destinatário"
- Adicionar state `destName` e `carDestName`
- Adicionar `Input` com placeholder "Nome de quem vai receber" abaixo do endereço de destino (moto e carro)
- Incluir na mensagem do WhatsApp

---

### Arquivo: `src/components/CityAutocomplete.tsx` (novo)
- Input com autocomplete via Nominatim para cidades brasileiras
- Prop `onSelect(cityName, state, lat, lng)` 
- Busca com viewbox priorizando região de Itapema
- Se a cidade existir na tabela `cities`, retorna também o `cityId`

### Arquivo: `src/components/AddressAutocomplete.tsx`
- Sem mudanças necessárias (já aceita `cityName` como prop)

### Arquivo: `supabase/functions/calculate-freight/index.ts`
- Sem mudanças necessárias (já suporta modo "sc" com city IDs e modo "national" sem)

---

### Resumo de arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Index.tsx` | Fix loop, peso, scroll, cidade livre, aviso 50km, nome destinatário |
| `src/components/CityAutocomplete.tsx` | Novo componente autocomplete de cidades |

