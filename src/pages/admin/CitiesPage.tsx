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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  vehicle_type: string;
  created_at: string;
}

interface ServedState {
  id: string;
  state_code: string;
  state_name: string;
  is_active: boolean;
  min_value: number;
  base_value: number;
  created_at: string;
}

const BRAZILIAN_STATES = [
  { code: "AC", name: "Acre" }, { code: "AL", name: "Alagoas" }, { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" }, { code: "BA", name: "Bahia" }, { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" }, { code: "ES", name: "Espírito Santo" }, { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" }, { code: "MT", name: "Mato Grosso" }, { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" }, { code: "PA", name: "Pará" }, { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" }, { code: "PE", name: "Pernambuco" }, { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" }, { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" }, { code: "RO", name: "Rondônia" }, { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" }, { code: "SP", name: "São Paulo" }, { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" },
];

export default function CitiesPage() {
  const { toast } = useToast();

  // --- MOTO CITIES ---
  const [cities, setCities] = useState<City[]>([]);
  const [name, setName] = useState("");
  const [state, setState] = useState("SC");
  const [minValue, setMinValue] = useState("0");
  const [baseValue, setBaseValue] = useState("0");
  const [density, setDensity] = useState("media");
  const [observation, setObservation] = useState("");
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // --- CAR STATES ---
  const [servedStates, setServedStates] = useState<ServedState[]>([]);
  const [stateCode, setStateCode] = useState("");
  const [stateMinValue, setStateMinValue] = useState("0");
  const [stateBaseValue, setStateBaseValue] = useState("0");
  const [editingState, setEditingState] = useState<ServedState | null>(null);
  const [stateDialogOpen, setStateDialogOpen] = useState(false);

  const fetchCities = async () => {
    const { data } = await supabase.from("cities").select("*").eq("vehicle_type", "moto").order("name");
    if (data) setCities(data as City[]);
  };

  const fetchStates = async () => {
    const { data } = await supabase.from("served_states").select("*").order("state_name");
    if (data) setServedStates(data as ServedState[]);
  };

  useEffect(() => { fetchCities(); fetchStates(); }, []);

  // --- Moto CRUD ---
  const handleSaveCity = async () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(), state, min_value: parseFloat(minValue), base_value: parseFloat(baseValue),
      density, observation: observation.trim() || null, vehicle_type: "moto",
    };
    if (editingCity) {
      const { error } = await supabase.from("cities").update(payload).eq("id", editingCity.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("cities").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    }
    resetCityForm(); fetchCities();
    toast({ title: editingCity ? "Cidade atualizada!" : "Cidade cadastrada!" });
  };

  const resetCityForm = () => {
    setName(""); setState("SC"); setMinValue("0"); setBaseValue("0");
    setDensity("media"); setObservation(""); setEditingCity(null); setDialogOpen(false);
  };

  const toggleCityActive = async (city: City) => {
    await supabase.from("cities").update({ is_active: !city.is_active }).eq("id", city.id);
    fetchCities();
  };

  const handleDeleteCity = async (id: string) => {
    await supabase.from("cities").delete().eq("id", id);
    fetchCities(); toast({ title: "Cidade removida!" });
  };

  const openEditCity = (city: City) => {
    setEditingCity(city); setName(city.name); setState(city.state);
    setMinValue(String(city.min_value)); setBaseValue(String(city.base_value));
    setDensity(city.density); setObservation(city.observation || ""); setDialogOpen(true);
  };

  const openNewCity = () => { resetCityForm(); setDialogOpen(true); };

  // --- Car States CRUD ---
  const handleSaveState = async () => {
    if (!stateCode) return;
    const selectedState = BRAZILIAN_STATES.find(s => s.code === stateCode);
    if (!selectedState) return;

    const payload = {
      state_code: stateCode,
      state_name: selectedState.name,
      min_value: parseFloat(stateMinValue),
      base_value: parseFloat(stateBaseValue),
    };

    if (editingState) {
      const { error } = await supabase.from("served_states").update(payload).eq("id", editingState.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("served_states").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    }
    resetStateForm(); fetchStates();
    toast({ title: editingState ? "Estado atualizado!" : "Estado cadastrado!" });
  };

  const resetStateForm = () => {
    setStateCode(""); setStateMinValue("0"); setStateBaseValue("0");
    setEditingState(null); setStateDialogOpen(false);
  };

  const toggleStateActive = async (s: ServedState) => {
    await supabase.from("served_states").update({ is_active: !s.is_active }).eq("id", s.id);
    fetchStates();
  };

  const handleDeleteState = async (id: string) => {
    await supabase.from("served_states").delete().eq("id", id);
    fetchStates(); toast({ title: "Estado removido!" });
  };

  const openEditState = (s: ServedState) => {
    setEditingState(s); setStateCode(s.state_code);
    setStateMinValue(String(s.min_value)); setStateBaseValue(String(s.base_value));
    setStateDialogOpen(true);
  };

  const openNewState = () => { resetStateForm(); setStateDialogOpen(true); };

  const densityLabel: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
  const densityVariant = (d: string) => d === "alta" ? "destructive" as const : d === "baixa" ? "secondary" as const : "default" as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cidades & Estados Atendidos</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as cidades (moto) e estados (carro) atendidos.</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="moto">
          <TabsList className="mb-4">
            <TabsTrigger value="moto">🛵 Moto (Cidades)</TabsTrigger>
            <TabsTrigger value="car">🚗 Carro (Estados)</TabsTrigger>
          </TabsList>

          {/* ===== MOTO TAB ===== */}
          <TabsContent value="moto">
            <div className="flex justify-end mb-4">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openNewCity}><Plus className="mr-1 h-4 w-4" /> Nova Cidade</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>{editingCity ? "Editar Cidade" : "Nova Cidade"}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>Nome da Cidade</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Florianópolis" /></div>
                      <div className="space-y-2"><Label>Estado</Label><Input value={state} onChange={(e) => setState(e.target.value)} placeholder="SC" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>Valor Mínimo (R$)</Label><Input type="number" step="0.01" value={minValue} onChange={(e) => setMinValue(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Valor Base (R$)</Label><Input type="number" step="0.01" value={baseValue} onChange={(e) => setBaseValue(e.target.value)} /><p className="text-xs text-muted-foreground">Valor base adicionado a todo frete desta cidade.</p></div>
                    </div>
                    <div className="space-y-2">
                      <Label>Densidade</Label>
                      <Select value={density} onValueChange={setDensity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem></SelectContent></Select>
                    </div>
                    <div className="space-y-2"><Label>Observação Interna</Label><Textarea value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Notas internas..." rows={2} /></div>
                    <Button onClick={handleSaveCity} className="w-full">Salvar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {cities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma cidade cadastrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Cidade</TableHead><TableHead>UF</TableHead><TableHead className="text-right">V. Mínimo</TableHead><TableHead className="text-right">V. Base</TableHead><TableHead>Densidade</TableHead><TableHead>Ativa</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {cities.map((city) => (
                      <TableRow key={city.id} className={!city.is_active ? "opacity-50" : ""}>
                        <TableCell className="font-medium">{city.name}</TableCell>
                        <TableCell>{city.state}</TableCell>
                        <TableCell className="text-right">R$ {Number(city.min_value).toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {Number(city.base_value).toFixed(2)}</TableCell>
                        <TableCell><Badge variant={densityVariant(city.density)}>{densityLabel[city.density] || city.density}</Badge></TableCell>
                        <TableCell><Switch checked={city.is_active} onCheckedChange={() => toggleCityActive(city)} /></TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditCity(city)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCity(city.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ===== CAR TAB ===== */}
          <TabsContent value="car">
            <div className="flex justify-end mb-4">
              <Dialog open={stateDialogOpen} onOpenChange={setStateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openNewState}><Plus className="mr-1 h-4 w-4" /> Novo Estado</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>{editingState ? "Editar Estado" : "Novo Estado"}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select value={stateCode} onValueChange={setStateCode}>
                        <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                        <SelectContent>
                          {BRAZILIAN_STATES.map((s) => (
                            <SelectItem key={s.code} value={s.code}>{s.code} - {s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>Valor Mínimo (R$)</Label><Input type="number" step="0.01" value={stateMinValue} onChange={(e) => setStateMinValue(e.target.value)} /></div>
                      <div className="space-y-2"><Label>Valor Base (R$)</Label><Input type="number" step="0.01" value={stateBaseValue} onChange={(e) => setStateBaseValue(e.target.value)} /><p className="text-xs text-muted-foreground">Valor base para fretes neste estado.</p></div>
                    </div>
                    <Button onClick={handleSaveState} className="w-full">Salvar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {servedStates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum estado cadastrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>UF</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">V. Mínimo</TableHead><TableHead className="text-right">V. Base</TableHead><TableHead>Ativo</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {servedStates.map((s) => (
                      <TableRow key={s.id} className={!s.is_active ? "opacity-50" : ""}>
                        <TableCell className="font-medium">{s.state_code}</TableCell>
                        <TableCell>{s.state_name}</TableCell>
                        <TableCell className="text-right">R$ {Number(s.min_value).toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {Number(s.base_value).toFixed(2)}</TableCell>
                        <TableCell><Switch checked={s.is_active} onCheckedChange={() => toggleStateActive(s)} /></TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditState(s)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteState(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
