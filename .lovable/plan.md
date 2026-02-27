
Objetivo: corrigir o login Google que autentica no backend, mas mantém o usuário no `/login` no preview.

Implementação (curta e direta):

1) Ajustar callback OAuth para preservar rota/query do preview  
- Arquivo: `src/hooks/useAuth.tsx`  
- Trocar `redirect_uri: window.location.origin` por URL completa atual (`origin + pathname + search`) para manter o token de preview e retornar corretamente ao app.

2) Tornar validação de admin mais robusta  
- Arquivo: `src/hooks/useAuth.tsx`  
- Em `checkAdmin`, usar RPC `has_role(_user_id, _role)` (já existe no banco) em vez de `select` direto em `user_roles`.  
- Tratar erro explicitamente e manter `isAdmin = false` com log/toast de diagnóstico.

3) Fluxo pós-login no `/login`  
- Arquivo: `src/pages/Login.tsx`  
- Manter redirecionamento automático para `/admin` quando `user && isAdmin && !loading`.  
- Se `user && !isAdmin && !loading`, exibir aviso claro de “conta sem permissão administrativa” (evita parecer que login falhou).

4) Validação final do fluxo  
- Testar no preview com `israeljdeoliveira@gmail.com`: clicar “Entrar com Google” → concluir Google → redirecionar para `/admin`.  
- Testar também no domínio publicado para confirmar mesmo comportamento.  
- Validar que usuário sem role admin continua bloqueado (com mensagem explícita).

Arquivos a alterar:
- `src/hooks/useAuth.tsx`
- `src/pages/Login.tsx`
