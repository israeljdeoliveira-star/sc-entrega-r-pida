import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface DynamicRule {
  id: string;
  name: string;
  condition_type: string;
  multiplier: number;
  is_active: boolean;
  created_at: string;
}

const conditionTypes = [
  { value: "peak_hour", label: "Horário de Pico" },
  { value: "weekend", label: "Final de Semana" },
  { value: "weather", label: "Clima" },
  { value: "demand", label: "Demanda" },
];

export default function DynamicRulesPage() {
  const [rules, setRules] = useState<DynamicRule[]>([]);
  const [name, setName] = useState("");
  const [conditionType, setConditionType] = useState("peak_hour");
  const [multiplier, setMultiplier] = useState("1.5");
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const fetchRules = async () => {
    const { data } = await supabase.from("dynamic_rules").select("*").order("created_at", { ascending: false });
    if (data) setRules(data as DynamicRule[]);
  };

  useEffect(() => { fetchRules(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) { toast({ title: "Informe o nome da regra", variant: "destructive" }); return; }
    setAdding(true);
    const { error } = await supabase.from("dynamic_rules").insert([{
      name: name.trim(),
      condition_type: conditionType,
      multiplier: parseFloat(multiplier) || 1.0,
      is_active: false,
    }]);
    setAdding(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setName(""); setMultiplier("1.5");
    fetchRules();
    toast({ title: "Regra criada!" });
  };

  const toggleActive = async (rule: DynamicRule) => {
    await supabase.from("dynamic_rules").update({ is_active: !rule.is_active }).eq("id", rule.id);
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    await supabase.from("dynamic_rules").delete().eq("id", id);
    fetchRules();
    toast({ title: "Regra removida" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova Regra Dinâmica</CardTitle>
          <CardDescription>Crie regras de multiplicador para ajustar preços dinamicamente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pico noturno" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Condição</Label>
              <Select value={conditionType} onValueChange={setConditionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {conditionTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Multiplicador</Label>
              <Input type="number" step="0.1" min="0.1" value={multiplier} onChange={e => setMultiplier(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} disabled={adding} className="w-full gap-1">
                <Plus className="h-4 w-4" /> {adding ? "Criando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regras Ativas</CardTitle>
          <CardDescription>Regras ativas são multiplicadas juntas no cálculo final</CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma regra dinâmica cadastrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Condição</TableHead>
                  <TableHead>Multiplicador</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>{conditionTypes.find(t => t.value === rule.condition_type)?.label || rule.condition_type}</TableCell>
                    <TableCell>{rule.multiplier}x</TableCell>
                    <TableCell>
                      <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule)} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
