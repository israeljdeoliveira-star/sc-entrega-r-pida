import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Shield, Database, Truck, MapPin, Users, BarChart3, Code, Zap, ChevronDown,
  Globe, Lock, Image, Calculator, Bell, Palette, Search, FileText,
} from "lucide-react";
import { useState } from "react";

/* ─── Data types ─── */
interface Step {
  title: string;
  description: string;
  status: "active" | "done" | "planned";
}

interface PromptCategory {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  steps: Step[];
}

/* ─── Prompt categories organized by feature area ─── */
const categories: PromptCategory[] = [
  {
    id: "auth",
    icon: Lock,
    title: "Autenticação & Segurança",
    description: "Login, controle de acesso e políticas de segurança",
    steps: [
      { title: "Login com Google OAuth", description: "Implementação do login via Google utilizando Lovable Cloud Auth. Apenas administradores acessam o painel.", status: "done" },
      { title: "Sistema de Roles (user_roles)", description: "Tabela separada de roles com enum (admin, user, driver, client). Função has_role() com SECURITY DEFINER para verificação segura.", status: "done" },
      { title: "Auto-assign master admin", description: "Trigger auto_assign_master_admin que atribui role 'admin' automaticamente para os emails master configurados no banco.", status: "done" },
      { title: "ProtectedRoute com verificação completa", description: "Componente que aguarda adminCheckComplete antes de renderizar, evitando loops de redirecionamento.", status: "done" },
      { title: "RLS em todas as tabelas", description: "Row Level Security ativado em 13 tabelas com políticas granulares: admin para escrita, público para leitura de dados necessários.", status: "done" },
      { title: "CSP (Content Security Policy)", description: "Headers de segurança no index.html autorizando apenas domínios confiáveis (Google, Facebook, OpenStreetMap, Supabase).", status: "done" },
      { title: "Validação de inputs na Edge Function", description: "Validação manual de mode, distance_km, vehicle_type, UUIDs e rejeição de NaN/Infinity na calculate-freight.", status: "done" },
    ],
  },
  {
    id: "pricing-moto",
    icon: Truck,
    title: "Precificação Moto (SC)",
    description: "Cálculo de frete para entregas de moto na região",
    steps: [
      { title: "Tabela de faixas por KM (km_tiers)", description: "Faixas de preço escalonadas por distância. Valores definidos pelo admin.", status: "done" },
      { title: "Cidades e bairros atendidos", description: "Tabela cities com base_value, min_value, density. Bairros com additional_fee vinculados a cidades.", status: "done" },
      { title: "Filial como ponto base", description: "Config de filial (filial_config) com coordenadas, cidade e opção de cobrar deslocamento fora da cidade-base.", status: "done" },
      { title: "Multiplicadores por condição", description: "Multiplicadores para chuva, noturno, horário de pico, risco médio/alto e severo. Separados por moto e carro.", status: "done" },
      { title: "Margem inteligente", description: "Margem automática baseada em condições de risco: base, longa distância, chuva, pico, risco alto.", status: "done" },
      { title: "Taxa de retorno (moto)", description: "Modos: incluso, fixo ou híbrido (KM incluídos + preço/km excedente). Configurável no admin.", status: "done" },
      { title: "Paradas extras", description: "Até 3 paradas intermediárias com endereço via autocomplete. Taxa por parada configurável.", status: "done" },
    ],
  },
  {
    id: "pricing-car",
    icon: Calculator,
    title: "Precificação Carro",
    description: "Sistema de custo/km baseado em perfil veicular",
    steps: [
      { title: "Perfis de veículo (vehicle_profiles)", description: "Cadastro de veículos com consumo, capacidade, valor de compra/residual e vida útil.", status: "done" },
      { title: "Inputs de custo (pricing_cost_inputs)", description: "Custos operacionais detalhados: combustível, manutenção, pneus, salário, seguro, IPVA, marketing, etc.", status: "done" },
      { title: "Simulação de preço por cenário", description: "Cálculo de custo/km, preço de equilíbrio e preço recomendado com margem de segurança.", status: "done" },
      { title: "Adicionais de carro", description: "Taxas extras: ajudante, escada, frágil, plástico bolha, sem elevador. Configuráveis no admin.", status: "done" },
      { title: "Modo Nacional", description: "Cálculo por endereço livre (texto) para entregas de longa distância via carro.", status: "done" },
    ],
  },
  {
    id: "simulation",
    icon: MapPin,
    title: "Simulador de Frete",
    description: "Interface pública de simulação de preço",
    steps: [
      { title: "Simulador com abas Moto/Carro", description: "Interface com tabs para selecionar tipo de veículo. Moto usa cidades/bairros, carro usa endereço livre.", status: "done" },
      { title: "Autocomplete de endereço (Nominatim)", description: "Busca de endereços via OpenStreetMap Nominatim para modo Nacional e paradas extras.", status: "done" },
      { title: "Autocomplete de cidades", description: "Busca em cidades ativas do banco para modo SC (moto).", status: "done" },
      { title: "Cálculo via Edge Function", description: "Toda lógica de cálculo roda server-side na Edge Function calculate-freight. Cliente apenas envia parâmetros.", status: "done" },
      { title: "Mapa interativo (Leaflet)", description: "Exibição de rota no mapa com origem/destino. Lazy-loaded para performance.", status: "done" },
      { title: "Log de simulações", description: "Cada simulação é registrada no simulations_log com todos os dados: distância, valores, margem, config snapshot.", status: "done" },
      { title: "Solicitar pelo WhatsApp", description: "CTA pulsante que valida número de WhatsApp do cliente e redireciona para conversa com dados do pedido.", status: "done" },
    ],
  },
  {
    id: "orders",
    icon: FileText,
    title: "Gestão de Pedidos",
    description: "Fluxo de pedidos e atribuição de motoristas",
    steps: [
      { title: "Criação de pedido via simulação", description: "Pedido criado automaticamente quando cliente clica em 'Solicitar pelo WhatsApp'. Vínculo com simulation_id.", status: "done" },
      { title: "Painel de pedidos (admin)", description: "Lista de pedidos com filtros por status, busca por nome/cidade, e ações de gerenciamento.", status: "done" },
      { title: "Atribuição de motorista", description: "Admin pode atribuir motorista a um pedido pendente. Status muda para 'assigned'.", status: "done" },
      { title: "Fluxo de status", description: "Pedido segue: pending → assigned → completed/cancelled. Cada mudança registrada com timestamp.", status: "done" },
    ],
  },
  {
    id: "dre",
    icon: BarChart3,
    title: "DRE & Relatórios",
    description: "Demonstrativo de resultados e relatórios de motoristas",
    steps: [
      { title: "DRE Mensal", description: "Cálculo de receita bruta, comissões de motoristas (% sobre valor do frete), e lucro estimado por mês.", status: "done" },
      { title: "Relatório por motorista", description: "KPIs individuais: total de entregas, receita gerada, comissão acumulada e distância total percorrida.", status: "done" },
      { title: "Dashboard geral", description: "Visão geral com métricas do sistema: simulações, pedidos, receita e motoristas ativos.", status: "done" },
    ],
  },
  {
    id: "team",
    icon: Users,
    title: "Equipe & Clientes",
    description: "Cadastro de motoristas, clientes e colaboradores",
    steps: [
      { title: "Cadastro de motoristas", description: "CRUD de motoristas com nome, telefone, placa, tipo de veículo e status ativo/inativo.", status: "done" },
      { title: "Base de clientes", description: "Lista de clientes extraída dos pedidos realizados.", status: "done" },
      { title: "Colaboradores", description: "Gestão de equipe interna com controle de acesso exclusivo para email master.", status: "done" },
    ],
  },
  {
    id: "frontend",
    icon: Palette,
    title: "Frontend & UX",
    description: "Design, landing page e experiência do usuário",
    steps: [
      { title: "Landing page com hero section", description: "Seção principal com logo, título e CTA para simular frete. Design responsivo.", status: "done" },
      { title: "Prova social (SocialProof)", description: "Seção de depoimentos e números para gerar confiança.", status: "done" },
      { title: "Seção de serviços", description: "Cards descrevendo os tipos de serviço oferecidos.", status: "done" },
      { title: "Carrossel de fotos", description: "Fotos de entregas reais gerenciadas pelo admin via storage bucket.", status: "done" },
      { title: "Botão flutuante WhatsApp", description: "Ícone flutuante que redireciona para WhatsApp. Configurável via site_settings.", status: "done" },
      { title: "Dark mode", description: "Toggle de tema claro/escuro usando next-themes com tokens semânticos CSS.", status: "done" },
      { title: "Admin sidebar colapsável", description: "Navegação lateral com grupos, ícones, descrições de impacto e tooltips quando colapsada.", status: "done" },
    ],
  },
  {
    id: "integrations",
    icon: Globe,
    title: "Integrações Externas",
    description: "APIs e serviços de terceiros utilizados",
    steps: [
      { title: "OpenStreetMap Nominatim", description: "Geocoding de endereços para obter coordenadas (lat/lng). Usado no autocomplete de endereço.", status: "done" },
      { title: "OSRM (roteamento)", description: "Cálculo de distância real por estrada entre dois pontos. Usado como fallback do ORS.", status: "done" },
      { title: "OpenRouteService (ORS)", description: "API de roteamento principal com API key. Fallback para OSRM em caso de falha.", status: "done" },
      { title: "Google Analytics (GA4)", description: "Rastreamento de eventos e pageviews. ID configurável via admin (site_settings).", status: "done" },
      { title: "Google Tag Manager", description: "Container de tags configurável via admin.", status: "done" },
      { title: "Facebook Pixel", description: "Rastreamento de conversões. ID configurável via admin.", status: "done" },
      { title: "Leaflet + CartoDB", description: "Mapa interativo com basemaps CartoDB para exibição de rotas.", status: "done" },
    ],
  },
  {
    id: "infra",
    icon: Database,
    title: "Infraestrutura & Banco",
    description: "Estrutura do banco de dados e backend",
    steps: [
      { title: "13 tabelas com RLS", description: "cities, neighborhoods, drivers, orders, simulations_log, freight_settings, filial_config, km_tiers, dynamic_rules, pricing_change_log, analytics_events, site_settings, service_photos, profiles, user_roles, vehicle_profiles, pricing_cost_inputs, pricing_simulations, served_states.", status: "done" },
      { title: "Edge Function calculate-freight", description: "Função serverless que executa toda lógica de precificação. Validação de inputs, cálculo de distância e registro automático.", status: "done" },
      { title: "Storage bucket (service-photos)", description: "Bucket público para fotos de serviço. Upload/delete restrito a admins via RLS.", status: "done" },
      { title: "Cleanup automático", description: "Função cleanup_old_simulations que remove simulações com mais de 30 dias.", status: "done" },
      { title: "Triggers de banco", description: "handle_new_user (cria perfil) e auto_assign_master_admin (atribui admin para emails master).", status: "done" },
    ],
  },
  {
    id: "seo",
    icon: Search,
    title: "SEO & Performance",
    description: "Otimizações de busca e carregamento",
    steps: [
      { title: "Meta tags completas", description: "Title, description, OG tags, Twitter cards e JSON-LD para LocalBusiness.", status: "done" },
      { title: "Canonical URL", description: "URL canônica configurada para fretegarça.com.br.", status: "done" },
      { title: "Lazy loading do mapa", description: "Componente FreightMap carregado sob demanda (React.lazy) para reduzir bundle inicial.", status: "done" },
      { title: "robots.txt", description: "Arquivo configurado para permitir indexação por crawlers.", status: "done" },
    ],
  },
];

const statusColors: Record<Step["status"], string> = {
  done: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  active: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  planned: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<Step["status"], string> = {
  done: "✅ Implementado",
  active: "🔄 Em uso",
  planned: "📋 Planejado",
};

function CategoryCard({ category }: { category: PromptCategory }) {
  const [open, setOpen] = useState(false);
  const Icon = category.icon;
  const doneCount = category.steps.filter((s) => s.status === "done").length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{category.title}</CardTitle>
                  <CardDescription className="text-xs">{category.description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {doneCount}/{category.steps.length}
                </Badge>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-4" />
            <ol className="space-y-3">
              {category.steps.map((step, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{step.title}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[step.status]}`}>
                        {statusLabels[step.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function ProjectDocsPage() {
  const totalSteps = categories.reduce((s, c) => s + c.steps.length, 0);
  const doneSteps = categories.reduce((s, c) => s + c.steps.filter((st) => st.status === "done").length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Code className="h-6 w-6 text-primary" />
          Documentação do Projeto
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Resumo de todas as funcionalidades implementadas, organizadas por categoria e passo a passo.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{categories.length}</p>
          <p className="text-xs text-muted-foreground">Categorias</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totalSteps}</p>
          <p className="text-xs text-muted-foreground">Funcionalidades</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{doneSteps}</p>
          <p className="text-xs text-muted-foreground">Implementadas</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{Math.round((doneSteps / totalSteps) * 100)}%</p>
          <p className="text-xs text-muted-foreground">Progresso</p>
        </Card>
      </div>

      {/* Security summary */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Status de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span> RLS ativo em todas as 13+ tabelas
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span> Login exclusivo via Google OAuth
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span> Verificação de admin server-side (has_role)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span> CSP configurado no HTML
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span> Validação de inputs na Edge Function
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span> Secrets gerenciados via Lovable Cloud
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span> Edge Function pública (by design — simulador)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span> Insert anônimo em simulations_log (by design)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <ScrollArea className="h-auto">
        <div className="space-y-3">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
