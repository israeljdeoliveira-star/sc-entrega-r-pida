import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, Search, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

type City = Tables<"cities">;
type Neighborhood = Tables<"neighborhoods">;

interface NominatimResult {
  display_name: string;
  type: string;
  class: string;
  address?: {
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city_district?: string;
  };
}

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

  // Auto-fetch neighborhoods
  const [suggestedNeighborhoods, setSuggestedNeighborhoods] = useState<string[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [fetchingNeighborhoods, setFetchingNeighborhoods] = useState(false);
  const [bulkFee, setBulkFee] = useState("0");

  const fetchCities = async () => {
    const { data } = await supabase.from("cities").select("*").eq("is_active", true).eq("vehicle_type", "moto").order("name");
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

  // Auto-fetch neighborhoods from Nominatim when city is selected in dialog
  const fetchNominatimNeighborhoods = async (selectedCityId: string) => {
    const city = cities.find(c => c.id === selectedCityId);
    if (!city) return;

    setFetchingNeighborhoods(true);
    setSuggestedNeighborhoods([]);
    setSelectedSuggestions(new Set());

    try {
      // Fetch existing neighborhoods for this city to exclude duplicates
      const { data: existing } = await supabase.from("neighborhoods").select("name").eq("city_id", selectedCityId);
      const existingNames = new Set((existing || []).map(n => n.name.toLowerCase()));

      // Query Nominatim for suburbs/neighborhoods
      const params = new URLSearchParams({
        q: `${city.name}, ${city.state}, Brazil`,
        format: "json",
        addressdetails: "1",
        limit: "50",
        countrycodes: "br",
      });

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}&type=suburb`,
        { headers: { "User-Agent": "FreteGarca/1.0" } }
      );
      const data: NominatimResult[] = await res.json();

      // Also try a broader search
      const params2 = new URLSearchParams({
        city: city.name,
        state: city.state,
        country: "Brazil",
        format: "json",
        addressdetails: "1",
        limit: "50",
        countrycodes: "br",
      });
      const res2 = await fetch(
        `https://nominatim.openstreetmap.org/search?${params2}`,
        { headers: { "User-Agent": "FreteGarca/1.0" } }
      );
      const data2: NominatimResult[] = await res2.json();

      const allResults = [...data, ...data2];
      const neighborhoodNames = new Set<string>();

      for (const r of allResults) {
        const addr = r.address;
        const names = [addr?.suburb, addr?.neighbourhood, addr?.quarter, addr?.city_district].filter(Boolean) as string[];
        for (const n of names) {
          if (!existingNames.has(n.toLowerCase())) {
            neighborhoodNames.add(n);
          }
        }
      }

      setSuggestedNeighborhoods(Array.from(neighborhoodNames).sort());
    } catch {
      toast({ title: "Erro ao buscar bairros", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setFetchingNeighborhoods(false);
    }
  };

  const handleCityChange = (value: string) => {
    setCityId(value);
    if (value && !editing) {
      fetchNominatimNeighborhoods(value);
    }
  };

  const toggleSuggestion = (name: string) => {
    setSelectedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const selectAllSuggestions = () => {
    if (selectedSuggestions.size === suggestedNeighborhoods.length) {
      setSelectedSuggestions(new Set());
    } else {
      setSelectedSuggestions(new Set(suggestedNeighborhoods));
    }
  };

  const handleBulkAdd = async () => {
    if (!cityId || selectedSuggestions.size === 0) return;
    const feeValue = parseFloat(bulkFee);
    const rows = Array.from(selectedSuggestions).map(n => ({
      name: n, city_id: cityId, additional_fee: feeValue,
    }));
    const { error } = await supabase.from("neighborhoods").insert(rows);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${rows.length} bairros adicionados!` });
    setSuggestedNeighborhoods([]);
    setSelectedSuggestions(new Set());
    fetchNeighborhoods();
  };

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
    setSuggestedNeighborhoods([]); setSelectedSuggestions(new Set());
    fetchNeighborhoods();
    toast({ title: editing ? "Bairro atualizado!" : "Bairro cadastrado!" });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("neighborhoods").delete().eq("id", id);
    fetchNeighborhoods();
    toast({ title: "Bairro removido!" });
  };

  const openEdit = (n: Neighborhood) => {
    setEditing(n); setName(n.name); setCityId(n.city_id); setFee(String(n.additional_fee));
    setSuggestedNeighborhoods([]); setSelectedSuggestions(new Set());
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null); setName(""); setCityId(""); setFee("0");
    setSuggestedNeighborhoods([]); setSelectedSuggestions(new Set());
    setDialogOpen(true);
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
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Editar Bairro" : "Novo Bairro"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Select value={cityId} onValueChange={handleCityChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} - {c.state}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Suggested neighborhoods from Nominatim */}
                {!editing && cityId && (
                  <div className="space-y-2">
                    {fetchingNeighborhoods ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Buscando bairros automaticamente...
                      </div>
                    ) : suggestedNeighborhoods.length > 0 ? (
                      <div className="border rounded-md p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Bairros encontrados ({suggestedNeighborhoods.length})</Label>
                          <Button variant="ghost" size="sm" onClick={selectAllSuggestions}>
                            {selectedSuggestions.size === suggestedNeighborhoods.length ? "Desmarcar todos" : "Selecionar todos"}
                          </Button>
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {suggestedNeighborhoods.map((n) => (
                            <label key={n} className="flex items-center gap-2 py-1 px-1 hover:bg-accent rounded cursor-pointer">
                              <Checkbox checked={selectedSuggestions.has(n)} onCheckedChange={() => toggleSuggestion(n)} />
                              <span className="text-sm">{n}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="space-y-1 flex-1">
                            <Label className="text-xs">Taxa para todos (R$)</Label>
                            <Input type="number" step="0.01" value={bulkFee} onChange={(e) => setBulkFee(e.target.value)} className="h-8" />
                          </div>
                          <Button size="sm" onClick={handleBulkAdd} disabled={selectedSuggestions.size === 0} className="mt-5">
                            Adicionar {selectedSuggestions.size} selecionados
                          </Button>
                        </div>
                      </div>
                    ) : !fetchingNeighborhoods && (
                      <p className="text-xs text-muted-foreground">Nenhum bairro encontrado automaticamente. Adicione manualmente abaixo.</p>
                    )}
                  </div>
                )}

                <div className="border-t pt-3 space-y-2">
                  <Label className="text-xs text-muted-foreground">Ou adicione manualmente:</Label>
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
