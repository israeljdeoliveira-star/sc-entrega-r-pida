import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ServicePhoto {
  id: string;
  title: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export default function ServicePhotosPage() {
  const [photos, setPhotos] = useState<ServicePhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const { toast } = useToast();

  const fetchPhotos = async () => {
    const { data } = await supabase
      .from("service_photos" as any)
      .select("*")
      .order("sort_order");
    if (data) setPhotos(data as any);
  };

  useEffect(() => { fetchPhotos(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("service-photos")
        .upload(fileName, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("service-photos")
        .getPublicUrl(fileName);

      const { error: insertErr } = await (supabase as any)
        .from("service_photos")
        .insert({
          title,
          image_url: urlData.publicUrl,
          sort_order: photos.length,
        });
      if (insertErr) throw insertErr;

      setTitle("");
      e.target.value = "";
      fetchPhotos();
      toast({ title: "Foto adicionada!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await (supabase as any).from("service_photos").update({ is_active: isActive }).eq("id", id);
    fetchPhotos();
  };

  const deletePhoto = async (photo: ServicePhoto) => {
    const fileName = photo.image_url.split("/").pop();
    if (fileName) await supabase.storage.from("service-photos").remove([fileName]);
    await (supabase as any).from("service_photos").delete().eq("id", photo.id);
    fetchPhotos();
    toast({ title: "Foto removida" });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Fotos dos Serviços</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Adicionar nova foto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título (opcional)</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Entrega expressa em Itapema" />
          </div>
          <div className="space-y-1.5">
            <Label>Foto</Label>
            <Input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
          </div>
          {uploading && <p className="text-sm text-muted-foreground">Enviando...</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden">
            <img src={photo.image_url} alt={photo.title} className="w-full h-40 object-cover" />
            <CardContent className="p-3 space-y-2">
              <p className="text-sm font-medium truncate">{photo.title || "Sem título"}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={photo.is_active}
                    onCheckedChange={(v) => toggleActive(photo.id, v)}
                  />
                  <span className="text-xs text-muted-foreground">{photo.is_active ? "Ativa" : "Oculta"}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deletePhoto(photo)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {photos.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhuma foto adicionada ainda.</p>
      )}
    </div>
  );
}
