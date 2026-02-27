import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

type City = Tables<"cities">;
type Neighborhood = Tables<"neighborhoods">;

export default function NeighborhoodsPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<(Neighborhood & { cities: { name: string } | null })[]>([]);
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>("all");
  const [cityId, setCityId] = useState("");
  const [name, setName] = useState("");
  const [fee, setFee] = useState("0");
  const [editing, setEditing] = useState<Neighborhood | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchCities = async () => {
    const { data } = await supabase.from("cities").select("*").eq("is_active", true).order("name");
    if (data) setCities(data);
  };

  const fetchNeighborhoods = async () => {
    let query = supabase.from("neighborhoods").select("*, cities(name)").order("name");
    if (selectedCityFilter !== "all") query = query.eq("city_id", selectedCityFilter);
    const { data } = await query;
    if (data) setNeighborhoods(data as any);
  };

  useEffect(() => { fetchCities(); }, []);
  useEffect(() => { fetchNeighborhoods(); }, [selectedCityFilter]);

  const handleSave = async () => {
    if (!name.trim() || !cityId) return;
    if (editing) {
      const { error } = await supabase.from("neighborhoods").update({ name: name.trim(), city_id: cityId, additional_fee: parseFloat(fee) }).eq("id", editing.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("neighborhoods").insert({ name: name.trim(), city_id: cityId, additional_fee: parseFloat(fee) });
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    }
    setName(""); setCityId(""); setFee("0"); setEditing(null); setDialogOpen(false);
    fetchNeighborhoods();
    toast({ title: editing ? "Bairro atualizado!" : "Bairro cadastrado!" });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("neighborhoods").delete().eq("id", id);
    fetchNeighborhoods();
    toast({ title: "Bairro removido!" });
  };

  const openEdit = (n: Neighborhood) => {
    setEditing(n); setName(n.name); setCityId(n.city_id); setFee(String(n.additional_fee)); setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null); setName(""); setCityId(""); setFee("0"); setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle>Bairros</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={selectedCityFilter} onValueChange={setSelectedCityFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por cidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cidades</SelectItem>
              {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Novo Bairro</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar Bairro" : "Novo Bairro"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Select value={cityId} onValueChange={setCityId}>
                    <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome do Bairro</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Centro" />
                </div>
                <div className="space-y-2">
                  <Label>Taxa Adicional (R$)</Label>
                  <Input type="number" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} />
                </div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {neighborhoods.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum bairro cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bairro</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Taxa Adicional</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {neighborhoods.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.name}</TableCell>
                  <TableCell>{n.cities?.name}</TableCell>
                  <TableCell>R$ {Number(n.additional_fee).toFixed(2)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(n)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
