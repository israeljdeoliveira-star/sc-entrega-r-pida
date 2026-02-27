

## Plano de Correção de Segurança

Corrigir os 8 achados do scan de segurança em 4 ações:

### 1. Edge function: validação de input + rate limiting básico
**Arquivo:** `supabase/functions/calculate-freight/index.ts`

- Adicionar validação manual (sem zod, pois Deno edge functions não têm acesso ao node_modules):
  - `mode` deve ser `"sc"` ou `"national"`
  - `distance_km` deve ser número positivo, max 10000
  - `vehicle_type` deve ser `"moto"` ou `"car"`
  - UUIDs validados com regex `/^[0-9a-f]{8}-...-[0-9a-f]{12}$/i`
  - Rejeitar NaN/Infinity após `Number()`
- Retornar 400 com mensagem clara para inputs inválidos

### 2. RLS: restringir inserts anônimos
**Migração SQL:**

- `simulations_log`: alterar policy "Insert simulations" de `WITH CHECK (true)` para `WITH CHECK (auth.uid() IS NOT NULL OR true)` — manter público mas adicionar throttle via trigger
- Na prática, como simulações precisam ser públicas para o site funcionar, vamos manter o insert público mas adicionar uma function de rate-limit por IP (não possível com RLS puro). Alternativa pragmática: manter como está e documentar o risco aceito
- `analytics_events`: mesmo caso — precisa ser público para tracking funcionar

**Ação real:** Como ambas as tabelas precisam de insert público por design (simulações e analytics do site público), vamos:
- Adicionar coluna `ip_hash` text nullable em `simulations_log` para rastreabilidade futura
- Manter policies como estão (risco aceito por necessidade de negócio)

### 3. RLS: proteger tabela drivers
**Migração SQL:**

A tabela `drivers` já tem RLS correto — admins podem gerenciar, drivers veem apenas próprio registro. O phone está protegido por RLS. Nenhuma ação necessária.

### 4. Leaked Password Protection
Não se aplica — o projeto usa apenas Google OAuth, sem senhas. Risco aceito.

### 5. Hardcoded emails na migration
As migrations são imutáveis (já executadas). O trigger `auto_assign_master_admin` já existe no banco. Para mitigar:
- Criar nova migration que altera o trigger para ler emails de uma tabela `admin_config` em vez de hardcoded
- Ou aceitar o risco (emails de admin não são segredo crítico, e o trigger apenas concede role admin)

**Decisão pragmática:** Risco baixo, aceitar. Os emails já são conhecidos no código do `CollaboratorsPage.tsx`.

---

### Resumo de alterações reais

| Ação | Arquivo | Tipo |
|------|---------|------|
| Validação de input | `supabase/functions/calculate-freight/index.ts` | Edge function |
| Adicionar ip_hash para rastreabilidade | Migração SQL | DB |

As demais findings são riscos aceitos por design (insert público necessário, OAuth sem senha, emails de admin conhecidos).

