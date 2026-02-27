import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MASTER_EMAIL = "visraeloficial@gmail.com";

export default function CollaboratorsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");

  const isMaster = user?.email === MASTER_EMAIL;

  const { data: collaborators, isLoading } = useQuery({
    queryKey: ["collaborators"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "admin");
      if (error) throw error;

      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, name")
        .in("user_id", userIds);

      return roles.map((r) => {
        const profile = profiles?.find((p) => p.user_id === r.user_id);
        return {
          user_id: r.user_id,
          email: profile?.email ?? "—",
          name: profile?.name ?? "—",
          role: r.role,
        };
      });
    },
  });

  const addMutation = useMutation({
    mutationFn: async (email: string) => {
      // Find user by email in profiles
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile) throw new Error("Usuário não encontrado. Ele precisa fazer login pelo menos uma vez.");

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: profile.user_id, role: "admin" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Colaborador adicionado com sucesso!" });
      setNewEmail("");
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Colaborador removido." });
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    if (!newEmail.trim()) return;
    addMutation.mutate(newEmail.trim().toLowerCase());
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Colaboradores (Admins)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isMaster && (
            <div className="flex gap-2">
              <Input
                placeholder="Email do colaborador..."
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <Button onClick={handleAdd} disabled={addMutation.isPending}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar
              </Button>
            </div>
          )}

          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Role</TableHead>
                  {isMaster && <TableHead className="w-20">Ação</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {collaborators?.map((c) => (
                  <TableRow key={c.user_id}>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.role}</TableCell>
                    {isMaster && (
                      <TableCell>
                        {c.email !== MASTER_EMAIL && (
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => removeMutation.mutate(c.user_id)}
                            disabled={removeMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
