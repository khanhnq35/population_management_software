import { useEffect, useState } from "react";

import DataTable, { type Column } from "../components/DataTable";
import DialogConfirm from "../components/DialogConfirm";
import FormModal from "../components/FormModal";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { apiClient, usersApi } from "../services/api";

type User = {
  id: number;
  username: string;
  full_name: string;
  role: string;
  created_at: string;
};

const columns: Column<User>[] = [
  { key: "username", header: "Tên đăng nhập" },
  { key: "full_name", header: "Họ tên" },
  { key: "role", header: "Vai trò" },
  { key: "created_at", header: "Ngày tạo" }
];

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await usersApi.list();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const handleDelete = async (id: number) => {
    if (currentUser?.id === id) {
      alert("Bạn không thể xóa chính mình.");
      return;
    }
    try {
      await usersApi.delete(id);
      await fetchUsers();
    } catch (error) {
      console.error("Failed to delete user", error);
      alert("Không thể xóa người dùng. Vui lòng thử lại.");
    }
  };

  const columnsWithActions: Column<User>[] = [
    ...columns,
    {
      key: "id" as keyof User,
      header: "Thao tác",
      render: (row) => (
        <DialogConfirm
          title="Xác nhận xóa"
          description={`Bạn có chắc chắn muốn xóa người dùng "${row.username}"?`}
          trigger={<Button variant="outline" size="sm" disabled={currentUser?.id === row.id}>Xóa</Button>}
          onConfirm={() => handleDelete(row.id)}
          confirmLabel="Xóa"
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Quản lý người dùng</h2>
          <p className="text-sm text-slate-400">Tạo và phân quyền tài khoản sử dụng hệ thống</p>
        </div>
        <FormModal
          title="Tạo người dùng"
          triggerLabel="Thêm người dùng"
          onSubmit={async (formData, close) => {
            const payload = Object.fromEntries(formData.entries()) as Record<string, unknown>;
            await apiClient.post("/users", payload);
            await fetchUsers();
            close();
          }}
        >
          <div className="grid grid-cols-1 gap-4">
            <label className="text-sm text-slate-300">
              Tên đăng nhập
              <input
                name="username"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Họ tên
              <input
                name="full_name"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Mật khẩu
              <input
                type="password"
                name="password"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Vai trò
              <select
                name="role"
                defaultValue="to_truong"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="admin">Quản trị</option>
                <option value="to_truong">Tổ trưởng</option>
                <option value="ke_toan">Kế toán</option>
              </select>
            </label>
          </div>
        </FormModal>
      </div>

      <DataTable columns={columnsWithActions} data={users} emptyMessage={loading ? "Đang tải..." : undefined} />
      <Button variant="ghost" onClick={() => void fetchUsers()} disabled={loading}>
        {loading ? "Đang tải..." : "Tải lại"}
      </Button>
    </div>
  );
};

export default UsersPage;
