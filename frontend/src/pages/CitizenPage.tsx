import { useEffect, useState } from "react";

import DataTable, { type Column } from "../components/DataTable";
import FormModal from "../components/FormModal";
import { Button } from "../components/ui/button";
import { citizensApi } from "../services/api";

type Citizen = {
  id: number;
  full_name: string;
  gender: string;
  date_of_birth: string;
  status: string;
  occupation?: string;
  temporary_address?: string;
  household_id?: number;
};

const columns: Column<Citizen>[] = [
  { key: "full_name", header: "Họ tên" },
  { key: "gender", header: "Giới tính" },
  { key: "date_of_birth", header: "Ngày sinh" },
  { key: "status", header: "Trạng thái" },
  { key: "occupation", header: "Nghề nghiệp" }
];

const CitizenPage = () => {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await citizensApi.list();
      setCitizens(data);
    } catch (error) {
      console.error("Failed to load citizens", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Quản lý nhân khẩu</h2>
          <p className="text-sm text-slate-400">Theo dõi thông tin nhân khẩu cư trú</p>
        </div>
        <FormModal
          title="Thêm nhân khẩu"
          triggerLabel="Thêm mới"
          onSubmit={async (formData, close) => {
            const payload = Object.fromEntries(formData.entries()) as Record<string, unknown>;
            if (!payload.occupation) delete payload.occupation;
            if (!payload.temporary_address) delete payload.temporary_address;
            await citizensApi.create(payload);
            await fetchData();
            close();
          }}
        >
          <div className="grid grid-cols-1 gap-4">
            <label className="text-sm text-slate-300">
              Họ tên
              <input
                name="full_name"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Ngày sinh
              <input
                type="date"
                name="date_of_birth"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Giới tính
              <select
                name="gender"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                defaultValue="Nam"
              >
                <option value="Nam">Nam</option>
                <option value="Nu">Nữ</option>
                <option value="Khac">Khác</option>
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Trạng thái cư trú
              <select
                name="status"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                defaultValue="thuong_tru"
              >
                <option value="thuong_tru">Thường trú</option>
                <option value="tam_tru">Tạm trú</option>
                <option value="tam_vang">Tạm vắng</option>
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Nghề nghiệp
              <input
                name="occupation"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="text-sm text-slate-300">
              Địa chỉ tạm trú
              <input
                name="temporary_address"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </label>
          </div>
        </FormModal>
      </div>

      <DataTable columns={columns} data={citizens} emptyMessage={loading ? "Đang tải..." : undefined} />
      <Button variant="ghost" onClick={() => void fetchData()} disabled={loading}>
        {loading ? "Đang tải..." : "Tải lại"}
      </Button>
    </div>
  );
};

export default CitizenPage;
