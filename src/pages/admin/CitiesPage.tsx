import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

type City = Tables<"cities">;

export default function CitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [name, setName] = useState("");
  const [minValue, setMinValue] = useState("0");
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchCities = async () => {
    const { data } = await supabase.from("cities").select("*").order("name");
    if (data) setCities(data);
  };

  useEffect(() => { fetchCities(); }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editingCity) {
      const { error } = await supabase.from("cities").update({ name: name.trim(), min_value: parseFloat(minValue) }).eq("id", editingCity.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("cities").insert({ name: name.trim(), min_value: parseFloat(minValue) });
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    }
    setName(""); setMinValue("0"); setEditingCity(null); setDialogOpen(false);
    fetchCities();
    toast({ title: editingCity ? "Cidade atualizada!" : "Cidade cadastrada!" });
  };

  const toggleActive = async (city: City) => {
    await supabase.from("cities").update({ is_active: !city.is_active }).eq("id", city.id);
    fetchCities();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("cities").delete().eq("id", id);
    fetchCities();
    toast({ title: "Cidade removida!" });
  };

  const openEdit = (city: City) => {
    setEditingCity(city);
    setName(city.name);
    setMinValue(String(city.min_value));
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingCity(null);
    setName("");
    setMinValue("0");
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Cidades de Santa Catarina</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Nova Cidade</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCity ? "Editar Cidade" : "Nova Cidade"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Cidade</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Florianópolis" />
              </div>
              <div className="space-y-2">
                <Label>Valor Mínimo (R$)</Label>
                <Input type="number" step="0.01" value={minValue} onChange={(e) => setMinValue(e.target.value)} />
              </div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {cities.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma cidade cadastrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cidade</TableHead>
                <TableHead>Valor Mínimo</TableHead>
                <TableHead>Ativa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cities.map((city) => (
                <TableRow key={city.id}>
                  <TableCell className="font-medium">{city.name}</TableCell>
                  <TableCell>R$ {Number(city.min_value).toFixed(2)}</TableCell>
                  <TableCell>
                    <Switch checked={city.is_active} onCheckedChange={() => toggleActive(city)} />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(city)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(city.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
