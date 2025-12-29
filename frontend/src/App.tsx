import React from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import { useAuth } from "./contexts/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import FeePage from "./pages/FeePage";
import HouseholdPage from "./pages/HouseholdPage";
import LoginPage from "./pages/LoginPage";
import CitizenPage from "./pages/CitizenPage";
import UsersPage from "./pages/UsersPage";

const ProtectedRoute: React.FC<{ roles?: string[] }> = ({ roles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/hogiadinh" element={<HouseholdPage />} />
          <Route path="/nhankhau" element={<CitizenPage />} />
          <Route path="/thuphi" element={<FeePage />} />
          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
