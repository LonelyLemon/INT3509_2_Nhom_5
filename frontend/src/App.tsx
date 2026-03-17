import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./layouts/DashboardLayout";

import { LandingPage } from "./pages/LandingPage";
import { Login } from "./pages/Auth/Login";
import { SignUp } from "./pages/Auth/SignUp";
import { Profile } from "./pages/Auth/Profile";

// Dummy Imports
const FinancialDashboard = () => <div className="p-8"><h1 className="text-3xl font-bold">Dashboard</h1><p className="mt-4">3-column flexible layout goes here...</p></div>;
const NewsAndCalendar = () => <div className="p-8"><h1 className="text-3xl font-bold">News & Calendar</h1></div>;
const Forum = () => <div className="p-8"><h1 className="text-3xl font-bold">Community Forum</h1></div>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        
        <Route element={<DashboardLayout />}>
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

export default App;
