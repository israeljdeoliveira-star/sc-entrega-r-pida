import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

type Driver = Tables<"drivers">;

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState("moto");
  const [licensePlate, setLicensePlate] = useState("");
  const [editing, setEditing] = useState<Driver | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchDrivers = async () => {
    const { data } = await supabase.from("drivers").select("*").order("name");
    if (data) setDrivers(data);
  };

  useEffect(() => { fetchDrivers(); }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    const payload = { name: name.trim(), phone: phone.trim() || null, vehicle_type: vehicleType, license_plate: licensePlate.trim() || null };
    if (editing) {
      const { error } = await supabase.from("drivers").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("drivers").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    }
    resetForm();
    fetchDrivers();
    toast({ title: editing ? "Motorista atualizado!" : "Motorista cadastrado!" });
  };

  const toggleActive = async (driver: Driver) => {
    await supabase.from("drivers").update({ is_active: !driver.is_active }).eq("id", driver.id);
    fetchDrivers();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("drivers").delete().eq("id", id);
    fetchDrivers();
    toast({ title: "Motorista removido!" });
  };

  const openEdit = (d: Driver) => {
    setEditing(d); setName(d.name); setPhone(d.phone || ""); setVehicleType(d.vehicle_type); setLicensePlate(d.license_plate || ""); setDialogOpen(true);
  };

  const resetForm = () => {
    setName(""); setPhone(""); setVehicleType("moto"); setLicensePlate(""); setEditing(null); setDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Motoristas</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => resetForm()}><Plus className="mr-1 h-4 w-4" /> Novo Motorista</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar Motorista" : "Novo Motorista"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(48) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Veículo</Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moto">Moto</SelectItem>
                    <SelectItem value="car">Carro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Placa</Label>
                <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="ABC-1234" />
              </div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {drivers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum motorista cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.phone || "—"}</TableCell>
                  <TableCell className="capitalize">{d.vehicle_type === "car" ? "Carro" : "Moto"}</TableCell>
                  <TableCell>{d.license_plate || "—"}</TableCell>
                  <TableCell>
                    <Switch checked={d.is_active} onCheckedChange={() => toggleActive(d)} />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
