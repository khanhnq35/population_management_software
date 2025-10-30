import { Home, Layers, ListOrdered, Users } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

const links = [
  { to: "/dashboard", label: "Tổng quan", icon: Home },
  { to: "/hogiadinh", label: "Hộ Gia Đình", icon: Layers },
  { to: "/nhankhau", label: "Nhân Khẩu", icon: ListOrdered },
  { to: "/thuphi", label: "Thu Phí", icon: ListOrdered }
];

const Sidebar = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <aside className="flex w-60 flex-col border-r border-slate-800 bg-slate-900/80 px-4 py-6">
      <nav className="flex flex-1 flex-col gap-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-sky-500 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/users"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-sky-500 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <Users className="h-4 w-4" />
            Quản lý người dùng
          </NavLink>
        )}
      </nav>
      <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">Phiên bản 0.1.0</p>
    </aside>
  );
};

export default Sidebar;
