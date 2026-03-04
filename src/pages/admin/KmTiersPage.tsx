import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Ruler } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface KmTier {
  id: string;
  km_ate: number;
  valor: number;
}

export default function KmTiersPage() {
  const [tiers, setTiers] = useState<KmTier[]>([]);
  const [kmAte, setKmAte] = useState("");
  const [valor, setValor] = useState("");
  const [editing, setEditing] = useState<KmTier | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchTiers = async () => {
    const { data } = await supabase.from("km_tiers").select("*").order("km_ate");
    if (data) setTiers(data as unknown as KmTier[]);
  };

  useEffect(() => { fetchTiers(); }, []);

  const handleSave = async () => {
    if (!kmAte || !valor) return;
    const payload = { km_ate: parseFloat(kmAte), valor: parseFloat(valor) };

    if (editing) {
      const { error } = await supabase.from("km_tiers").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("km_tiers").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    }

    setKmAte(""); setValor(""); setEditing(null); setDialogOpen(false);
    fetchTiers();
    toast({ title: editing ? "Faixa atualizada!" : "Faixa adicionada!" });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("km_tiers").delete().eq("id", id);
    fetchTiers();
    toast({ title: "Faixa removida!" });
  };

  const openEdit = (tier: KmTier) => {
    setEditing(tier);
    setKmAte(String(tier.km_ate));
    setValor(String(tier.valor));
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setKmAte("");
    setValor("");
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tabela de Quilometragem</h2>
        <p className="text-muted-foreground">
          Defina faixas progressivas de preço por KM. O sistema encontra a primeira faixa onde a distância se encaixa.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Ruler className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Faixas de KM</CardTitle>
              <CardDescription className="text-xs">A distância é comparada com "Até KM" — usa a primeira faixa que se encaixa</CardDescription>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Nova Faixa</Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>{editing ? "Editar Faixa" : "Nova Faixa"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Até quantos KM</Label>
                  <Input type="number" step="0.1" value={kmAte} onChange={e => setKmAte(e.target.value)} placeholder="Ex: 5" />
                  <p className="text-xs text-muted-foreground">A faixa cobre distâncias até esse valor em KM</p>
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="Ex: 20.00" />
                </div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {tiers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma faixa cadastrada. Adicione as faixas de preço por KM.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Até (KM)</TableHead>
                  <TableHead>Valor (R$)</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier) => (
                  <TableRow key={tier.id}>
                    <TableCell className="font-medium">{tier.km_ate} km</TableCell>
                    <TableCell>R$ {tier.valor.toFixed(2)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(tier)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(tier.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {tiers.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p className="font-medium mb-1">Como funciona:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>O sistema procura a primeira faixa onde a distância ≤ "Até KM"</li>
                <li>Se a distância exceder todas as faixas, usa o valor da última</li>
                <li>Exemplo: 3 km → faixa "Até 5 km" = R$ {tiers.find(t => t.km_ate >= 3)?.valor.toFixed(2) || "..."}</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
