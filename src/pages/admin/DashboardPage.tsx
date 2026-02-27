import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart3, TrendingUp, Users, MousePointerClick, Truck, ArrowUpRight, ArrowDownRight, DollarSign, UserCheck, Activity, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface DailyData { date: string; count: number }

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [totalSimulations, setTotalSimulations] = useState(0);
  const [todaySimulations, setTodaySimulations] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [avgTicket, setAvgTicket] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [activeDrivers, setActiveDrivers] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [retention7, setRetention7] = useState(0);
  const [retention15, setRetention15] = useState(0);
  const [retention30, setRetention30] = useState(0);
  const [dailySimulations, setDailySimulations] = useState<DailyData[]>([]);
  const [dailyOrders, setDailyOrders] = useState<DailyData[]>([]);
  const [trafficSources, setTrafficSources] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const days30Ago = new Date(today); days30Ago.setDate(days30Ago.getDate() - 30);

    const [simRes, ordRes, todaySimRes, todayOrdRes, clicksRes, ordersDataRes, simsLast30, profilesRes, driversRes, analyticsRes] = await Promise.all([
      supabase.from("simulations_log").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("simulations_log").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "button_click"),
      supabase.from("orders").select("final_value, created_at").not("final_value", "is", null),
      supabase.from("simulations_log").select("created_at").gte("created_at", days30Ago.toISOString()),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("drivers").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("analytics_events").select("page, created_at").gte("created_at", days30Ago.toISOString()),
    ]);

    const totalSim = simRes.count || 0;
    const totalOrd = ordRes.count || 0;

    setTotalSimulations(totalSim);
    setTotalOrders(totalOrd);
    setTodaySimulations(todaySimRes.count || 0);
    setTodayOrders(todayOrdRes.count || 0);
    setTotalClicks(clicksRes.count || 0);
    setActiveUsers(profilesRes.count || 0);
    setActiveDrivers(driversRes.count || 0);
    setConversionRate(totalSim > 0 ? (totalOrd / totalSim) * 100 : 0);

    // Avg ticket
    const ordersData = ordersDataRes.data || [];
    if (ordersData.length > 0) {
      const sum = ordersData.reduce((acc, o) => acc + Number(o.final_value || 0), 0);
      setAvgTicket(sum / ordersData.length);
    }

    // Daily simulations (last 30 days)
    const simsData = simsLast30.data || [];
    const simsByDay = groupByDay(simsData.map(s => s.created_at), 30);
    setDailySimulations(simsByDay);

    // Daily orders (last 30 days)
    const ordersByDay = groupByDay(ordersData.map(o => o.created_at), 30);
    setDailyOrders(ordersByDay);

    // Retention: unique users who came back within 7, 15, 30 days
    const analyticsData = analyticsRes.data || [];
    const pagesByDay = new Map<string, Set<string>>();
    analyticsData.forEach(e => {
      const day = e.created_at.substring(0, 10);
      if (!pagesByDay.has(day)) pagesByDay.set(day, new Set());
      pagesByDay.get(day)!.add(e.page || "/");
    });
    const totalDays = pagesByDay.size;
    const calcRetention = (daysWindow: number) => {
      if (totalDays <= 1) return 0;
      const entries = Array.from(pagesByDay.entries()).sort();
      const windowEntries = entries.slice(-daysWindow);
      if (windowEntries.length <= 1) return 0;
      const firstDayPages = windowEntries[0][1];
      let returned = 0;
      firstDayPages.forEach(page => {
        for (let i = 1; i < windowEntries.length; i++) {
          if (windowEntries[i][1].has(page)) { returned++; break; }
        }
      });
      return firstDayPages.size > 0 ? (returned / firstDayPages.size) * 100 : 0;
    };
    setRetention7(calcRetention(7));
    setRetention15(calcRetention(15));
    setRetention30(calcRetention(30));

    // Traffic sources from page field
    const pageCounts = new Map<string, number>();
    analyticsData.forEach(e => {
      const page = e.page || "Direto";
      pageCounts.set(page, (pageCounts.get(page) || 0) + 1);
    });
    const sources = Array.from(pageCounts.entries())
      .map(([name, value]) => ({ name: name === "/" ? "Home" : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    setTrafficSources(sources);

    setLoading(false);
  };

  const groupByDay = (dates: string[], days: number): DailyData[] => {
    const map = new Map<string, number>();
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      map.set(d.toISOString().substring(0, 10), 0);
    }
    dates.forEach(dt => {
      const day = dt.substring(0, 10);
      if (map.has(day)) map.set(day, (map.get(day) || 0) + 1);
    });
    return Array.from(map.entries()).map(([date, count]) => ({
      date: `${date.substring(8, 10)}/${date.substring(5, 7)}`,
      count,
    }));
  };

  const PIE_COLORS = [
    "hsl(217, 91%, 50%)",
    "hsl(217, 91%, 65%)",
    "hsl(215, 25%, 45%)",
    "hsl(215, 20%, 60%)",
    "hsl(217, 50%, 75%)",
    "hsl(215, 16%, 70%)",
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
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Simulações", value: totalSimulations, sub: `${todaySimulations} hoje`, icon: BarChart3, trend: todaySimulations > 0 },
          { title: "Corridas Fechadas", value: totalOrders, sub: `${todayOrders} hoje`, icon: Truck, trend: todayOrders > 0 },
          { title: "Ticket Médio", value: `R$ ${avgTicket.toFixed(2)}`, sub: "Valor médio por pedido", icon: DollarSign, trend: avgTicket > 0 },
          { title: "Taxa de Conversão", value: `${conversionRate.toFixed(1)}%`, sub: "Simulações → Pedidos", icon: TrendingUp, trend: conversionRate > 5 },
        ].map(c => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                {c.trend ? <ArrowUpRight className="h-3 w-3 text-primary" /> : <ArrowDownRight className="h-3 w-3 text-muted-foreground" />}
                {c.sub}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Usuários Ativos", value: activeUsers, icon: Users },
          { title: "Motoristas Ativos", value: activeDrivers, icon: UserCheck },
          { title: "Cliques Estratégicos", value: totalClicks, icon: MousePointerClick },
          { title: "Retenção 7d", value: `${retention7.toFixed(0)}%`, icon: RefreshCw },
        ].map(c => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Retention Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Retenção 7 dias", value: retention7 },
          { label: "Retenção 15 dias", value: retention15 },
          { label: "Retenção 30 dias", value: retention30 },
        ].map(r => (
          <Card key={r.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{r.label}</span>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-3xl font-bold text-primary">{r.value.toFixed(1)}%</div>
              <div className="mt-2 h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Math.min(r.value, 100)}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Simulations Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Simulações por Dia</CardTitle>
            <CardDescription>Últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: "Simulações", color: "hsl(var(--primary))" } }} className="h-[260px] w-full">
              <BarChart data={dailySimulations}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Daily Orders Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Corridas Fechadas por Dia</CardTitle>
            <CardDescription>Últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: "Corridas", color: "hsl(var(--primary))" } }} className="h-[260px] w-full">
              <LineChart data={dailyOrders}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Origem de Tráfego</CardTitle>
          <CardDescription>Distribuição de acessos por página (últimos 30 dias)</CardDescription>
        </CardHeader>
        <CardContent>
          {trafficSources.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Sem dados de tráfego ainda.</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2 items-center">
              <ChartContainer config={{ value: { label: "Acessos" } }} className="h-[220px] w-full">
                <PieChart>
                  <Pie data={trafficSources} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {trafficSources.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="space-y-2">
                {trafficSources.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
