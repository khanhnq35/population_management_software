import { useRef, useEffect, useState } from "react";

import DataTable, { type Column } from "../components/DataTable";
import DialogConfirm from "../components/DialogConfirm";
import FormModal from "../components/FormModal";
import { Button } from "../components/ui/button";
import { citizensApi, householdsApi } from "../services/api";

type Citizen = {
  id: number;
  citizen_code: string;
  full_name: string;
  gender: string;
  date_of_birth: string;
  status: string;
  household_id: number;
  household_code?: string;
  relationship_to_head: string;
  birthplace?: string;
  nationality?: string;
  ethnicity?: string;
  occupation?: string;
  temporary_address?: string;
};

type Household = {
  id: number;
  household_code: string;
  address: string;
  head_of_household: string;
};

const relationshipLabels: Record<string, string> = {
  chu_ho: "Chủ hộ",
  bo: "Bố",
  me: "Mẹ",
  ong: "Ông",
  ba: "Bà",
  anh: "Anh",
  chi: "Chị",
  em: "Em",
  chong: "Chồng",
  vo: "Vợ",
  con: "Con",
  chau: "Cháu"
};

const columns: Column<Citizen>[] = [
  { key: "citizen_code", header: "Mã nhân khẩu" },
  { key: "full_name", header: "Họ tên" },
  { key: "household_code", header: "Mã hộ" },
  { key: "relationship_to_head", header: "Quan hệ", render: (row) => relationshipLabels[row.relationship_to_head] || row.relationship_to_head },
  { key: "date_of_birth", header: "Ngày sinh" },
  { key: "gender", header: "Giới tính" },
  { key: "status", header: "Trạng thái" },
  { key: "occupation", header: "Nghề nghiệp" }
];

const CitizenPage = () => {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [citizensData, householdsData] = await Promise.all([
        citizensApi.list(),
        householdsApi.list()
      ]);
      setCitizens(citizensData);
      setHouseholds(householdsData);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await citizensApi.delete(id);
      await fetchData();
    } catch (error) {
      console.error("Failed to delete citizen", error);
      alert("Không thể xóa nhân khẩu. Vui lòng thử lại.");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const result = await citizensApi.importExcel(file);
      alert(`Import thành công: ${result.imported} nhân khẩu, ${result.errors} lỗi`);
      await fetchData();
    } catch (error) {
      console.error("Failed to import", error);
      alert("Không thể import file. Vui lòng kiểm tra định dạng file.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExport = async () => {
    try {
      await citizensApi.exportExcel();
    } catch (error) {
      console.error("Failed to export", error);
      alert("Không thể export file. Vui lòng thử lại.");
    }
  };

  const columnsWithActions: Column<Citizen>[] = [
    ...columns,
    {
      key: "id" as keyof Citizen,
      header: "Thao tác",
      render: (row) => (
        <DialogConfirm
          title="Xác nhận xóa"
          description={`Bạn có chắc chắn muốn xóa nhân khẩu "${row.full_name}"?`}
          trigger={<Button variant="outline" size="sm">Xóa</Button>}
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
          <h2 className="text-xl font-semibold text-white">Quản lý nhân khẩu</h2>
          <p className="text-sm text-slate-400">Theo dõi thông tin nhân khẩu cư trú</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Import Excel
          </Button>
          <Button variant="outline" onClick={handleExport}>
            Export Excel
          </Button>
          <FormModal
          title="Thêm nhân khẩu"
          triggerLabel="Thêm mới"
          onSubmit={async (formData, close) => {
            const payload = Object.fromEntries(formData.entries()) as Record<string, unknown>;
            payload.household_id = Number(payload.household_id);
            if (!payload.occupation) delete payload.occupation;
            if (!payload.temporary_address) delete payload.temporary_address;
            if (!payload.birthplace) delete payload.birthplace;
            if (!payload.ethnicity) delete payload.ethnicity;
            if (!payload.national_id) delete payload.national_id;
            await citizensApi.create(payload);
            await fetchData();
            close();
          }}
        >
          <div className="grid grid-cols-1 gap-4">
            <label className="text-sm text-slate-300">
              Mã nhân khẩu *
              <input
                name="citizen_code"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Họ tên *
              <input
                name="full_name"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Hộ gia đình *
              <select
                name="household_id"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                required
              >
                <option value="">-- Chọn hộ gia đình --</option>
                {households.map((household) => (
                  <option key={household.id} value={household.id}>
                    {household.household_code} - {household.head_of_household}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Quan hệ với chủ hộ *
              <select
                name="relationship_to_head"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                defaultValue="chu_ho"
                required
              >
                {Object.entries(relationshipLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Ngày sinh *
              <input
                type="date"
                name="date_of_birth"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                required
              />
            </label>
            <label className="text-sm text-slate-300">
              Giới tính *
              <select
                name="gender"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                defaultValue="Nam"
                required
              >
                <option value="Nam">Nam</option>
                <option value="Nu">Nữ</option>
                <option value="Khac">Khác</option>
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Nguyên quán
              <input
                name="birthplace"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="text-sm text-slate-300">
              Quốc tịch
              <input
                name="nationality"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                defaultValue="Việt Nam"
              />
            </label>
            <label className="text-sm text-slate-300">
              Dân tộc
              <input
                name="ethnicity"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="text-sm text-slate-300">
              CMND/CCCD
              <input
                name="national_id"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              />
            </label>
            <label className="text-sm text-slate-300">
              Trạng thái cư trú *
              <select
                name="status"
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                defaultValue="thuong_tru"
                required
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
      </div>

      <DataTable columns={columnsWithActions} data={citizens} emptyMessage={loading ? "Đang tải..." : undefined} />
      <Button variant="ghost" onClick={() => void fetchData()} disabled={loading}>
        {loading ? "Đang tải..." : "Tải lại"}
      </Button>
    </div>
  );
};

export default CitizenPage;
