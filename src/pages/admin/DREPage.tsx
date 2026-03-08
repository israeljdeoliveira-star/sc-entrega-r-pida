import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign, Truck, Package, Percent } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type Driver = Tables<"drivers">;

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function getMonthOptions() {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return opts;
}

export default function DREPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);

  const monthOptions = useMemo(getMonthOptions, []);

  useEffect(() => {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1).toISOString();
    const end = new Date(year, m, 1).toISOString();

    setLoading(true);
    Promise.all([
      supabase.from("orders").select("*").gte("created_at", start).lt("created_at", end).order("created_at", { ascending: false }),
      supabase.from("drivers").select("*"),
      supabase.from("freight_settings").select("*").limit(1).single(),
    ]).then(([ordRes, drvRes, setRes]) => {
      setOrders(ordRes.data || []);
      setDrivers(drvRes.data || []);
      setSettings(setRes.data);
      setLoading(false);
    });
  }, [month]);

  const driverMap = useMemo(() => {
    const m: Record<string, Driver> = {};
    drivers.forEach(d => { m[d.id] = d; });
    return m;
  }, [drivers]);

  const stats = useMemo(() => {
    const delivered = orders.filter(o => o.status === "delivered");
    const assigned = orders.filter(o => ["assigned", "in_transit", "delivered"].includes(o.status));
    const cancelled = orders.filter(o => o.status === "cancelled");
    const pending = orders.filter(o => o.status === "pending");

    const receitaBruta = assigned.reduce((s, o) => s + Number(o.final_value || 0), 0);
    const receitaEntregue = delivered.reduce((s, o) => s + Number(o.final_value || 0), 0);

    // Estimated costs based on commission settings
    const comissaoCarro = Number(settings?.comissao_carro || 15) / 100;
    const comissaoMoto = Number(settings?.comissao_moto || 15) / 100;

    let custoComissoes = 0;
    const driverStats: Record<string, { name: string; entregas: number; receita: number; comissao: number }> = {};

    assigned.forEach(o => {
      const isMoto = o.vehicle_type === "moto";
      const val = Number(o.final_value || 0);
      const comissao = val * (isMoto ? comissaoMoto : comissaoCarro);
      custoComissoes += comissao;

      if (o.driver_id) {
        if (!driverStats[o.driver_id]) {
          const drv = driverMap[o.driver_id];
          driverStats[o.driver_id] = { name: drv?.name || "Desconhecido", entregas: 0, receita: 0, comissao: 0 };
        }
        driverStats[o.driver_id].entregas += 1;
        driverStats[o.driver_id].receita += val;
        driverStats[o.driver_id].comissao += comissao;
      }
    });

    const lucroEstimado = receitaBruta - custoComissoes;
    const margemLucro = receitaBruta > 0 ? (lucroEstimado / receitaBruta) * 100 : 0;

    return {
      total: orders.length,
      delivered: delivered.length,
      assigned: assigned.length,
      cancelled: cancelled.length,
      pending: pending.length,
      receitaBruta,
      receitaEntregue,
      custoComissoes,
      lucroEstimado,
      margemLucro,
      driverStats: Object.values(driverStats).sort((a, b) => b.receita - a.receita),
      ticketMedio: assigned.length > 0 ? receitaBruta / assigned.length : 0,
    };
  }, [orders, settings, driverMap]);

  const fmt = (v: number) => `R$ ${v.toFixed(2)}`;

  if (loading) return <div className="flex justify-center py-12"><p className="text-muted-foreground">Carregando DRE...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5" /> DRE — Demonstrativo de Resultados</h2>
          <p className="text-sm text-muted-foreground">Visão financeira mensal da operação</p>
        </div>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Receita Bruta" value={fmt(stats.receitaBruta)} icon={DollarSign} accent />
        <KpiCard title="Comissões Motoristas" value={fmt(stats.custoComissoes)} icon={Truck} negative />
        <KpiCard title="Lucro Estimado" value={fmt(stats.lucroEstimado)} icon={stats.lucroEstimado >= 0 ? TrendingUp : TrendingDown} accent={stats.lucroEstimado >= 0} negative={stats.lucroEstimado < 0} />
        <KpiCard title="Margem de Lucro" value={`${stats.margemLucro.toFixed(1)}%`} icon={Percent} accent={stats.margemLucro >= 0} negative={stats.margemLucro < 0} />
      </div>

      {/* DRE Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demonstrativo Detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <DreRow label="Receita Bruta (pedidos atribuídos)" value={stats.receitaBruta} bold />
              <DreRow label="  Receita Entregue (confirmados)" value={stats.receitaEntregue} indent />
              <DreRow label="(-) Comissões Motoristas" value={-stats.custoComissoes} negative />
              <DreRow label="= Lucro Bruto Estimado" value={stats.lucroEstimado} bold accent />
              <TableRow className="border-t-2">
                <TableCell colSpan={2} />
              </TableRow>
              <DreRow label="Total de Pedidos" value={stats.total} isCount />
              <DreRow label="  Entregues" value={stats.delivered} isCount />
              <DreRow label="  Atribuídos/Em trânsito" value={stats.assigned - stats.delivered} isCount />
              <DreRow label="  Pendentes" value={stats.pending} isCount />
              <DreRow label="  Cancelados" value={stats.cancelled} isCount />
              <DreRow label="Ticket Médio" value={stats.ticketMedio} bold />
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-driver breakdown */}
      {stats.driverStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Resultado por Motorista</CardTitle>
            <CardDescription>Receita e comissão de cada motorista no período</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Motorista</TableHead>
                  <TableHead className="text-center">Entregas</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Lucro p/ Empresa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.driverStats.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-center">{d.entregas}</TableCell>
                    <TableCell className="text-right">{fmt(d.receita)}</TableCell>
                    <TableCell className="text-right text-destructive">{fmt(d.comissao)}</TableCell>
                    <TableCell className="text-right font-medium text-primary">{fmt(d.receita - d.comissao)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, accent, negative }: { title: string; value: string; icon: React.ElementType; accent?: boolean; negative?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium">{title}</span>
          <Icon className={`h-4 w-4 ${negative ? "text-destructive" : accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <p className={`text-xl font-bold ${negative ? "text-destructive" : accent ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function DreRow({ label, value, bold, indent, negative, accent, isCount }: {
  label: string; value: number; bold?: boolean; indent?: boolean; negative?: boolean; accent?: boolean; isCount?: boolean;
}) {
  const formatted = isCount ? String(value) : `R$ ${Math.abs(value).toFixed(2)}`;
  const prefix = !isCount && value < 0 ? "- " : "";
  return (
    <TableRow>
      <TableCell className={`${bold ? "font-bold" : ""} ${indent ? "pl-8 text-muted-foreground" : ""}`}>{label}</TableCell>
      <TableCell className={`text-right ${bold ? "font-bold" : ""} ${negative || value < 0 ? "text-destructive" : ""} ${accent && value >= 0 ? "text-primary" : ""}`}>
        {prefix}{formatted}
      </TableCell>
    </TableRow>
  );
}
