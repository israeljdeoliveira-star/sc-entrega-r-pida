import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface LogEntry {
  id: string;
  changed_by: string | null;
  table_name: string | null;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export default function PricingLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    supabase.from("pricing_change_log").select("*").order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => { if (data) setLogs(data as LogEntry[]); });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log de Alterações de Preços</CardTitle>
        <CardDescription>Histórico de todas as alterações feitas nas configurações de precificação</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma alteração registrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Campo</TableHead>
                <TableHead>Valor Anterior</TableHead>
                <TableHead>Novo Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-xs font-mono">{log.table_name}</TableCell>
                  <TableCell className="text-xs font-mono">{log.field_name}</TableCell>
                  <TableCell className="text-xs">{log.old_value}</TableCell>
                  <TableCell className="text-xs font-medium">{log.new_value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
