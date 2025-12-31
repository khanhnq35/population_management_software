import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import DataTable, { type Column } from "../components/DataTable";
import FormModal from "../components/FormModal";
import SearchableSelect from "../components/SearchableSelect";
import { Button } from "../components/ui/button";
import useDebounce from "../lib/useDebounce";
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
  national_id?: string;
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

const statusLabels: Record<string, string> = {
  thuong_tru: "Thường trú",
  tam_tru: "Tạm trú",
  tam_vang: "Tạm vắng"
};

const columns: Column<Citizen>[] = [
  { key: "citizen_code", header: "Mã nhân khẩu" },
  { key: "full_name", header: "Họ tên" },
  { key: "household_code", header: "Mã hộ" },
  { key: "relationship_to_head", header: "Quan hệ", render: (row) => relationshipLabels[row.relationship_to_head] || row.relationship_to_head },
  { key: "date_of_birth", header: "Ngày sinh" },
  { key: "gender", header: "Giới tính" },
  { key: "status", header: "Trạng thái", render: (row) => statusLabels[row.status] || row.status },
  { key: "occupation", header: "Nghề nghiệp" }
];

type PaymentHistory = {
  id: number;
  fee_name: string;
  amount_paid: number;
  payment_date: string;
  household_code?: string;
};

const CitizenPage = () => {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newCitizenHouseholdId, setNewCitizenHouseholdId] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCitizen, setSelectedCitizen] = useState<Citizen | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 400);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCitizens = async (keyword = "") => {
    setLoading(true);
    try {
      const data = await citizensApi.list({ keyword: keyword || undefined });
      setCitizens(data);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHouseholds = async () => {
    try {
      const data = await householdsApi.list();
      setHouseholds(data);
    } catch (error) {
      console.error("Failed to load households", error);
    }
  };

  useEffect(() => {
    void fetchHouseholds();
  }, []);

  useEffect(() => {
    void fetchCitizens(debouncedSearch);
  }, [debouncedSearch]);

  const handleDeleteCitizen = async (id: number) => {
    try {
      await citizensApi.delete(id);
      await fetchCitizens(debouncedSearch);
    } catch (error) {
      console.error("Failed to delete citizen", error);
      alert("Không thể xóa nhân khẩu. Vui lòng thử lại.");
    }
  };

  const handleUpdateCitizen = async (id: number, payload: Record<string, unknown>) => {
    try {
      await citizensApi.update(id, payload);
      await fetchCitizens(debouncedSearch);
    } catch (error) {
      console.error("Failed to update citizen", error);
      alert("Không thể cập nhật nhân khẩu. Vui lòng thử lại.");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await citizensApi.importExcel(file);
      alert(`Import thành công: ${result.imported} nhân khẩu, ${result.errors} lỗi`);
      await fetchCitizens(debouncedSearch);
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

  const householdOptions = useMemo(
    () =>
      households.map((household) => ({
        value: String(household.id),
        label: `${household.household_code} - ${household.head_of_household}`,
        description: household.address
      })),
    [households]
  );

  useEffect(() => {
    if (detailOpen && selectedCitizen) {
      void loadPaymentHistory(selectedCitizen.id);
    }
  }, [detailOpen, selectedCitizen]);

  const loadPaymentHistory = async (citizenId: number) => {
    setLoadingPayments(true);
    try {
      const payments = await citizensApi.getPayments(citizenId);
      setPaymentHistory(payments);
    } catch (error) {
      console.error("Failed to load payment history", error);
      setPaymentHistory([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const openDetail = (citizen: Citizen) => {
    setSelectedCitizen(citizen);
    setDetailOpen(true);
  };

  const columnsWithActions: Column<Citizen>[] = [
    ...columns,
    {
      key: "id" as keyof Citizen,
      header: "Thao tác",
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openDetail(row)}>
            Xem chi tiết
          </Button>
          <CitizenEditModal
            citizen={row}
            householdOptions={householdOptions}
            onUpdate={handleUpdateCitizen}
            onDelete={() => handleDeleteCitizen(row.id)}
          />
        </div>
      )
    }
  ];

  const emptyMessage = loading ? "Đang tải..." : searchTerm ? "Không tìm thấy nhân khẩu" : "Chưa có nhân khẩu";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Quản lý nhân khẩu</h2>
          <p className="text-sm text-slate-400">Theo dõi thông tin nhân khẩu cư trú</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm mã, tên, CMND..."
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
            title="Thêm nhân khẩu"
            triggerLabel="Thêm mới"
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setNewCitizenHouseholdId("");
              }
            }}
            onSubmit={async (formData, close) => {
              const payload = Object.fromEntries(formData.entries()) as Record<string, any>;
              if (!payload.household_id) {
                alert("Vui lòng chọn hộ gia đình.");
                throw new Error("household_id missing");
              }
              payload.household_id = Number(payload.household_id);
              if (!payload.occupation) delete payload.occupation;
              if (!payload.temporary_address) delete payload.temporary_address;
              if (!payload.birthplace) delete payload.birthplace;
              if (!payload.ethnicity) delete payload.ethnicity;
              if (!payload.national_id) delete payload.national_id;
              await citizensApi.create(payload);
              await fetchCitizens(debouncedSearch);
              close();
            }}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              <div className="text-sm text-slate-300 md:col-span-2">
                Hộ gia đình *
                <div className="mt-1">
                  <SearchableSelect
                    value={newCitizenHouseholdId}
                    onChange={(value) => setNewCitizenHouseholdId(value)}
                    options={householdOptions}
                    placeholder="-- Chọn hộ gia đình --"
                    searchPlaceholder="Tìm mã hộ hoặc chủ hộ..."
                    emptyMessage="Không tìm thấy hộ gia đình"
                  />
                  <input type="hidden" name="household_id" value={newCitizenHouseholdId} />
                </div>
              </div>
              <label className="text-sm text-slate-300 md:col-span-2">
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
              <label className="text-sm text-slate-300 md:col-span-2">
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
              <label className="text-sm text-slate-300 md:col-span-2">
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
              <label className="text-sm text-slate-300 md:col-span-2">
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

      <DataTable columns={columnsWithActions} data={citizens} emptyMessage={emptyMessage} />
      <Button variant="ghost" onClick={() => void fetchCitizens(debouncedSearch)} disabled={loading}>
        {loading ? "Đang tải..." : "Tải lại"}
      </Button>
      <Dialog.Root
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelectedCitizen(null);
            setPaymentHistory([]);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[90vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-semibold text-white">
                  {selectedCitizen ? `Chi tiết nhân khẩu - ${selectedCitizen.full_name}` : "Chi tiết nhân khẩu"}
                </Dialog.Title>
                {selectedCitizen && (
                  <div className="mt-3 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                    <p>
                      <span className="text-slate-400">Mã nhân khẩu:</span> {selectedCitizen.citizen_code}
                    </p>
                    <p>
                      <span className="text-slate-400">Mã hộ:</span> {selectedCitizen.household_code ?? "-"}
                    </p>
                    <p>
                      <span className="text-slate-400">Quan hệ:</span>{" "}
                      {relationshipLabels[selectedCitizen.relationship_to_head] || selectedCitizen.relationship_to_head}
                    </p>
                    <p>
                      <span className="text-slate-400">Trạng thái:</span> {statusLabels[selectedCitizen.status]}
                    </p>
                    <p>
                      <span className="text-slate-400">Ngày sinh:</span>{" "}
                      {new Date(selectedCitizen.date_of_birth).toLocaleDateString("vi-VN")}
                    </p>
                    <p>
                      <span className="text-slate-400">Giới tính:</span> {selectedCitizen.gender}
                    </p>
                    <p>
                      <span className="text-slate-400">CMND/CCCD:</span> {selectedCitizen.national_id ?? "-"}
                    </p>
                    <p>
                      <span className="text-slate-400">Quốc tịch:</span> {selectedCitizen.nationality ?? "-"}
                    </p>
                    <p>
                      <span className="text-slate-400">Dân tộc:</span> {selectedCitizen.ethnicity ?? "-"}
                    </p>
                    <p>
                      <span className="text-slate-400">Nghề nghiệp:</span> {selectedCitizen.occupation ?? "-"}
                    </p>
                    <p className="col-span-2">
                      <span className="text-slate-400">Nguyên quán:</span> {selectedCitizen.birthplace ?? "-"}
                    </p>
                    <p className="col-span-2">
                      <span className="text-slate-400">Địa chỉ tạm trú:</span> {selectedCitizen.temporary_address ?? "-"}
                    </p>
                  </div>
                )}
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost">Đóng</Button>
              </Dialog.Close>
            </div>
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-white">Lịch sử thu phí</h4>
              <div className="mt-3 rounded-lg border border-slate-800">
                <table className="w-full table-auto text-sm text-slate-200">
                  <thead className="bg-slate-800/60 text-left text-slate-400">
                    <tr>
                      <th className="px-4 py-2">Khoản thu</th>
                      <th className="px-4 py-2">Mã hộ</th>
                      <th className="px-4 py-2">Số tiền</th>
                      <th className="px-4 py-2">Ngày nộp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPayments ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-slate-400">
                          Đang tải lịch sử...
                        </td>
                      </tr>
                    ) : paymentHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-slate-400">
                          Chưa có lịch sử thu phí
                        </td>
                      </tr>
                    ) : (
                      paymentHistory.map((payment) => (
                        <tr key={payment.id} className="border-t border-slate-800/60">
                          <td className="px-4 py-2">{payment.fee_name}</td>
                          <td className="px-4 py-2">{payment.household_code ?? "-"}</td>
                          <td className="px-4 py-2">{payment.amount_paid.toLocaleString("vi-VN")} ₫</td>
                          <td className="px-4 py-2">{new Date(payment.payment_date).toLocaleDateString("vi-VN")}</td>
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

type CitizenEditModalProps = {
  citizen: Citizen;
  householdOptions: Array<{ value: string; label: string; description?: string }>;
  onUpdate: (id: number, payload: Record<string, unknown>) => Promise<void>;
  onDelete: () => Promise<void>;
};

const CitizenEditModal = ({ citizen, householdOptions, onUpdate, onDelete }: CitizenEditModalProps) => {
  const [selectedHousehold, setSelectedHousehold] = useState(String(citizen.household_id));

  useEffect(() => {
    setSelectedHousehold(String(citizen.household_id));
  }, [citizen.household_id, citizen.id]);

  const handleDelete = async (close: () => void) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${citizen.full_name}"?`)) return;
    await onDelete();
    close();
  };

  return (
    <FormModal
      title={`Chỉnh sửa nhân khẩu - ${citizen.full_name}`}
      triggerLabel="Chỉnh sửa"
      triggerButtonProps={{ variant: "outline", size: "sm" }}
      onSubmit={async (formData, close) => {
      const payload = Object.fromEntries(formData.entries()) as Record<string, any>; 
      if (!payload.household_id) {
        alert("Vui lòng chọn hộ gia đình.");
        throw new Error("household_id missing");
      }
      payload.household_id = Number(payload.household_id);
      if (!payload.occupation) delete payload.occupation;
      if (!payload.temporary_address) delete payload.temporary_address;
      if (!payload.birthplace) delete payload.birthplace;
      if (!payload.ethnicity) delete payload.ethnicity;
      if (!payload.national_id) delete payload.national_id;
      await onUpdate(citizen.id, payload);
      close();
      }}
    >
      {({ close }) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            Mã nhân khẩu *
            <input
              name="citizen_code"
              defaultValue={citizen.citizen_code}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              required
            />
          </label>
          <label className="text-sm text-slate-300">
            Họ tên *
            <input
              name="full_name"
              defaultValue={citizen.full_name}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              required
            />
          </label>
          <div className="text-sm text-slate-300 md:col-span-2">
            Hộ gia đình *
            <div className="mt-1">
              <SearchableSelect
                value={selectedHousehold}
                onChange={(value) => setSelectedHousehold(value)}
                options={householdOptions}
                placeholder="-- Chọn hộ gia đình --"
                searchPlaceholder="Tìm mã hộ hoặc chủ hộ..."
                emptyMessage="Không tìm thấy hộ gia đình"
              />
              <input type="hidden" name="household_id" value={selectedHousehold} />
            </div>
          </div>
          <label className="text-sm text-slate-300 md:col-span-2">
            Quan hệ với chủ hộ *
            <select
              name="relationship_to_head"
              defaultValue={citizen.relationship_to_head}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
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
              defaultValue={citizen.date_of_birth.slice(0, 10)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              required
            />
          </label>
          <label className="text-sm text-slate-300">
            Giới tính *
            <select
              name="gender"
              defaultValue={citizen.gender}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              required
            >
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </label>
          <label className="text-sm text-slate-300 md:col-span-2">
            Nguyên quán
            <input
              name="birthplace"
              defaultValue={citizen.birthplace ?? ""}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-300">
            Quốc tịch
            <input
              name="nationality"
              defaultValue={citizen.nationality ?? ""}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-300">
            Dân tộc
            <input
              name="ethnicity"
              defaultValue={citizen.ethnicity ?? ""}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-300">
            CMND/CCCD
            <input
              name="national_id"
              defaultValue={citizen.national_id ?? ""}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-300 md:col-span-2">
            Trạng thái cư trú *
            <select
              name="status"
              defaultValue={citizen.status}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
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
              defaultValue={citizen.occupation ?? ""}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-300 md:col-span-2">
            Địa chỉ tạm trú
            <input
              name="temporary_address"
              defaultValue={citizen.temporary_address ?? ""}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
          </label>
          <div className="pt-2 text-right md:col-span-2">
            <Button
              type="button"
              variant="ghost"
              className="text-red-400 hover:text-red-300"
              onClick={() => void handleDelete(close)}
            >
              Xóa nhân khẩu
            </Button>
          </div>
        </div>
      )}
    </FormModal>
  );
};

export default CitizenPage;
