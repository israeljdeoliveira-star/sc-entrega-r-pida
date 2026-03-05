

## Plano: Restaurar seleção de cidade no Motoboy para filtrar ruas

### Problema
Na aba Motoboy, o `AddressAutocomplete` não recebe `cityName`, então a busca de ruas retorna resultados de qualquer lugar do Brasil. Antes havia seleção de cidade que filtrava as ruas — isso foi removido.

### Solução
Adicionar campos de seleção de cidade (usando `CityAutocomplete`) antes dos campos de endereço na aba Motoboy, igual ao fluxo do Carro. Quando o usuário seleciona a cidade, o `AddressAutocomplete` recebe o `cityName` e filtra as ruas apenas daquela cidade.

### Mudanças em `Index.tsx`

1. **Adicionar dois `CityAutocomplete`** na aba Motoboy — um para coleta, outro para destino
2. **Passar `cityName` e `disabled`** para os `AddressAutocomplete` existentes (linhas 506 e 521), igual ao padrão do Carro
3. **Desabilitar campo de rua** até o usuário selecionar a cidade
4. **Handlers**: ao selecionar cidade de coleta/destino no moto, setar `originCityName`/`destCityName` e limpar endereço anterior
5. **Paradas extras**: opcionalmente filtrar pela cidade de destino ou deixar livre (manter comportamento atual)

### Estrutura da aba Motoboy (após mudança)

```text
📍 Local de Coleta
  [Cidade: CityAutocomplete] ← NOVO
  [Rua + Número: AddressAutocomplete cityName={originCityName} disabled={!originCityName}]
  [Referência]

📍 Destino
  [Cidade: CityAutocomplete] ← NOVO
  [Rua + Número: AddressAutocomplete cityName={destCityName} disabled={!destCityName}]
  [Nome destinatário]
  [Referência]
```

### Arquivo alterado

| Arquivo | Alteração |
|---------|-----------|
| `Index.tsx` | Adicionar `CityAutocomplete` na aba Motoboy + passar `cityName`/`disabled` aos `AddressAutocomplete` |

