import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface SimLog {
  id: string;
  created_at: string;
  origin_city: string | null;
  destination_city: string | null;
  vehicle_type: string;
  mode: string;
  distance_km: number | null;
  final_value: number | null;
  operational_value: number | null;
  margin_applied: number | null;
  config_snapshot: any;
}

export default function SimulationsLogPage() {
  const [logs, setLogs] = useState<SimLog[]>([]);

  useEffect(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    supabase
      .from("simulations_log")
      .select("id, created_at, origin_city, destination_city, vehicle_type, mode, distance_km, final_value, operational_value, margin_applied, config_snapshot")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (data) setLogs(data as SimLog[]);
      });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log de Simulações</CardTitle>
        <p className="text-sm text-muted-foreground">Simulações dos últimos 30 dias. Registros mais antigos são removidos automaticamente.</p>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma simulação registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead className="text-right">Distância</TableHead>
                  <TableHead className="text-right">V. Operacional</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">V. Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM/yy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm">{log.origin_city || "—"}</TableCell>
                    <TableCell className="text-sm">{log.destination_city || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={log.vehicle_type === "moto" ? "default" : "secondary"}>
                        {log.vehicle_type === "moto" ? "Moto" : "Carro"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{log.distance_km?.toFixed(1) ?? "—"} km</TableCell>
                    <TableCell className="text-right">
                      {log.operational_value != null ? `R$ ${log.operational_value.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.margin_applied != null ? `${log.margin_applied.toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {log.final_value != null ? `R$ ${log.final_value.toFixed(2)}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
