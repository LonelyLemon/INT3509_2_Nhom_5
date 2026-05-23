import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout";

import { LandingPage } from "./pages/LandingPage";
import { Login } from "./pages/Auth/Login";
import { SignUp } from "./pages/Auth/SignUp";
import { Profile } from "./pages/Auth/Profile";
import { CheckEmail } from "./pages/Auth/CheckEmail";
import { VerifyEmail } from "./pages/Auth/VerifyEmail";
import { ForgotPassword } from "./pages/Auth/ForgotPassword";
import { ResetPassword } from "./pages/Auth/ResetPassword";
import { useAuthStore } from "./store/useAuthStore";
import { FinancialDashboard } from "./pages/Dashboard/FinancialDashboard";
import { NewsAndCalendar } from "./pages/News/NewsAndCalendar";
import { PortfolioPage } from "./pages/Portfolio/PortfolioPage";
import { AdminLayout } from "./pages/Admin/components/AdminLayout";
import { AdminOverview } from "./pages/Admin/AdminOverview";
import { AdminTickers } from "./pages/Admin/AdminTickers";
import { AdminData } from "./pages/Admin/AdminData";
import { AdminAI } from "./pages/Admin/AdminAI";
import { AdminUsers } from "./pages/Admin/AdminUsers";
import { AIChatPage } from "./pages/AI/AIChatPage";

// Placeholder pages (not yet implemented)
const Forum = () => <div className="p-8"><h1 className="text-3xl font-bold">Community Forum</h1></div>;

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-color)]">
        <span className="animate-spin h-10 w-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full display-inline-block"></span>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-color)]">
        <span className="animate-spin h-10 w-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full display-inline-block"></span>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<FinancialDashboard />} />
          <Route path="/news" element={<NewsAndCalendar />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/community" element={<Forum />} />
          <Route path="/ai" element={<AIChatPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }>
            <Route index element={<AdminOverview />} />
            <Route path="tickers" element={<AdminTickers />} />
            <Route path="data" element={<AdminData />} />
            <Route path="ai" element={<AdminAI />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
