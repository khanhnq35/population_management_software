import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import DataTable, { type Column } from "../components/DataTable";
import DialogConfirm from "../components/DialogConfirm";
import FormModal from "../components/FormModal";
import SearchableSelect from "../components/SearchableSelect";
import { Button } from "../components/ui/button";
import useDebounce from "../lib/useDebounce";
import { citizensApi, feesApi, householdsApi } from "../services/api";

type Fee = {
  id: number;
  name: string;
  description?: string;
  amount: number;
  start_date?: string;
  due_date?: string;
  collected: number;
  remaining: number;
};

type Payment = {
  id: number;
  citizen_name: string;
  household_code?: string;
  amount_paid: number;
  payment_date: string;
  citizen_id?: number;
};

type HouseholdOption = {
  id: number;
  household_code: string;
  head_of_household?: string;
};

type CitizenOption = {
  id: number;
  full_name: string;
  household_code: string;
};

const formatCurrency = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;
const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString("vi-VN") : "-");
const extractErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null) {
    const detail = (error as any)?.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

const feeColumns: Column<Fee>[] = [
  { key: "name", header: "Khoản thu" },
  { key: "amount", header: "Số tiền", render: (row) => formatCurrency(row.amount) },
  { key: "collected", header: "Đã thu", render: (row) => formatCurrency(row.collected) },
  { key: "remaining", header: "Còn phải đóng", render: (row) => formatCurrency(row.remaining) },
  { key: "start_date", header: "Ngày bắt đầu", render: (row) => formatDate(row.start_date) },
  { key: "due_date", header: "Hạn nộp", render: (row) => formatDate(row.due_date) }
];

const paymentColumns: Column<Payment>[] = [
  { key: "citizen_name", header: "Người nộp" },
  { key: "household_code", header: "Mã hộ" },
  { key: "amount_paid", header: "Số tiền", render: (row) => `${row.amount_paid.toLocaleString("vi-VN")} ₫` },
  { key: "payment_date", header: "Ngày nộp" }
];

const FeePage = () => {
  const [fees, setFees] = useState<Fee[]>([]);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);
  const [loadingFee, setLoadingFee] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feeSearchTerm, setFeeSearchTerm] = useState("");
  const [paymentSearchTerm, setPaymentSearchTerm] = useState("");
  const [paymentHouseholdCode, setPaymentHouseholdCode] = useState("");
  const [paymentCitizens, setPaymentCitizens] = useState<CitizenOption[]>([]);
  const [paymentCitizenId, setPaymentCitizenId] = useState<number | null>(null);
  const [loadingPaymentCitizens, setLoadingPaymentCitizens] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const paymentImportInputRef = useRef<HTMLInputElement>(null);
  const debouncedFeeSearch = useDebounce(feeSearchTerm, 400);
  const debouncedPaymentSearch = useDebounce(paymentSearchTerm, 300);
  const clearError = () => setErrorMessage(null);
  const showError = (error: unknown, fallback: string) => {
    const message = extractErrorMessage(error, fallback);
    console.error(fallback, error);
    setErrorMessage(message);
  };

  const loadFees = async (keyword?: string) => {
    setLoadingFee(true);
    try {
      const effectiveKeyword = keyword ?? debouncedFeeSearch;
      const data = await feesApi.list(effectiveKeyword || undefined);
      setFees(data);
      clearError();
      setSelectedFee((prev) => {
        if (!prev) return null;
        return data.find((fee) => fee.id === prev.id) ?? null;
      });
    } catch (error) {
      showError(error, "Không thể tải danh sách khoản thu. Vui lòng thử lại.");
    } finally {
      setLoadingFee(false);
    }
  };

  const loadPayments = async (feeId: number) => {
    setLoadingPayments(true);
    try {
      const data = await feesApi.listPayments(feeId);
      setPayments(data);
      clearError();
    } catch (error) {
      showError(error, "Không thể tải danh sách thanh toán.");
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    void loadHouseholds();
  }, []);

  useEffect(() => {
    void loadFees(debouncedFeeSearch);
  }, [debouncedFeeSearch]);

  const loadHouseholds = async () => {
    try {
      const data = await householdsApi.list();
      setHouseholds(data);
      clearError();
    } catch (error) {
      showError(error, "Không thể tải danh sách hộ gia đình.");
    }
  };

  const resetPaymentForm = () => {
    setPaymentHouseholdCode("");
    setPaymentCitizens([]);
    setPaymentCitizenId(null);
    setLoadingPaymentCitizens(false);
  };

  const handlePaymentHouseholdChange = async (code: string) => {
    setPaymentHouseholdCode(code);
    setPaymentCitizenId(null);
    setPaymentCitizens([]);
    if (!code) return;
    setLoadingPaymentCitizens(true);
    try {
      const data = await citizensApi.list({ household_code: code });
      setPaymentCitizens(data);
      clearError();
    } catch (error) {
      showError(error, "Không thể tải danh sách nhân khẩu cho hộ đã chọn.");
    } finally {
      setLoadingPaymentCitizens(false);
    }
  };

  const householdOptions = useMemo(
    () =>
      households.map((household) => ({
        value: household.household_code,
        label: household.household_code,
        description: household.head_of_household ? `Chủ hộ: ${household.head_of_household}` : undefined
      })),
    [households]
  );

  const paymentCitizenOptions = useMemo(
    () =>
      paymentCitizens.map((citizen) => ({
        value: String(citizen.id),
        label: citizen.full_name
      })),
    [paymentCitizens]
  );

  const selectedCitizen = paymentCitizens.find((citizen) => citizen.id === paymentCitizenId) ?? null;

  const filteredPayments = useMemo(() => {
    const query = debouncedPaymentSearch.trim().toLowerCase();
    if (!query) {
      return payments;
    }
    return payments.filter((payment) => {
      const tokens = [
        payment.citizen_name.toLowerCase(),
        payment.household_code?.toLowerCase() ?? "",
        payment.amount_paid.toString()
      ];
      return tokens.some((token) => token.includes(query));
    });
  }, [payments, debouncedPaymentSearch]);

  const feeEmptyMessage = loadingFee
    ? "Đang tải..."
    : debouncedFeeSearch
      ? "Không có khoản thu phù hợp"
      : "Chưa có khoản thu";

  const paymentEmptyMessage = loadingPayments
    ? "Đang tải..."
    : debouncedPaymentSearch
      ? "Không tìm thấy thanh toán"
      : "Chưa có thanh toán";

  useEffect(() => {
    if (paymentModalOpen && selectedFee) {
      void loadPayments(selectedFee.id);
    }
  }, [paymentModalOpen, selectedFee]);

  const handleDeleteFee = async (id: number) => {
    try {
      await feesApi.delete(id);
      if (selectedFee?.id === id) {
        setSelectedFee(null);
      }
      await loadFees();
    } catch (error) {
      showError(error, "Không thể xóa khoản thu. Vui lòng thử lại.");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await feesApi.importExcel(file);
      alert(`Import thành công: ${result.imported} khoản thu, ${result.errors} lỗi`);
      await loadFees();
    } catch (error) {
      showError(error, "Không thể import file. Vui lòng kiểm tra định dạng file.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExport = async () => {
    try {
      await feesApi.exportExcel();
    } catch (error) {
      showError(error, "Không thể export file. Vui lòng thử lại.");
    }
  };

  const buildFeePayload = (formData: FormData) => {
    const payload = Object.fromEntries(formData.entries()) as Record<string, any>;
    payload.amount = Number(payload.amount ?? 0);
    if (!payload.description) delete payload.description;
    if (!payload.due_date) delete payload.due_date;
    if (!payload.start_date) delete payload.start_date;
    return payload;
  };

  const feeColumnsWithActions: Column<Fee>[] = [
    ...feeColumns,
    {
      key: "id" as keyof Fee,
      header: "Thao tác",
      render: (row) => (
        <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); openPayments(row); }}>
            Xem chi tiết
          </Button>
          <FormModal
            title={`Chỉnh sửa khoản thu - ${row.name}`}
            triggerLabel="Chỉnh sửa"
            triggerButtonProps={{ variant: "outline", size: "sm", onClick: (event) => event.stopPropagation() }}
            onSubmit={async (formData, close) => {
              try {
                const payload = buildFeePayload(formData);
                await feesApi.update(row.id, payload);
                await loadFees();
                clearError();
                close();
              } catch (error) {
                showError(error, "Không thể cập nhật khoản thu. Vui lòng thử lại.");
                throw error;
              }
            }}
          >
            {({ close }) => (
              <div className="grid grid-cols-1 gap-4">
                <label className="text-sm text-slate-300">
                  Tên khoản thu
                  <input
                    name="name"
                    defaultValue={row.name}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                    required
                  />
                </label>
                <label className="text-sm text-slate-300">
                  Số tiền (VNĐ)
                  <input
                    name="amount"
                    type="number"
                    defaultValue={row.amount}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                    required
                  />
                </label>
                <label className="text-sm text-slate-300">
                  Ngày bắt đầu
                  <input
                    name="start_date"
                    type="date"
                    defaultValue={row.start_date ? row.start_date.slice(0, 10) : ""}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  />
                </label>
                <label className="text-sm text-slate-300">
                  Hạn nộp
                  <input
                    name="due_date"
                    type="date"
                    defaultValue={row.due_date ? row.due_date.slice(0, 10) : ""}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  />
                </label>
                <label className="text-sm text-slate-300">
                  Mô tả
                  <textarea
                    name="description"
                    defaultValue={row.description ?? ""}
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  />
                </label>
                <div className="pt-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => {
                      if (!window.confirm(`Bạn có chắc chắn muốn xóa khoản thu "${row.name}"?`)) return;
                      void handleDeleteFee(row.id).then(close);
                    }}
                  >
                    Xóa khoản thu
                  </Button>
                </div>
              </div>
            )}
          </FormModal>
        </div>
      )
    }
  ];

  const openPayments = (fee: Fee) => {
    setSelectedFee(fee);
    setPaymentSearchTerm("");
    setPaymentModalOpen(true);
  };

  const handlePaymentDialogChange = (open: boolean) => {
    setPaymentModalOpen(open);
    if (!open) {
      setSelectedFee(null);
      setPayments([]);
      setPaymentSearchTerm("");
      resetPaymentForm();
    }
  };

  const handleImportPayments = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!selectedFee || !file) {
      event.target.value = "";
      return;
    }
    try {
      const result = await feesApi.importPayments(selectedFee.id, file);
      alert(`Import thành công: ${result.imported} thanh toán, ${result.errors} lỗi`);
      await loadPayments(selectedFee.id);
      clearError();
    } catch (error) {
      showError(error, "Không thể import thanh toán. Vui lòng kiểm tra file.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="flex items-start justify-between rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          <span>{errorMessage}</span>
          <button
            type="button"
            className="ml-4 text-xs font-semibold uppercase tracking-wide hover:text-white"
            onClick={clearError}
          >
            Đóng
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Quản lý thu phí</h2>
          <p className="text-sm text-slate-400">Thiết lập các khoản thu và ghi nhận thanh toán</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <input
            type="text"
            value={feeSearchTerm}
            onChange={(event) => setFeeSearchTerm(event.target.value)}
            placeholder="Tìm kiếm khoản thu..."
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
            title="Tạo khoản thu"
            triggerLabel="Thêm khoản thu"
            onSubmit={async (formData, close) => {
              try {
                const payload = buildFeePayload(formData);
                await feesApi.create(payload);
                await loadFees();
                clearError();
                close();
              } catch (error) {
                showError(error, "Không thể tạo khoản thu. Vui lòng thử lại.");
                throw error;
              }
            }}
          >
            <div className="grid grid-cols-1 gap-4">
              <label className="text-sm text-slate-300">
                Tên khoản thu
                <input
                  name="name"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  required
                />
              </label>
              <label className="text-sm text-slate-300">
                Số tiền (VNĐ)
                <input
                  name="amount"
                  type="number"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  required
                />
              </label>
              <label className="text-sm text-slate-300">
                Ngày bắt đầu
                <input
                  name="start_date"
                  type="date"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </label>
              <label className="text-sm text-slate-300">
                Hạn nộp
                <input
                  name="due_date"
                  type="date"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </label>
              <label className="text-sm text-slate-300">
                Mô tả
                <textarea
                  name="description"
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                />
              </label>
            </div>
          </FormModal>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Danh sách khoản thu</h3>
          <Button variant="ghost" onClick={() => void loadFees()} disabled={loadingFee}>
            {loadingFee ? "Đang tải..." : "Tải lại"}
          </Button>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <DataTable columns={feeColumnsWithActions} data={fees} emptyMessage={feeEmptyMessage} getRowId={(fee) => fee.id} />
        </div>
      </div>

      <Dialog.Root open={paymentModalOpen} onOpenChange={handlePaymentDialogChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 max-h-[90vh] w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-semibold text-white">
                  {selectedFee ? `Thanh toán - ${selectedFee.name}` : "Thanh toán"}
                </Dialog.Title>
                {selectedFee && (
                  <div className="mt-2 text-sm text-slate-300">
                    <p>Số tiền: {formatCurrency(selectedFee.amount)}</p>
                    <p>Đã thu: {formatCurrency(selectedFee.collected)}</p>
                    <p>Còn thiếu: {formatCurrency(selectedFee.remaining)}</p>
                  </div>
                )}
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost">Đóng</Button>
              </Dialog.Close>
            </div>
            {selectedFee && (
              <>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={paymentSearchTerm}
                      onChange={(event) => setPaymentSearchTerm(event.target.value)}
                      placeholder="Tìm người nộp, mã hộ..."
                      className="h-10 w-full min-w-[220px] rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none md:w-72"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                  <input
                    ref={paymentImportInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportPayments}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" onClick={() => paymentImportInputRef.current?.click()}>
                    Import Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => feesApi.exportPayments(selectedFee.id)}>
                    Export Excel
                  </Button>
                    <FormModal
                      title={`Ghi nhận thanh toán - ${selectedFee.name}`}
                      triggerLabel="Ghi nhận"
                      onOpenChange={(isOpen) => {
                        if (!isOpen) resetPaymentForm();
                      }}
                      onSubmit={async (formData, close) => {
                        try {
                          const payload = Object.fromEntries(formData.entries()) as Record<string, any>;
                          payload.amount_paid = Number(payload.amount_paid ?? 0);
                          if (!payload.household_code) {
                            throw new Error("Vui lòng chọn hộ gia đình.");
                          }
                          payload.citizen_id = payload.citizen_id ? Number(payload.citizen_id) : null;
                          if (!payload.citizen_id) {
                            throw new Error("Vui lòng chọn người nộp.");
                          }
                          await feesApi.createPayment(selectedFee.id, payload);
                          const updatedFees = await feesApi.list();
                          setFees(updatedFees);
                          const updatedSelectedFee = updatedFees.find((fee) => fee.id === selectedFee.id);
                          if (updatedSelectedFee) {
                            setSelectedFee(updatedSelectedFee);
                          }
                          await loadPayments(selectedFee.id);
                          resetPaymentForm();
                          clearError();
                          close();
                        } catch (error) {
                          showError(error, "Không thể tạo thanh toán. Vui lòng kiểm tra lại thông tin.");
                          throw error;
                        }
                      }}
                    >
                      <div className="space-y-4">
                        <div className="text-sm text-slate-300">
                          Hộ gia đình *
                          <div className="mt-1">
                            <SearchableSelect
                              value={paymentHouseholdCode}
                              onChange={(value) => void handlePaymentHouseholdChange(value)}
                              options={householdOptions}
                              placeholder="-- Chọn mã hộ --"
                              searchPlaceholder="Nhập mã hộ hoặc chủ hộ..."
                              emptyMessage="Không tìm thấy hộ"
                            />
                            <input type="hidden" name="household_code" value={paymentHouseholdCode} />
                          </div>
                        </div>
                        <div className="text-sm text-slate-300">
                          Người nộp *
                          <div className="mt-1">
                            <SearchableSelect
                              value={paymentCitizenId ? String(paymentCitizenId) : ""}
                              onChange={(value) => setPaymentCitizenId(value ? Number(value) : null)}
                              options={paymentCitizenOptions}
                              placeholder={
                                paymentHouseholdCode
                                  ? loadingPaymentCitizens
                                    ? "Đang tải nhân khẩu..."
                                    : "-- Chọn người nộp --"
                                  : "Chọn hộ gia đình trước"
                              }
                              searchPlaceholder="Nhập tên người nộp..."
                              emptyMessage={
                                paymentHouseholdCode && !loadingPaymentCitizens
                                  ? "Không tìm thấy nhân khẩu"
                                  : "Chưa có dữ liệu"
                              }
                              disabled={!paymentHouseholdCode || loadingPaymentCitizens || paymentCitizenOptions.length === 0}
                            />
                            <input type="hidden" name="citizen_id" value={paymentCitizenId ?? ""} />
                          </div>
                        </div>
                        <input type="hidden" name="citizen_name" value={selectedCitizen?.full_name ?? ""} />
                        <label className="text-sm text-slate-300">
                          Số tiền nộp
                          <input
                            type="number"
                            name="amount_paid"
                            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                            required
                          />
                        </label>
                      </div>
                    </FormModal>
                  </div>
                </div>
                <div className="mt-4">
                  <DataTable columns={paymentColumns} data={filteredPayments} emptyMessage={paymentEmptyMessage} />
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default FeePage;
