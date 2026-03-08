import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Building2, LogOut, Truck, LayoutDashboard, Users, CarFront, Package, Zap, FileText, Code, ImageIcon, UsersRound,
  Ruler, TrendingUp, Percent, Activity, Home, Calculator, DatabaseBackup
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  desc: string;
};

const geralNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, desc: "Visão geral do sistema e métricas" },
  { to: "/admin/orders", label: "Pedidos", icon: Package, desc: "Gerenciar pedidos recebidos" },
];

const precificacaoNav: NavItem[] = [
  { to: "/admin/filial", label: "Filial", icon: Home, desc: "Define o ponto base — impacta cálculo de deslocamento" },
  { to: "/admin/km-tiers", label: "Tabela de KM", icon: Ruler, desc: "Faixas de preço por distância (moto)" },
  { to: "/admin/multipliers", label: "Multiplicadores", icon: TrendingUp, desc: "Ajustes por condições: chuva, noturno, etc." },
  { to: "/admin/smart-margin", label: "Margem Inteligente", icon: Percent, desc: "Lucro automático por nível de risco" },
  { to: "/admin/car-pricing", label: "Precificação Carro", icon: Calculator, desc: "Custo/km baseado em perfil veicular" },
  { to: "/admin/car-additionals", label: "Adicionais Carro", icon: CarFront, desc: "Taxas extras: ajudante, escada, etc." },
];

const coberturaNav: NavItem[] = [
  { to: "/admin/cities", label: "Cidades Atendidas", icon: Building2, desc: "Restringe seleção de cidade no simulador moto" },
];

const regrasNav: NavItem[] = [
  { to: "/admin/rules", label: "Regras Dinâmicas", icon: Zap, desc: "Regras automáticas de preço por condições" },
  { to: "/admin/simulations-log", label: "Log de Simulações", icon: Activity, desc: "Histórico de todas as simulações feitas" },
  { to: "/admin/pricing-log", label: "Log de Alterações", icon: FileText, desc: "Registro de mudanças nas configurações" },
];

const equipeNav: NavItem[] = [
  { to: "/admin/drivers", label: "Motoristas", icon: CarFront, desc: "Cadastro e gestão de motoristas" },
  { to: "/admin/clients", label: "Clientes", icon: Users, desc: "Base de clientes" },
  { to: "/admin/collaborators", label: "Colaboradores", icon: UsersRound, desc: "Equipe interna" },
];

const outrosNav: NavItem[] = [
  { to: "/admin/external-codes", label: "Códigos Externos", icon: Code, desc: "Scripts e tags de terceiros" },
  { to: "/admin/service-photos", label: "Fotos Serviços", icon: ImageIcon, desc: "Carrossel de fotos na landing page" },
  { to: "/admin/data-export", label: "Exportar Dados", icon: DatabaseBackup, desc: "Download de dados do sistema" },
];

const groups = [
  { title: "Geral", items: geralNav },
  { title: "Precificação Frete", items: precificacaoNav },
  { title: "Cobertura", items: coberturaNav },
  { title: "Regras & Logs", items: regrasNav },
  { title: "Equipe", items: equipeNav },
  { title: "Outros", items: outrosNav },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isActive = (item: NavItem) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-2">
        <TooltipProvider delayDuration={300}>
          {groups.map((group) => {
            const hasActive = group.items.some(isActive);
            return (
              <SidebarGroup key={group.title} defaultOpen={hasActive}>
                <SidebarGroupLabel className="text-xs uppercase tracking-wider">{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.to}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.to}
                                end={item.exact}
                                className="hover:bg-muted/50"
                                activeClassName="bg-primary/10 text-primary font-medium"
                              >
                                <item.icon className="mr-2 h-4 w-4 shrink-0" />
                                {!collapsed && (
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-sm truncate">{item.label}</span>
                                    <span className="text-[10px] text-muted-foreground truncate leading-tight">{item.desc}</span>
                                  </div>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          {collapsed && (
                            <TooltipContent side="right" className="max-w-[200px]">
                              <p className="font-medium text-sm">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </TooltipProvider>
      </SidebarContent>
    </Sidebar>
  );
}

export default function AdminLayout() {
  const { signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="mr-1" />
              <Truck className="h-5 w-5 text-primary" />
              <h1 className="text-base font-bold hidden sm:block">Frete Garça — Admin</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/">
                <Button variant="ghost" size="sm">Simulador</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="mr-1 h-4 w-4" /> Sair
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
