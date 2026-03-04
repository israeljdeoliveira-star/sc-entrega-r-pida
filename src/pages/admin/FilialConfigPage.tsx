import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Building2, MapPin, DollarSign } from "lucide-react";

interface FilialConfig {
  id: string;
  cidade_filial: string;
  endereco_filial: string;
  latitude_filial: number;
  longitude_filial: number;
  cobrar_deslocamento_fora_filial: boolean;
  valor_km_deslocamento: number;
  valor_minimo_filial: number;
}

export default function FilialConfigPage() {
  const [config, setConfig] = useState<FilialConfig | null>(null);
  const [cidade, setCidade] = useState("");
  const [endereco, setEndereco] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [cobrarDeslocamento, setCobrarDeslocamento] = useState(true);
  const [valorKmDeslocamento, setValorKmDeslocamento] = useState("2.5");
  const [valorMinimo, setValorMinimo] = useState("15");
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("filial_config").select("*").limit(1).single().then(({ data }) => {
      if (data) {
        const d = data as unknown as FilialConfig;
        setConfig(d);
        setCidade(d.cidade_filial);
        setEndereco(d.endereco_filial);
        setLat(String(d.latitude_filial));
        setLng(String(d.longitude_filial));
        setCobrarDeslocamento(d.cobrar_deslocamento_fora_filial);
        setValorKmDeslocamento(String(d.valor_km_deslocamento));
        setValorMinimo(String(d.valor_minimo_filial));
      }
    });
  }, []);

  const geocodeAddress = async () => {
    if (!endereco || !cidade) return;
    setGeocoding(true);
    try {
      const params = new URLSearchParams({
        q: `${endereco}, ${cidade}, SC, Brazil`,
        format: "json",
        limit: "1",
        countrycodes: "br",
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { "User-Agent": "FreteGarca/1.0" },
      });
      const data = await res.json();
      if (data?.[0]) {
        setLat(data[0].lat);
        setLng(data[0].lon);
        toast({ title: "Coordenadas encontradas!" });
      } else {
        toast({ title: "Endereço não encontrado", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao buscar coordenadas", variant: "destructive" });
    } finally {
      setGeocoding(false);
    }
  };

  const handleSave = async () => {
    if (!cidade.trim()) {
      toast({ title: "Informe a cidade da filial", variant: "destructive" });
      return;
    }
    if (!lat || !lng || parseFloat(lat) === 0 || parseFloat(lng) === 0) {
      toast({ title: "Informe as coordenadas da filial", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      cidade_filial: cidade.trim(),
      endereco_filial: endereco.trim(),
      latitude_filial: parseFloat(lat),
      longitude_filial: parseFloat(lng),
      cobrar_deslocamento_fora_filial: cobrarDeslocamento,
      valor_km_deslocamento: parseFloat(valorKmDeslocamento),
      valor_minimo_filial: parseFloat(valorMinimo),
      updated_at: new Date().toISOString(),
    };

    let error;
    if (config) {
      ({ error } = await supabase.from("filial_config").update(payload).eq("id", config.id));
    } else {
      ({ error } = await supabase.from("filial_config").insert(payload));
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configuração da filial salva!" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configuração da Filial</h2>
        <p className="text-muted-foreground">
          Defina a filial de origem dos motoboys. O cálculo de frete usa essas coordenadas para cobrar deslocamento quando a coleta é fora da cidade filial.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Cidade da Filial</CardTitle>
                <CardDescription className="text-xs">Cidade onde os motoboys ficam baseados</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: Itapema" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Endereço da Filial</CardTitle>
                <CardDescription className="text-xs">Endereço completo para geocodificação</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Ex: Rua 240, 500 - Meia Praia" />
            <Button variant="outline" size="sm" onClick={geocodeAddress} disabled={geocoding}>
              {geocoding ? "Buscando..." : "🔍 Buscar Coordenadas"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Coordenadas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Latitude</Label>
                <Input type="number" step="0.000001" value={lat} onChange={e => setLat(e.target.value)} placeholder="-27.09" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Longitude</Label>
                <Input type="number" step="0.000001" value={lng} onChange={e => setLng(e.target.value)} placeholder="-48.61" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Deslocamento e Mínimo</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Cobrar deslocamento fora da filial</Label>
                <p className="text-xs text-muted-foreground">Quando a coleta não é na cidade filial, cobra KM de deslocamento</p>
              </div>
              <Switch checked={cobrarDeslocamento} onCheckedChange={setCobrarDeslocamento} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Valor por KM de deslocamento (R$)</Label>
              <Input type="number" step="0.01" value={valorKmDeslocamento} onChange={e => setValorKmDeslocamento(e.target.value)} />
              <p className="text-xs text-muted-foreground">Cobrado por KM entre a filial e o local de coleta</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Valor mínimo na filial (R$)</Label>
              <Input type="number" step="0.01" value={valorMinimo} onChange={e => setValorMinimo(e.target.value)} />
              <p className="text-xs text-muted-foreground">Mínimo aplicado APENAS quando a coleta é na cidade da filial</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full max-w-md">
        {saving ? "Salvando..." : "Salvar Configuração da Filial"}
      </Button>
    </div>
  );
}
