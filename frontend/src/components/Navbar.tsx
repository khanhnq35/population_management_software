import { LogOut } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/70 px-6 py-4 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold text-white">Population Management</h1>
        <p className="text-sm text-slate-400">Local administrative dashboard</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-white">{user?.full_name}</p>
          <p className="text-xs uppercase tracking-wide text-slate-400">{user?.role}</p>
        </div>
        <Button variant="outline" className="flex items-center gap-2" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
