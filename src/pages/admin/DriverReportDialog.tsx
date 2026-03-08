import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Package, TrendingUp, MapPin, Clock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type Driver = Tables<"drivers">;

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  assigned: { label: "Atribuído", variant: "outline" },
  in_transit: { label: "Em Trânsito", variant: "default" },
  delivered: { label: "Entregue", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function getMonthOptions() {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return opts;
}

interface Props {
  driver: Driver | null;
  open: boolean;
  onClose: () => void;
  comissaoPct: number;
}

export default function DriverReportDialog({ driver, open, onClose, comissaoPct }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const monthOptions = useMemo(getMonthOptions, []);

  useEffect(() => {
    if (!driver || !open) return;
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1).toISOString();
    const end = new Date(year, m, 1).toISOString();

    setLoading(true);
    supabase
      .from("orders")
      .select("*")
      .eq("driver_id", driver.id)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders(data || []);
        setLoading(false);
      });
  }, [driver, open, month]);

  const stats = useMemo(() => {
    const delivered = orders.filter(o => o.status === "delivered");
    const active = orders.filter(o => ["assigned", "in_transit", "delivered"].includes(o.status));
    const totalReceita = active.reduce((s, o) => s + Number(o.final_value || 0), 0);
    const totalKm = active.reduce((s, o) => s + Number(o.distance_km || 0), 0);
    const comissao = totalReceita * (comissaoPct / 100);
    return {
      total: orders.length,
      delivered: delivered.length,
      cancelled: orders.filter(o => o.status === "cancelled").length,
      totalReceita,
      totalKm,
      comissao,
      ticketMedio: active.length > 0 ? totalReceita / active.length : 0,
    };
  }, [orders, comissaoPct]);

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Relatório — {driver.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="capitalize">{driver.vehicle_type === "car" ? "🚗 Carro" : "🛵 Moto"}</Badge>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : (
          <>
            {/* KPI Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MiniKpi icon={Package} label="Entregas" value={String(stats.delivered)} />
              <MiniKpi icon={DollarSign} label="Receita" value={`R$ ${stats.totalReceita.toFixed(2)}`} />
              <MiniKpi icon={TrendingUp} label="Comissão" value={`R$ ${stats.comissao.toFixed(2)}`} accent />
              <MiniKpi icon={MapPin} label="Km Total" value={`${stats.totalKm.toFixed(0)} km`} />
            </div>

            <div className="text-xs text-muted-foreground mb-3">
              Ticket médio: R$ {stats.ticketMedio.toFixed(2)} • {stats.total} pedidos totais • {stats.cancelled} cancelados
            </div>

            {/* Orders list */}
            {orders.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">Nenhum pedido neste período.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Rota</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(o => {
                    const st = STATUS_MAP[o.status] || STATUS_MAP.pending;
                    const val = Number(o.final_value || 0);
                    const com = val * (comissaoPct / 100);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(o.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {o.origin_city || "—"} → {o.destination_city || "—"}
                        </TableCell>
                        <TableCell><Badge variant={st.variant} className="text-xs">{st.label}</Badge></TableCell>
                        <TableCell className="text-right font-medium">R$ {val.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-primary">R$ {com.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MiniKpi({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className={`text-sm font-bold ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
