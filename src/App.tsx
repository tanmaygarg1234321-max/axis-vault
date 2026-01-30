import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Store from "./pages/Store";
import Checkout from "./pages/Checkout";
import PaymentStatus from "./pages/PaymentStatus";
import Terms from "./pages/Terms";
import ContactUs from "./pages/ContactUs";
import ShippingPolicy from "./pages/ShippingPolicy";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Maintenance from "./pages/Maintenance";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import PurchaseHistory from "./pages/PurchaseHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Routes that should remain accessible during maintenance
const MAINTENANCE_EXEMPT_ROUTES = ["/admin", "/maintenance"];

const MaintenanceGate = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "maintenance_mode")
          .single();
        
        setMaintenanceMode(data?.value === "true");
      } catch {
        setMaintenanceMode(false);
      }
      setLoading(false);
    };

    checkMaintenance();

    // Subscribe to realtime changes for immediate updates
    const channel = supabase
      .channel("site_settings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_settings",
          filter: "key=eq.maintenance_mode",
        },
        (payload: any) => {
          if (payload.new?.value !== undefined) {
            setMaintenanceMode(payload.new.value === "true");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Show nothing while loading initial state
  if (loading) {
    return null;
  }

  // Check if current route is exempt from maintenance
  const isExemptRoute = MAINTENANCE_EXEMPT_ROUTES.some((route) =>
    location.pathname.startsWith(route)
  );

  // Redirect to maintenance page if maintenance mode is on and not an exempt route
  if (maintenanceMode && !isExemptRoute) {
    return <Navigate to="/maintenance" replace />;
  }

  // If on maintenance page but maintenance is off, redirect to home
  if (!maintenanceMode && location.pathname === "/maintenance") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => (
  <MaintenanceGate>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/store" element={<Store />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/payment-status" element={<PaymentStatus />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/contact" element={<ContactUs />} />
      <Route path="/shipping-policy" element={<ShippingPolicy />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/mypurchases" element={<PurchaseHistory />} />
      <Route path="/purchases" element={<PurchaseHistory />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </MaintenanceGate>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
