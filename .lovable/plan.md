

## Plano: Adicionar eventos GA4 de conversão (click_whatsapp e submit_simulacao)

### Objetivo
Disparar eventos GA4 (`gtag('event', ...)`) nos cliques de WhatsApp e na conclusão de simulação, além do tracking interno já existente.

### Abordagem
Adicionar uma função helper `pushGA4Event` em `src/lib/analytics.ts` que chama `window.gtag()` (se disponível). Depois, chamar essa função nos pontos relevantes.

### Mudanças

**1. `src/lib/analytics.ts`** — Adicionar helper GA4:
```typescript
export function pushGA4Event(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
}
```

**2. `src/components/WhatsAppFloat.tsx`** — Ao clicar, disparar `click_whatsapp`:
- Trocar `<a>` por onClick handler que chama `pushGA4Event("click_whatsapp", { source: "float_button" })` + `trackEvent(...)` e depois abre o link.

**3. `src/components/HeroSection.tsx`** — No botão "Falar no WhatsApp":
- Adicionar onClick com `pushGA4Event("click_whatsapp", { source: "hero" })` antes de abrir o link.

**4. `src/pages/Index.tsx`** — Nos links WhatsApp do resultado e do footer:
- Adicionar `pushGA4Event("click_whatsapp", { source: "result" })` e `source: "footer"` respectivamente.
- Na linha ~440 (simulation_completed), adicionar `pushGA4Event("submit_simulacao", { vehicle_type, distance_km, final_value })`.

### Arquivos alterados
| Arquivo | Mudança |
|---------|---------|
| `src/lib/analytics.ts` | Adicionar `pushGA4Event` |
| `src/components/WhatsAppFloat.tsx` | Disparar `click_whatsapp` no clique |
| `src/components/HeroSection.tsx` | Disparar `click_whatsapp` no botão hero |
| `src/pages/Index.tsx` | Disparar `submit_simulacao` + `click_whatsapp` nos links de resultado/footer |

