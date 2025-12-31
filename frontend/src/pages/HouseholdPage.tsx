import { useRef, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import DataTable, { type Column } from "../components/DataTable";
import FormModal from "../components/FormModal";
import { Button } from "../components/ui/button";
import { householdsApi, citizensApi } from "../services/api";
import useDebounce from "../lib/useDebounce";

type Household = {
  id: number;
  household_code: string;
  address: string;
  head_of_household: string;
  established_date?: string;
  created_at: string;
  member_count?: number;
};

type Citizen = {
  id: number;
  citizen_code: string;
  full_name: string;
  gender: string;
  date_of_birth: string;
  status: string;
  household_id: number;
  relationship_to_head: string;
  occupation?: string;
  national_id?: string;
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
  const [searchTerm, setSearchTerm] = useState("");
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

  const columnsWithActions: Column<Household>[] = [
    ...columns,
    {
      key: "id" as keyof Household,
      header: "Thao tác",
      render: (row) => (
        <div className="flex gap-2">
          <HouseholdDetailDialog
            household={row}
            trigger={<Button variant="outline" size="sm">Chi tiết</Button>}
          />
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
    </div>
  );
};

// Component mới: Dialog hiển thị chi tiết hộ gia đình
type HouseholdDetailDialogProps = {
  household: Household;
  trigger: React.ReactNode;
};

const HouseholdDetailDialog = ({ household, trigger }: HouseholdDetailDialogProps) => {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await citizensApi.list({ household_id: household.id });
      setMembers(data);
    } catch (error) {
      console.error("Failed to load members", error);
      alert("Không thể tải danh sách thành viên");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      void loadMembers();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        {trigger}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-4xl max-h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-800 bg-slate-900 shadow-xl overflow-y-auto z-50">
          <div className="p-6">
            <Dialog.Title className="text-lg font-semibold text-white">
              Thông tin hộ gia đình
            </Dialog.Title>
            
            {/* Thông tin hộ */}
            <div className="mt-4 space-y-3 border-b border-slate-700 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Mã hộ:</p>
                  <p className="text-white font-medium">{household.household_code}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Chủ hộ:</p>
                  <p className="text-white font-medium">{household.head_of_household}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400">Địa chỉ:</p>
                <p className="text-white">{household.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Ngày lập:</p>
                  <p className="text-white">{household.established_date || "Chưa có"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Số thành viên:</p>
                  <p className="text-white font-medium">{members.length} người</p>
                </div>
              </div>
            </div>

            {/* Danh sách thành viên */}
            <div className="mt-6">
              <h3 className="text-md font-semibold text-white mb-3">
                Danh sách thành viên
              </h3>
              
              {loading ? (
                <p className="text-slate-400 text-center py-8">Đang tải...</p>
              ) : members.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Chưa có thành viên nào</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-700">
                      <tr className="text-left text-slate-400">
                        <th className="pb-3 font-medium">Họ tên</th>
                        <th className="pb-3 font-medium">Quan hệ</th>
                        <th className="pb-3 font-medium">Ngày sinh</th>
                        <th className="pb-3 font-medium">Giới tính</th>
                        <th className="pb-3 font-medium">Nghề nghiệp</th>
                        <th className="pb-3 font-medium">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="text-white">
                      {members.map((member) => (
                        <tr key={member.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="py-3 font-medium">{member.full_name}</td>
                          <td className="py-3">{relationshipLabels[member.relationship_to_head] || member.relationship_to_head}</td>
                          <td className="py-3">{member.date_of_birth}</td>
                          <td className="py-3">{member.gender}</td>
                          <td className="py-3 text-slate-300">{member.occupation || "-"}</td>
                          <td className="py-3">
                            <span className={`inline-block px-2 py-1 text-xs rounded ${
                              member.status === 'thuong_tru' ? 'bg-green-500/20 text-green-400' :
                              member.status === 'tam_tru' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {member.status === 'thuong_tru' ? 'Thường trú' :
                               member.status === 'tam_tru' ? 'Tạm trú' : 'Tạm vắng'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-700">
              <Dialog.Close asChild>
                <Button variant="ghost">Đóng</Button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
      triggerLabel="Sửa"
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