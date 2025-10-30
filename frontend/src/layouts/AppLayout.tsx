import { Outlet } from "react-router-dom";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

const AppLayout = () => {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
