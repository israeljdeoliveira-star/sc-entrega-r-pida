import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface City {
  id: string;
  name: string;
  state: string;
  is_active: boolean;
  min_value: number;
  base_value: number;
  density: string;
  observation: string | null;
  created_at: string;
}

export default function CitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [name, setName] = useState("");
  const [state, setState] = useState("SC");
  const [minValue, setMinValue] = useState("0");
  const [baseValue, setBaseValue] = useState("0");
  const [density, setDensity] = useState("media");
  const [observation, setObservation] = useState("");
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchCities = async () => {
    const { data } = await supabase.from("cities").select("*").order("name");
    if (data) setCities(data as City[]);
  };

  useEffect(() => { fetchCities(); }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      state,
      min_value: parseFloat(minValue),
      base_value: parseFloat(baseValue),
      density,
      observation: observation.trim() || null,
    };

    if (editingCity) {
      const { error } = await supabase.from("cities").update(payload).eq("id", editingCity.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("cities").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    }
    resetForm();
    fetchCities();
    toast({ title: editingCity ? "Cidade atualizada!" : "Cidade cadastrada!" });
  };

  const resetForm = () => {
    setName(""); setState("SC"); setMinValue("0"); setBaseValue("0");
    setDensity("media"); setObservation(""); setEditingCity(null); setDialogOpen(false);
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
    setState(city.state);
    setMinValue(String(city.min_value));
    setBaseValue(String(city.base_value));
    setDensity(city.density);
    setObservation(city.observation || "");
    setDialogOpen(true);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };

  const densityLabel: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
  const densityVariant = (d: string) => d === "alta" ? "destructive" as const : d === "baixa" ? "secondary" as const : "default" as const;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Cidades Atendidas</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as cidades atendidas pelo sistema de frete.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Nova Cidade</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCity ? "Editar Cidade" : "Nova Cidade"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nome da Cidade</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Florianópolis" />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="SC" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor Mínimo (R$)</Label>
                  <Input type="number" step="0.01" value={minValue} onChange={(e) => setMinValue(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Valor Base (R$)</Label>
                  <Input type="number" step="0.01" value={baseValue} onChange={(e) => setBaseValue(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Valor base adicionado a todo frete desta cidade.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Densidade</Label>
                <Select value={density} onValueChange={setDensity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">A densidade influencia o multiplicador automático do frete.</p>
              </div>
              <div className="space-y-2">
                <Label>Observação Interna</Label>
                <Textarea value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Notas internas sobre esta cidade..." rows={2} />
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cidade</TableHead>
                  <TableHead>UF</TableHead>
                  <TableHead className="text-right">V. Mínimo</TableHead>
                  <TableHead className="text-right">V. Base</TableHead>
                  <TableHead>Densidade</TableHead>
                  <TableHead>Ativa</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cities.map((city) => (
                  <TableRow key={city.id} className={!city.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{city.name}</TableCell>
                    <TableCell>{city.state}</TableCell>
                    <TableCell className="text-right">R$ {Number(city.min_value).toFixed(2)}</TableCell>
                    <TableCell className="text-right">R$ {Number(city.base_value).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={densityVariant(city.density)}>{densityLabel[city.density] || city.density}</Badge>
                    </TableCell>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
