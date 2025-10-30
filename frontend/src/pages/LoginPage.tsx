import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(credentials);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl">
        <h2 className="text-center text-2xl font-semibold text-white">Population Management</h2>
        <p className="mt-2 text-center text-sm text-slate-400">Đăng nhập bằng tài khoản được cấp</p>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Tên đăng nhập</label>
            <input
              value={credentials.username}
              onChange={(event) => setCredentials((prev) => ({ ...prev, username: event.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Mật khẩu</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="••••••"
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
