import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Settings, LogOut, Truck, LayoutDashboard, Users, CarFront, Package, Zap, FileText, Code } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Pedidos", icon: Package },
  { to: "/admin/cities", label: "Cidades", icon: Building2 },
  { to: "/admin/neighborhoods", label: "Bairros", icon: MapPin },
  { to: "/admin/settings", label: "Valores", icon: Settings },
  { to: "/admin/rules", label: "Regras Dinâmicas", icon: Zap },
  { to: "/admin/pricing-log", label: "Log de Alterações", icon: FileText },
  { to: "/admin/drivers", label: "Motoristas", icon: CarFront },
  { to: "/admin/clients", label: "Clientes", icon: Users },
  { to: "/admin/external-codes", label: "Códigos Externos", icon: Code },
];

export default function AdminLayout() {
  const { signOut } = useAuth();
  const location = useLocation();

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

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
        <nav className="mb-6 flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to}>
              <Button
                variant={isActive(item) ? "default" : "outline"}
                size="sm"
                className={cn("gap-1")}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
        <Outlet />
      </div>
    </div>
  );
}
