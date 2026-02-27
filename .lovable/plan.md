

## Plan: Glassmorphism azul no simulador

Aplicar um visual "glass blue" no card do simulador — fundo azul translúcido com backdrop-blur e bordas com brilho sutil.

### Mudanças em `src/pages/Index.tsx`

1. **Section wrapper (linha 297)**: Trocar `bg-muted/30` por um gradiente azul suave como fundo da seção
2. **Card do simulador (linha 299)**: Aplicar glassmorphism:
   - `bg-blue-50/60 dark:bg-blue-950/40` — fundo azul translúcido
   - `backdrop-blur-xl` — efeito vidro
   - `border border-blue-200/50 dark:border-blue-400/20` — bordas com reflexo
   - `shadow-[0_8px_32px_rgba(59,130,246,0.15)]` — sombra azulada
   - `ring-1 ring-blue-100/30` — anel interno sutil de brilho

### Arquivo a editar
- `src/pages/Index.tsx` — linhas 297-299

