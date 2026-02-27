import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Package, Search, Truck, Clock, CheckCircle2, XCircle, ArrowUpDown } from "lucide-react";
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

const NEXT_STATUS: Record<string, string> = {
  pending: "assigned",
  assigned: "in_transit",
  in_transit: "delivered",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [ordRes, drvRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("drivers").select("*").eq("is_active", true).order("name"),
    ]);
    setOrders(ordRes.data || []);
    setDrivers(drvRes.data || []);
    setLoading(false);
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "delivered") updates.confirmed_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Status atualizado" });
    fetchData();
  };

  const assignDriver = async (orderId: string, driverId: string) => {
    const { error } = await supabase.from("orders").update({ driver_id: driverId, status: "assigned" }).eq("id", orderId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Motorista atribuído" });
    fetchData();
  };

  const filtered = orders.filter(o => {
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (o.client_name?.toLowerCase().includes(q) || o.origin_city?.toLowerCase().includes(q) || o.destination_city?.toLowerCase().includes(q) || o.client_phone?.includes(q));
    }
    return true;
  });

  const getDriverName = (id: string | null) => drivers.find(d => d.id === id)?.name || "—";

  if (loading) return <div className="flex justify-center py-12"><p className="text-muted-foreground">Carregando pedidos...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Package className="h-5 w-5" /> Gestão de Pedidos</h2>
          <p className="text-sm text-muted-foreground">{orders.length} pedidos no total</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-48" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum pedido encontrado.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const status = STATUS_MAP[order.status] || STATUS_MAP.pending;
            const next = NEXT_STATUS[order.status];
            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{order.client_name || "Cliente anônimo"}</span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.origin_city || "—"} → {order.destination_city || "—"}
                        {order.distance_km ? ` • ${Number(order.distance_km).toFixed(0)} km` : ""}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        {order.client_phone && <span>📞 {order.client_phone}</span>}
                        <span>{new Date(order.created_at).toLocaleString("pt-BR")}</span>
                        {order.vehicle_type && <span className="capitalize">{order.vehicle_type}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Driver assignment */}
                      {order.status === "pending" && (
                        <Select onValueChange={(dId) => assignDriver(order.id, dId)}>
                          <SelectTrigger className="w-40"><SelectValue placeholder="Atribuir motorista" /></SelectTrigger>
                          <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}

                      {order.driver_id && order.status !== "pending" && (
                        <span className="text-sm flex items-center gap-1 text-muted-foreground">
                          <Truck className="h-3.5 w-3.5" /> {getDriverName(order.driver_id)}
                        </span>
                      )}

                      {/* Advance status */}
                      {next && (
                        <Button size="sm" onClick={() => updateStatus(order.id, next)} className="gap-1">
                          <ArrowUpDown className="h-3.5 w-3.5" /> {STATUS_MAP[next].label}
                        </Button>
                      )}

                      {order.status !== "cancelled" && order.status !== "delivered" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, "cancelled")} className="gap-1 text-destructive">
                          <XCircle className="h-3.5 w-3.5" /> Cancelar
                        </Button>
                      )}

                      <span className="font-bold text-primary text-lg">
                        {order.final_value ? `R$ ${Number(order.final_value).toFixed(2)}` : "—"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
