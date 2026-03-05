import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Building2, MapPin, LogOut, Truck, LayoutDashboard, Users, CarFront, Package, Zap, FileText, Code, ImageIcon, UsersRound,
  Ruler, TrendingUp, Percent, Activity, Home, Calculator
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Pedidos", icon: Package },
];

const freteNav = [
  { to: "/admin/filial", label: "Filial", icon: Home },
  { to: "/admin/cities", label: "Cidades Atendidas", icon: Building2 },
  { to: "/admin/km-tiers", label: "Tabela de KM", icon: Ruler },
  { to: "/admin/multipliers", label: "Multiplicadores", icon: TrendingUp },
  { to: "/admin/smart-margin", label: "Margem Inteligente", icon: Percent },
  { to: "/admin/car-additionals", label: "Adicionais Carro", icon: CarFront },
  { to: "/admin/simulations-log", label: "Log de Simulações", icon: Activity },
  { to: "/admin/rules", label: "Regras Dinâmicas", icon: Zap },
  { to: "/admin/pricing-log", label: "Log de Alterações", icon: FileText },
];

const teamNav = [
  { to: "/admin/drivers", label: "Motoristas", icon: CarFront },
  { to: "/admin/clients", label: "Clientes", icon: Users },
  { to: "/admin/collaborators", label: "Colaboradores", icon: UsersRound },
];

const otherNav = [
  { to: "/admin/external-codes", label: "Códigos Externos", icon: Code },
  { to: "/admin/service-photos", label: "Fotos Serviços", icon: ImageIcon },
];

type NavItem = { to: string; label: string; icon: React.ElementType; exact?: boolean };

export default function AdminLayout() {
  const { signOut } = useAuth();
  const location = useLocation();

  const isActive = (item: NavItem) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  const NavGroup = ({ title, items }: { title: string; items: NavItem[] }) => (
    <div className="space-y-1">
      <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Link key={item.to} to={item.to}>
            <Button
              variant={isActive(item) ? "default" : "outline"}
              size="sm"
              className={cn("gap-1 text-xs")}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold">Frete Garça - Admin</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm">Simulador</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-1 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <nav className="mb-6 space-y-3">
          <NavGroup title="Geral" items={mainNav} />
          <NavGroup title="Configurações de Frete" items={freteNav} />
          <NavGroup title="Equipe" items={teamNav} />
          <NavGroup title="Outros" items={otherNav} />
        </nav>
        <Outlet />
      </div>
    </div>
  );
}
