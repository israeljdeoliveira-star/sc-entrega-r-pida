import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, adminCheckComplete, loading } = useAuth();

  // Wait until we have a definitive answer
  if (loading || !adminCheckComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
