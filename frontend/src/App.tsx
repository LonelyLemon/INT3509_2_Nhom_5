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

// Dummy Imports
const FinancialDashboard = () => <div className="p-8"><h1 className="text-3xl font-bold">Dashboard</h1><p className="mt-4">3-column flexible layout goes here...</p></div>;
const NewsAndCalendar = () => <div className="p-8"><h1 className="text-3xl font-bold">News & Calendar</h1></div>;
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
          <Route path="/calendar" element={<NewsAndCalendar />} />
          <Route path="/community" element={<Forum />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
