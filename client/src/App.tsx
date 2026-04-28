import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Deposit from "@/pages/deposit";
import Withdraw from "@/pages/withdraw";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import AiAssistant from "@/pages/ai-assistant";
import Trade from "@/pages/trade";
import CoinDetail from "@/pages/coin-detail";
import Portfolio from "@/pages/portfolio";
import BuyCrypto from "@/pages/buy-crypto";
import Profile from "@/pages/profile";
import Support from "@/pages/support";

import { ProtectedRoute } from "@/components/protected-route";
import { AdminProtectedRoute } from "@/components/admin-protected-route";
import { BottomNav } from "@/components/bottom-nav";
import "@/lib/fetch-interceptor";

const queryClient = new QueryClient();

const base = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <BottomNav />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/support" element={<Support />} />

            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/deposit" element={<ProtectedRoute><Deposit /></ProtectedRoute>} />
            <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
            <Route path="/trade" element={<ProtectedRoute><Trade /></ProtectedRoute>} />
            <Route path="/trade/:symbol" element={<ProtectedRoute><CoinDetail /></ProtectedRoute>} />
            <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
            <Route path="/ai-assistant" element={<ProtectedRoute><AiAssistant /></ProtectedRoute>} />
            <Route path="/buy-crypto" element={<BuyCrypto />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
