import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AdminLayout from "./pages/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import CitiesPage from "./pages/admin/CitiesPage";
import NeighborhoodsPage from "./pages/admin/NeighborhoodsPage";
import FreightSettingsPage from "./pages/admin/FreightSettingsPage";
import DynamicRulesPage from "./pages/admin/DynamicRulesPage";
import PricingLogPage from "./pages/admin/PricingLogPage";
import DriversPage from "./pages/admin/DriversPage";
import ClientsPage from "./pages/admin/ClientsPage";
import OrdersPage from "./pages/admin/OrdersPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="cities" element={<CitiesPage />} />
              <Route path="neighborhoods" element={<NeighborhoodsPage />} />
              <Route path="settings" element={<FreightSettingsPage />} />
              <Route path="rules" element={<DynamicRulesPage />} />
              <Route path="pricing-log" element={<PricingLogPage />} />
              <Route path="drivers" element={<DriversPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="orders" element={<OrdersPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
