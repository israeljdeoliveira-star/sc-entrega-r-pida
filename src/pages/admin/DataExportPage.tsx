import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle2, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EXPORTABLE_TABLES = [
  { name: "analytics_events", label: "Eventos Analytics" },
  { name: "cities", label: "Cidades" },
  { name: "drivers", label: "Motoristas" },
  { name: "dynamic_rules", label: "Regras Dinâmicas" },
  { name: "filial_config", label: "Configuração Filial" },
  { name: "freight_settings", label: "Configurações de Frete" },
  { name: "km_tiers", label: "Tabela de KM" },
  { name: "neighborhoods", label: "Bairros" },
  { name: "orders", label: "Pedidos" },
  { name: "pricing_change_log", label: "Log de Alterações de Preço" },
  { name: "pricing_cost_inputs", label: "Custos de Precificação" },
  { name: "pricing_simulations", label: "Simulações de Precificação" },
  { name: "profiles", label: "Perfis de Usuários" },
  { name: "served_states", label: "Estados Atendidos" },
  { name: "service_photos", label: "Fotos de Serviços" },
  { name: "simulations_log", label: "Log de Simulações" },
  { name: "site_settings", label: "Configurações do Site" },
  { name: "user_roles", label: "Roles de Usuários" },
  { name: "vehicle_profiles", label: "Perfis de Veículos" },
] as const;

function toCsv(data: Record<string, unknown>[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      const str = val === null || val === undefined ? "" : typeof val === "object" ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataExportPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [exported, setExported] = useState<Set<string>>(new Set());
  const [exportingAll, setExportingAll] = useState(false);

  const exportTable = async (tableName: string) => {
    setLoading(tableName);
    try {
      const { data, error } = await (supabase.from(tableName as any).select("*") as any);
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "Tabela vazia", description: `A tabela "${tableName}" não possui registros.` });
        setLoading(null);
        return;
      }
      const csv = toCsv(data as Record<string, unknown>[]);
      downloadCsv(csv, `${tableName}_${new Date().toISOString().slice(0, 10)}.csv`);
      setExported((prev) => new Set(prev).add(tableName));
      toast({ title: "Exportado!", description: `${data.length} registros de "${tableName}".` });
    } catch (e: any) {
      toast({ title: "Erro ao exportar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const exportAll = async () => {
    setExportingAll(true);
    for (const table of EXPORTABLE_TABLES) {
      await exportTable(table.name);
    }
    setExportingAll(false);
    toast({ title: "Exportação completa", description: "Todos os CSVs foram baixados." });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Exportar Dados (CSV)
        </CardTitle>
        <CardDescription>
          Exporte todos os dados do banco de dados em formato CSV. Cada tabela gera um arquivo separado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={exportAll} disabled={exportingAll || !!loading} className="w-full sm:w-auto">
          {exportingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {exportingAll ? "Exportando tudo..." : "Exportar Todas as Tabelas"}
        </Button>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {EXPORTABLE_TABLES.map((table) => (
            <Button
              key={table.name}
              variant="outline"
              size="sm"
              className="justify-start gap-2 text-xs"
              disabled={!!loading || exportingAll}
              onClick={() => exportTable(table.name)}
            >
              {loading === table.name ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : exported.has(table.name) ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {table.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
