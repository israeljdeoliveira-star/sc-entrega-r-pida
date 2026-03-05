

## Plano: Adicionar seção "SQL das Tabelas" na página de Exportar Dados

### Objetivo
Adicionar uma área com sidebar estilo o screenshot de referência (Database, Users, Storage, etc.) onde o admin pode ver o SQL de criação (CREATE TABLE) de cada tabela do sistema e copiar para migração.

### Abordagem
Como não temos acesso dinâmico ao `information_schema` via client-side (RLS bloqueia), vou gerar o SQL estático baseado no schema conhecido (types.ts + contexto das tabelas). Cada tabela terá seu CREATE TABLE completo com colunas, tipos, defaults e constraints.

### Mudanças em `src/pages/admin/DataExportPage.tsx`

**1. Layout com sidebar lateral (estilo referência)**
- Dividir a página em duas seções com Tabs ou layout side-by-side:
  - **Aba 1**: "Exportar CSV" (conteúdo atual)
  - **Aba 2**: "SQL Schema" com sidebar à esquerda listando categorias (Database, Storage, Edge Functions, etc.) e área principal mostrando o SQL

**2. Sidebar de navegação SQL**
- Items: Database (todas as tabelas), Users (profiles, user_roles), Storage (service-photos bucket info), Edge Functions (calculate-freight), Secrets (lista de nomes), SQL Editor (campo livre)
- Visual dark como na referência, com ícones similares

**3. Área de SQL por tabela**
- Ao clicar em "Database", listar todas as tabelas com accordion
- Cada tabela mostra seu `CREATE TABLE` statement completo
- Botão "Copiar SQL" por tabela e "Copiar Tudo"
- SQL gerado estaticamente a partir do schema conhecido
- Incluir também CREATE TYPE para `app_role`, funções (`has_role`, `handle_new_user`, etc.), triggers e RLS policies

**4. Outras seções**
- **Users**: mostra SQL de profiles + user_roles
- **Storage**: mostra config do bucket `service-photos`
- **Edge Functions**: lista `calculate-freight` com nota de que o código está no repositório
- **Secrets**: lista nomes dos secrets configurados (sem valores)
- **Logs**: informação de que logs são acessíveis via Lovable Cloud

### Arquivo alterado
| Arquivo | Escopo |
|---------|--------|
| `src/pages/admin/DataExportPage.tsx` | Adicionar Tabs, sidebar SQL, schema estático copiável |

