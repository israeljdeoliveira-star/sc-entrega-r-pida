

## Correcao: Loop de redirecionamento no auth

O problema atual: `ProtectedRoute` redireciona para `/login` antes do `checkAdmin` completar, e o `Login.tsx` redireciona de volta, criando um loop.

### Arquivos a alterar (2)

**1. `src/hooks/useAuth.tsx`** - Simplificar sincronizacao
- Iniciar `loading = true` e so mudar para `false` apos `getSession` + `checkAdmin` completarem
- No `onAuthStateChange`, nao resetar `adminCheckComplete` para evitar flicker
- Usar um ref para evitar corrida entre `getSession` e `onAuthStateChange`

**2. `src/components/ProtectedRoute.tsx`** - Blindar contra estado intermediario
- Mostrar loading enquanto `loading === true` OU (`user` existe mas `adminCheckComplete === false`)
- So redirecionar quando temos certeza absoluta: `!loading && adminCheckComplete`

### Logica simplificada do useAuth

```text
getSession() → session encontrada?
  SIM → checkAdmin(userId) → seta isAdmin + adminCheckComplete → loading = false
  NAO → isAdmin=false, adminCheckComplete=true → loading = false

onAuthStateChange → mesma logica, mas ignora se requestId mudou
```

Nenhuma pagina interna do admin sera tocada.
