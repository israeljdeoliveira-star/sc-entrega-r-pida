

## Plano: Admin organizado + Simulação robusta + Validação guiada

### 1. Admin — Sidebar organizada com descrições

**Arquivo**: `src/pages/admin/AdminLayout.tsx`

Substituir o layout atual de botões horizontais por um `SidebarProvider` + `Sidebar` do shadcn com grupos colapsáveis e descrições curtas de impacto:

- **Geral**: Dashboard, Pedidos
- **Precificação Frete**: Filial (define ponto base para cálculo de deslocamento), Tabela de KM (faixas de preço por distância — moto), Multiplicadores (ajustes por condições — chuva, noturno, etc.), Margem Inteligente (lucro automático por risco), Precificação Carro (custo/km baseado em perfil veicular), Adicionais Carro (taxas extras — ajudante, escada, etc.)
- **Cobertura**: Cidades Atendidas (restringe seleção no simulador moto)
- **Regras e Logs**: Regras Dinâmicas, Log de Simulações, Log de Alterações
- **Equipe**: Motoristas, Clientes, Colaboradores
- **Outros**: Códigos Externos, Fotos Serviços, Exportar Dados

Cada item terá tooltip ou subtexto de 1 linha explicando o impacto na simulação. Header com `SidebarTrigger` sempre visível. Sidebar colapsável em modo `icon`.

### 2. Simulação — Recálculo robusto ao trocar endereços

**Arquivo**: `src/pages/Index.tsx`

Problemas identificados:
- Ao trocar cidade, `originAddress` é setado null mas `routeDistance` anterior persiste, causando recálculo com dados stale
- O `FreightMap` recebe `originCoords=null` momentaneamente e pode não re-disparar `onRouteCalculated` quando o novo endereço é selecionado se as coords mudarem rapidamente

Correções:
- Ao limpar endereço (troca de cidade ou re-digitação), limpar `routeDistance` e `routeDuration` junto
- Adicionar key no `FreightMap` baseada em hash dos coords para forçar re-mount quando endereços mudam significativamente
- No `AddressAutocomplete`, ao digitar (antes de selecionar), chamar callback `onClear` para resetar coords do parent — evita estado stale
- Adicionar prop `onClear` no `AddressAutocomplete` que dispara quando o input muda (usuário está editando/apagando)

**Arquivo**: `src/components/AddressAutocomplete.tsx`
- Adicionar prop `onClear?: () => void` — chamada quando query muda e não há seleção ativa

### 3. Validação guiada com scroll para campo faltante

**Arquivo**: `src/pages/Index.tsx`

Criar função `validateSimulation()` que verifica todos os campos obrigatórios antes do cálculo e:
- Mostra mensagem específica (ex: "Selecione a cidade de coleta", "Informe a rua de destino com número")
- Faz scroll suave até o campo faltante usando `ref` ou `id`
- Destaca visualmente o campo com borda vermelha temporária (2s)

Campos obrigatórios por modo:
- **Moto**: cidade origem, endereço origem (com número), cidade destino, endereço destino (com número)
- **Carro**: cidade origem, endereço origem, cidade destino, endereço destino, descrição itens, detalhes itens

Mostrar um `Alert` no topo do formulário com a lista de pendências quando o usuário tenta interagir sem preencher.

### Arquivos alterados

| Arquivo | Escopo |
|---------|--------|
| `src/pages/admin/AdminLayout.tsx` | Refatorar para Sidebar shadcn com grupos, descrições e ícones |
| `src/pages/Index.tsx` | Recálculo robusto + validação guiada com scroll |
| `src/components/AddressAutocomplete.tsx` | Adicionar prop `onClear` |

