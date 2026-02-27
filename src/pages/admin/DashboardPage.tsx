import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, MousePointerClick, Truck, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface DashboardStats {
  totalSimulations: number;
  totalOrders: number;
  conversionRate: number;
  todaySimulations: number;
  todayOrders: number;
  totalClicks: number;
  recentSimulations: Array<{
    id: string;
    origin_city: string | null;
    destination_city: string | null;
    vehicle_type: string;
    final_value: number | null;
    created_at: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSimulations: 0,
    totalOrders: 0,
    conversionRate: 0,
    todaySimulations: 0,
    todayOrders: 0,
    totalClicks: 0,
    recentSimulations: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [simRes, ordersRes, todaySimRes, todayOrdRes, clicksRes, recentRes] = await Promise.all([
      supabase.from("simulations_log").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("simulations_log").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "button_click"),
      supabase.from("simulations_log").select("*").order("created_at", { ascending: false }).limit(10),
    ]);

    const totalSim = simRes.count || 0;
    const totalOrd = ordersRes.count || 0;

    setStats({
      totalSimulations: totalSim,
      totalOrders: totalOrd,
      conversionRate: totalSim > 0 ? (totalOrd / totalSim) * 100 : 0,
      todaySimulations: todaySimRes.count || 0,
      todayOrders: todayOrdRes.count || 0,
      totalClicks: clicksRes.count || 0,
      recentSimulations: recentRes.data || [],
    });
    setLoading(false);
  };

  const metricCards = [
    {
      title: "Total Simulações",
      value: stats.totalSimulations,
      icon: BarChart3,
      subtitle: `${stats.todaySimulations} hoje`,
      trend: stats.todaySimulations > 0,
    },
    {
      title: "Pedidos Confirmados",
      value: stats.totalOrders,
      icon: Truck,
      subtitle: `${stats.todayOrders} hoje`,
      trend: stats.todayOrders > 0,
    },
    {
      title: "Taxa de Conversão",
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      subtitle: "Simulações → Pedidos",
      trend: stats.conversionRate > 5,
    },
    {
      title: "Cliques Estratégicos",
      value: stats.totalClicks,
      icon: MousePointerClick,
      subtitle: "Total de cliques rastreados",
      trend: stats.totalClicks > 0,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando métricas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                {card.trend ? (
                  <ArrowUpRight className="h-3 w-3 text-primary" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-muted-foreground" />
                )}
                {card.subtitle}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Simulations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Simulações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentSimulations.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhuma simulação registrada.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentSimulations.map((sim) => (
                <div key={sim.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">
                      {sim.origin_city || "—"} → {sim.destination_city || "—"}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{sim.vehicle_type}</span>
                      <span>•</span>
                      <span>{new Date(sim.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-primary">
                      {sim.final_value ? `R$ ${Number(sim.final_value).toFixed(2)}` : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
