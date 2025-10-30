import { useEffect, useState } from "react";

import DataTable, { type Column } from "../components/DataTable";
import FormModal from "../components/FormModal";
import { Button } from "../components/ui/button";
import { householdsApi } from "../services/api";

type Household = {
  id: number;
  household_code: string;
  address: string;
  head_of_household: string;
  established_date?: string;
  created_at: string;
};

const columns: Column<Household>[] = [
  { key: "household_code", header: "Mã hộ" },
  { key: "head_of_household", header: "Chủ hộ" },
  { key: "address", header: "Địa chỉ" },
  { key: "established_date", header: "Ngày lập" },
  { key: "created_at", header: "Ngày tạo" }
];

const HouseholdPage = () => {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await householdsApi.list();
      setHouseholds(data);
    } catch (error) {
      console.error("Failed to load households", error);
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
          <h2 className="text-xl font-semibold text-white">Quản lý hộ gia đình</h2>
          <p className="text-sm text-slate-400">Theo dõi danh sách hộ và thông tin liên quan</p>
        </div>
        <FormModal
          title="Thêm hộ gia đình"
          triggerLabel="Thêm mới"
          onSubmit={async (formData, close) => {
            const payload = Object.fromEntries(formData.entries()) as Record<string, unknown>;
            if (!payload.established_date) {
              delete payload.established_date;
            }
            await householdsApi.create(payload);
            await fetchData();
            close();
          }}
        >
          <div className="grid grid-cols-1 gap-4">
            <label className="text-sm text-slate-300">
              Mã hộ
              <input
                name="household_code"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Chủ hộ
              <input
                name="head_of_household"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Địa chỉ
              <input
                name="address"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Ngày lập
              <input
                type="date"
                name="established_date"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </label>
          </div>
        </FormModal>
      </div>

      <DataTable columns={columns} data={households} emptyMessage={loading ? "Đang tải..." : undefined} />
      <Button variant="ghost" onClick={() => void fetchData()} disabled={loading}>
        {loading ? "Đang tải..." : "Tải lại"}
      </Button>
    </div>
  );
};

export default HouseholdPage;
