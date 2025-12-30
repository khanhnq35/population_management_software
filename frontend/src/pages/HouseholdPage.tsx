import { useRef, useEffect, useState, React } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import DataTable, { type Column } from "../components/DataTable";
import FormModal from "../components/FormModal";
import { Button } from "../components/ui/button";
import { citizensApi, householdsApi } from "../services/api";
import useDebounce from "../lib/useDebounce";

type Household = {
  id: number;
  household_code: string;
  address: string;
  head_of_household: string;
  established_date?: string;
  created_at: string;
};

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString("vi-VN", { hour12: false }) : "-");

const columns: Column<Household>[] = [
  { key: "household_code", header: "Mã hộ" },
  { key: "head_of_household", header: "Chủ hộ" },
  { key: "address", header: "Địa chỉ" },
  { key: "established_date", header: "Ngày lập", render: (row) => (row.established_date ? formatDateTime(row.established_date) : "-") },
  { key: "created_at", header: "Ngày tạo", render: (row) => formatDateTime(row.created_at) }
];

const HouseholdPage = () => {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Array<{ id: number; citizen_code: string; full_name: string; relationship_to_head: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 400);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async (keyword = "") => {
    setLoading(true);
    try {
      const data = await householdsApi.list(keyword || undefined);
      setHouseholds(data);
    } catch (error) {
      console.error("Failed to load households", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData(debouncedSearch);
  }, [debouncedSearch]);

  const handleDelete = async (id: number) => {
    try {
      await householdsApi.delete(id);
      await fetchData(debouncedSearch);
    } catch (error) {
      console.error("Failed to delete household", error);
      alert("Không thể xóa hộ gia đình. Vui lòng thử lại.");
    }
  };

  const handleUpdate = async (id: number, payload: Record<string, unknown>) => {
    try {
      await householdsApi.update(id, payload);
      await fetchData(debouncedSearch);
    } catch (error) {
      console.error("Failed to update household", error);
      alert("Không thể cập nhật hộ gia đình. Vui lòng thử lại.");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const result = await householdsApi.importExcel(file);
      alert(`Import thành công: ${result.imported} hộ, ${result.errors} lỗi`);
      await fetchData(debouncedSearch);
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
      await householdsApi.exportExcel();
    } catch (error) {
      console.error("Failed to export", error);
      alert("Không thể export file. Vui lòng thử lại.");
    }
  };

  useEffect(() => {
    if (detailOpen && selectedHousehold) {
      void loadMembers(selectedHousehold.household_code);
    }
  }, [detailOpen, selectedHousehold]);

  const loadMembers = async (householdCode: string) => {
    setLoadingMembers(true);
    try {
      const data = await citizensApi.list({ household_code: householdCode });
      setMembers(
        data.map((citizen: any) => ({
          id: citizen.id,
          citizen_code: citizen.citizen_code,
          full_name: citizen.full_name,
          relationship_to_head: citizen.relationship_to_head
        }))
      );
    } catch (error) {
      console.error("Failed to load household members", error);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const openDetail = (household: Household) => {
    setSelectedHousehold(household);
    setDetailOpen(true);
  };

  const columnsWithActions: Column<Household>[] = [
    ...columns,
    {
      key: "id" as keyof Household,
      header: "Thao tác",
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openDetail(row)}>
            Xem chi tiết
          </Button>
          <HouseholdEditModal
            household={row}
            onUpdate={handleUpdate}
            onDelete={() => handleDelete(row.id)}
          />
        </div>
      )
    }
  ];
  const emptyMessage = loading ? "Đang tải..." : searchTerm ? "Không tìm thấy hộ phù hợp" : "Chưa có hộ gia đình";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Quản lý hộ gia đình</h2>
          <p className="text-sm text-slate-400">Theo dõi danh sách hộ và thông tin liên quan</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm kiếm mã hộ, chủ hộ..."
            className="h-10 w-full min-w-[200px] rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none md:w-60"
          />
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
          title="Thêm hộ gia đình"
          triggerLabel="Thêm mới"
          onSubmit={async (formData, close) => {
            const payload = Object.fromEntries(formData.entries()) as Record<string, unknown>;
            if (!payload.established_date) {
              delete payload.established_date;
            }
            await householdsApi.create(payload);
            await fetchData(debouncedSearch);
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
      </div>

      <DataTable columns={columnsWithActions} data={households} emptyMessage={emptyMessage} />
      <Button variant="ghost" onClick={() => void fetchData(debouncedSearch)} disabled={loading}>
        {loading ? "Đang tải..." : "Tải lại"}
      </Button>
      <Dialog.Root open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) { setSelectedHousehold(null); setMembers([]); } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[90vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-semibold text-white">
                  {selectedHousehold ? `Chi tiết hộ ${selectedHousehold.household_code}` : "Chi tiết hộ"}
                </Dialog.Title>
                {selectedHousehold && (
                  <div className="mt-3 space-y-2 text-sm text-slate-300">
                    <p>
                      <span className="text-slate-400">Chủ hộ:</span> {selectedHousehold.head_of_household}
                    </p>
                    <p>
                      <span className="text-slate-400">Địa chỉ:</span> {selectedHousehold.address}
                    </p>
                    <p>
                      <span className="text-slate-400">Ngày lập:</span>{" "}
                      {selectedHousehold.established_date ? new Date(selectedHousehold.established_date).toLocaleDateString("vi-VN") : "-"}
                    </p>
                    <p>
                      <span className="text-slate-400">Ngày tạo:</span> {formatDateTime(selectedHousehold.created_at)}
                    </p>
                  </div>
                )}
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost">Đóng</Button>
              </Dialog.Close>
            </div>
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-white">Thành viên</h4>
              <div className="mt-3 rounded-lg border border-slate-800">
                <table className="w-full table-auto text-sm text-slate-200">
                  <thead className="bg-slate-800/60 text-left text-slate-400">
                    <tr>
                      <th className="px-4 py-2">Mã nhân khẩu</th>
                      <th className="px-4 py-2">Họ tên</th>
                      <th className="px-4 py-2">Quan hệ với chủ hộ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMembers ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-slate-400">
                          Đang tải danh sách...
                        </td>
                      </tr>
                    ) : members.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-slate-400">
                          Chưa có thành viên
                        </td>
                      </tr>
                    ) : (
                      members.map((member) => (
                        <tr key={member.id} className="border-t border-slate-800/60">
                          <td className="px-4 py-2">{member.citizen_code}</td>
                          <td className="px-4 py-2">{member.full_name}</td>
                          <td className="px-4 py-2 capitalize">
                            {member.relationship_to_head.replace(/_/g, " ")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

type HouseholdEditModalProps = {
  household: Household;
  onUpdate: (id: number, payload: Record<string, unknown>) => Promise<void>;
  onDelete: () => Promise<void>;
};

const HouseholdEditModal = ({ household, onUpdate, onDelete }: HouseholdEditModalProps) => {
  const handleDelete = async (close: () => void) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${household.household_code}"?`)) return;
    await onDelete();
    close();
  };

  return (
    <FormModal
      title={`Chỉnh sửa hộ ${household.household_code}`}
      triggerLabel="Chỉnh sửa"
      triggerButtonProps={{ variant: "outline", size: "sm" }}
      onSubmit={async (formData, close) => {
        const payload = Object.fromEntries(formData.entries());
        if (!payload.established_date) delete payload.established_date;
        await onUpdate(household.id, payload);
        close();
      }}
    >
      {({ close }) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            Mã hộ
            <input
              name="household_code"
              defaultValue={household.household_code}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              required
            />
          </label>
          <label className="text-sm text-slate-300">
            Chủ hộ
            <input
              name="head_of_household"
              defaultValue={household.head_of_household}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              required
            />
          </label>
          <label className="text-sm text-slate-300 md:col-span-2">
            Địa chỉ
            <input
              name="address"
              defaultValue={household.address}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              required
            />
          </label>
          <label className="text-sm text-slate-300">
            Ngày lập
            <input
              type="date"
              name="established_date"
              defaultValue={household.established_date ? household.established_date.slice(0, 10) : ""}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
          </label>
          <div className="md:col-span-2 pt-2 text-right">
            <Button
              type="button"
              variant="ghost"
              className="text-red-400 hover:text-red-300"
              onClick={() => void handleDelete(close)}
            >
              Xóa hộ gia đình
            </Button>
          </div>
        </div>
      )}
    </FormModal>
  );
};

export default HouseholdPage;
