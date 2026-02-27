import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export default function ExternalCodesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showWhatsapp, setShowWhatsapp] = useState(true);
  const [gtmId, setGtmId] = useState("");
  const [ga4Id, setGa4Id] = useState("");
  const [googleVerification, setGoogleVerification] = useState("");
  const [facebookPixelId, setFacebookPixelId] = useState("");
  const [customTrackingCode, setCustomTrackingCode] = useState("");

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("*")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setSettingsId(data.id);
          setWhatsappNumber(data.whatsapp_number);
          setShowWhatsapp(data.show_whatsapp_button);
          setGtmId(data.gtm_id || "");
          setGa4Id(data.ga4_id || "");
          setGoogleVerification(data.google_verification || "");
          setFacebookPixelId(data.facebook_pixel_id || "");
          setCustomTrackingCode(data.custom_tracking_code || "");
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!settingsId) return;
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        whatsapp_number: whatsappNumber,
        show_whatsapp_button: showWhatsapp,
        gtm_id: gtmId,
        ga4_id: ga4Id,
        google_verification: googleVerification,
        facebook_pixel_id: facebookPixelId,
        custom_tracking_code: customTrackingCode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settingsId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvo!", description: "Configurações atualizadas com sucesso." });
    }
    setSaving(false);
  };

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Códigos Externos</h2>
        <p className="text-muted-foreground">Configure integrações de rastreamento e WhatsApp do site.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">WhatsApp</CardTitle>
            <CardDescription>Número usado em todo o site e botão flutuante.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Número do WhatsApp (com DDI)</Label>
              <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="5547999999999" />
            </div>
            <div className="flex items-center justify-between">
              <Label>Mostrar botão flutuante no site</Label>
              <Switch checked={showWhatsapp} onCheckedChange={setShowWhatsapp} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Google Tag Manager</CardTitle>
            <CardDescription>Cole o ID do container GTM.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input value={gtmId} onChange={e => setGtmId(e.target.value)} placeholder="GTM-XXXXXXX" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Google Analytics 4</CardTitle>
            <CardDescription>ID de medição do GA4.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input value={ga4Id} onChange={e => setGa4Id(e.target.value)} placeholder="G-XXXXXXXXXX" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verificação Google</CardTitle>
            <CardDescription>Meta tag de verificação de propriedade.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input value={googleVerification} onChange={e => setGoogleVerification(e.target.value)} placeholder="Código de verificação" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Facebook Pixel</CardTitle>
            <CardDescription>ID do Pixel para campanhas do Facebook.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input value={facebookPixelId} onChange={e => setFacebookPixelId(e.target.value)} placeholder="123456789012345" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Código de Tracking Personalizado</CardTitle>
            <CardDescription>JavaScript customizado injetado no head.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={customTrackingCode}
              onChange={e => setCustomTrackingCode(e.target.value)}
              placeholder="// Cole aqui seu código JavaScript..."
              rows={5}
            />
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" />
        {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
}
