import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Store from "./pages/Store";
import Checkout from "./pages/Checkout";
import PaymentStatus from "./pages/PaymentStatus";
import Terms from "./pages/Terms";
import Maintenance from "./pages/Maintenance";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import PurchaseHistory from "./pages/PurchaseHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/store" element={<Store />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/payment-status" element={<PaymentStatus />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/purchases" element={<PurchaseHistory />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
