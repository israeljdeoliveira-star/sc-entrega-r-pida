## Plano: Lógica de Frete v2 — Filial + KM Progressivo (IMPLEMENTADO)

### Mudanças Realizadas

1. **Bairros removidos** do menu admin e do cálculo de frete
2. **Tabela `filial_config`** criada — cidade, endereço, coordenadas, valor_km_deslocamento, valor_minimo_filial
3. **Tabela `km_tiers`** criada — faixas progressivas de preço por KM (ex: até 1km=R$15, até 5km=R$20, etc.)
4. **Edge function reescrita** com nova lógica:
   - Moto: valor = buscarValorPorKm(distância_entrega) + deslocamento (se fora da filial)
   - Mínimo R$15 aplicado APENAS quando coleta na filial
   - Carro: mantém lógica anterior
5. **Admin**: nova página "Filial", nova página "Tabela de KM"
6. **Log de simulação** atualizado com campos: distancia_deslocamento_km, valor_entrega, valor_deslocamento

### Regras de Cálculo Moto

| Cenário | Fórmula |
|---------|---------|
| Coleta NA filial | `buscarValorPorKm(distância_entrega)`, mínimo R$15 |
| Coleta FORA da filial | `buscarValorPorKm(distância_entrega) + (km_deslocamento × valor_km_deslocamento)`, SEM mínimo |
| Parada extra | + valor_minimo_filial por parada |
| Retorno | + moto_return_fee |
