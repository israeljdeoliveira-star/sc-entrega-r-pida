import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import ExternalScripts from "@/components/ExternalScripts";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import Index from "./pages/Index";
import Login from "./pages/Login";
import AdminLayout from "./pages/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import CitiesPage from "./pages/admin/CitiesPage";
import FilialConfigPage from "./pages/admin/FilialConfigPage";
import KmTiersPage from "./pages/admin/KmTiersPage";
import MultipliersPage from "./pages/admin/MultipliersPage";
import SmartMarginPage from "./pages/admin/SmartMarginPage";
import SimulationsLogPage from "./pages/admin/SimulationsLogPage";
import CarAdditionalsPage from "./pages/admin/CarAdditionalsPage";
import DynamicRulesPage from "./pages/admin/DynamicRulesPage";
import PricingLogPage from "./pages/admin/PricingLogPage";
import DriversPage from "./pages/admin/DriversPage";
import ClientsPage from "./pages/admin/ClientsPage";
import OrdersPage from "./pages/admin/OrdersPage";
import ExternalCodesPage from "./pages/admin/ExternalCodesPage";
import ServicePhotosPage from "./pages/admin/ServicePhotosPage";
import CollaboratorsPage from "./pages/admin/CollaboratorsPage";
import CarPricingPage from "./pages/admin/CarPricingPage";
import DataExportPage from "./pages/admin/DataExportPage";
import DREPage from "./pages/admin/DREPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ExternalScripts />
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
                <Route path="filial" element={<FilialConfigPage />} />
                <Route path="cities" element={<CitiesPage />} />
                <Route path="km-tiers" element={<KmTiersPage />} />
                <Route path="multipliers" element={<MultipliersPage />} />
                <Route path="smart-margin" element={<SmartMarginPage />} />
                <Route path="simulations-log" element={<SimulationsLogPage />} />
                <Route path="car-additionals" element={<CarAdditionalsPage />} />
                <Route path="rules" element={<DynamicRulesPage />} />
                <Route path="pricing-log" element={<PricingLogPage />} />
                <Route path="drivers" element={<DriversPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="external-codes" element={<ExternalCodesPage />} />
                <Route path="service-photos" element={<ServicePhotosPage />} />
                <Route path="collaborators" element={<CollaboratorsPage />} />
                <Route path="car-pricing" element={<CarPricingPage />} />
                <Route path="data-export" element={<DataExportPage />} />
                <Route path="dre" element={<DREPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            <WhatsAppFloat />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
