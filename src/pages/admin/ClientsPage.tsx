import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export default function ClientsPage() {
  const [clients, setClients] = useState<Profile[]>([]);

  useEffect(() => {
    supabase.from("profiles").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setClients(data); });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes Cadastrados</CardTitle>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name || "—"}</TableCell>
                  <TableCell>{c.email || "—"}</TableCell>
                  <TableCell>{c.phone || "—"}</TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Ativo</Badge>
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
