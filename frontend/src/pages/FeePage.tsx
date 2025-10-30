import { useEffect, useState } from "react";

import DataTable, { type Column } from "../components/DataTable";
import FormModal from "../components/FormModal";
import { Button } from "../components/ui/button";
import { feesApi } from "../services/api";

type Fee = {
  id: number;
  name: string;
  description?: string;
  amount: number;
  due_date?: string;
};

type Payment = {
  id: number;
  citizen_name: string;
  household_code?: string;
  amount_paid: number;
  payment_date: string;
};

const feeColumns: Column<Fee>[] = [
  { key: "name", header: "Khoản thu" },
  { key: "amount", header: "Số tiền", render: (row) => `${row.amount.toLocaleString("vi-VN")} ₫` },
  { key: "due_date", header: "Hạn nộp" }
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
  const [loadingFee, setLoadingFee] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const loadFees = async () => {
    setLoadingFee(true);
    try {
      const data = await feesApi.list();
      setFees(data);
    } catch (error) {
      console.error("Failed to load fees", error);
    } finally {
      setLoadingFee(false);
    }
  };

  const loadPayments = async (feeId: number) => {
    setLoadingPayments(true);
    try {
      const data = await feesApi.listPayments(feeId);
      setPayments(data);
    } catch (error) {
      console.error("Failed to load payments", error);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    void loadFees();
  }, []);

  useEffect(() => {
    if (selectedFee) {
      void loadPayments(selectedFee.id);
    } else {
      setPayments([]);
    }
  }, [selectedFee]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Quản lý thu phí</h2>
          <p className="text-sm text-slate-400">Thiết lập các khoản thu và ghi nhận thanh toán</p>
        </div>
        <FormModal
          title="Tạo khoản thu"
          triggerLabel="Thêm khoản thu"
          onSubmit={async (formData, close) => {
            const payload = Object.fromEntries(formData.entries()) as Record<string, any>;
            payload.amount = Number(payload.amount ?? 0);
            if (!payload.description) delete payload.description;
            if (!payload.due_date) delete payload.due_date;
            await feesApi.create(payload);
            await loadFees();
            close();
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Danh sách khoản thu</h3>
            <Button variant="ghost" onClick={() => void loadFees()} disabled={loadingFee}>
              {loadingFee ? "Đang tải..." : "Tải lại"}
            </Button>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <DataTable
              columns={feeColumns}
              data={fees}
              emptyMessage={loadingFee ? "Đang tải..." : "Chưa có khoản thu"}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {fees.map((fee) => (
                <Button
                  key={fee.id}
                  variant={selectedFee?.id === fee.id ? "default" : "outline"}
                  onClick={() => setSelectedFee(fee)}
                >
                  {fee.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Thanh toán</h3>
            {selectedFee && (
              <FormModal
                title={`Ghi nhận thanh toán - ${selectedFee.name}`}
                triggerLabel="Ghi nhận"
                onSubmit={async (formData, close) => {
                  const payload = Object.fromEntries(formData.entries()) as Record<string, any>;
                  payload.amount_paid = Number(payload.amount_paid ?? 0);
                  if (!payload.household_code) delete payload.household_code;
                  await feesApi.createPayment(selectedFee.id, payload);
                  await loadPayments(selectedFee.id);
                  close();
                }}
              >
                <div className="space-y-4">
                  <label className="text-sm text-slate-300">
                    Người nộp
                    <input
                      name="citizen_name"
                      className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-300">
                    Mã hộ
                    <input
                      name="household_code"
                      className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                    />
                  </label>
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
            )}
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            {selectedFee ? (
              <DataTable
                columns={paymentColumns}
                data={payments}
                emptyMessage={loadingPayments ? "Đang tải..." : "Chưa có thanh toán"}
              />
            ) : (
              <p className="text-sm text-slate-400">Chọn một khoản thu để xem thanh toán</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeePage;
