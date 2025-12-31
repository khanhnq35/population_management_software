import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "../components/ui/button";
import { citizensApi, feesApi, householdsApi } from "../services/api";

type DashboardFilters = {
  startDate: string;
  endDate: string;
  feeId: string;
};

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [householdCount, setHouseholdCount] = useState(0);
  const [citizenCount, setCitizenCount] = useState(0);
  const [feesList, setFeesList] = useState<Array<{ id: number; name: string }>>([]);
  const [filters, setFilters] = useState<DashboardFilters>({
    startDate: "",
    endDate: "",
    feeId: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.startDate) params.start_date = new Date(filters.startDate).toISOString();
      if (filters.endDate) params.end_date = new Date(filters.endDate).toISOString();
      if (filters.feeId) params.fee_id = parseInt(filters.feeId);

      const [dashboard, households, citizens, fees] = await Promise.all([
        feesApi.dashboardStats(params),
        householdsApi.list(),
        citizensApi.list(),
        feesApi.list()
      ]);

      setDashboardData(dashboard);
      setHouseholdCount(households.length ?? 0);
      setCitizenCount(citizens.length ?? 0);
      setFeesList(fees);
    } catch (error) {
      console.error("Dashboard load failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleFilterChange = (key: keyof DashboardFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilter = () => {
    void loadData();
  };

  const handleResetFilter = () => {
    setFilters({ startDate: "", endDate: "", feeId: "" });
    setTimeout(() => void loadData(), 0);
  };

  if (loading || !dashboardData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-lg text-slate-400">Đang tải...</p>
      </div>
    );
  }

  const completionRate = dashboardData.completion_rate || 0;
  const pieData = [
    { name: "Đã thu", value: dashboardData.total_collected, color: "#10b981" },
    { name: "Còn thiếu", value: dashboardData.total_outstanding, color: "#f59e0b" }
  ];

  const topLowCompletionFees = [...dashboardData.fees].slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Thống kê / Dashboard</h1>
          <p className="text-sm text-slate-400">Tổng quan thu phí và quản lý dân cư</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Bộ lọc</h3>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm text-slate-300">
            Từ ngày
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="mt-1 block rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-300">
            Đến ngày
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="mt-1 block rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            />
          </label>
          <label className="text-sm text-slate-300">
            Khoản thu
            <select
              value={filters.feeId}
              onChange={(e) => handleFilterChange("feeId", e.target.value)}
              className="mt-1 block rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
            >
              <option value="">Tất cả</option>
              {feesList.map((fee) => (
                <option key={fee.id} value={fee.id}>
                  {fee.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button onClick={handleApplyFilter} size="sm">
              Áp dụng
            </Button>
            <Button onClick={handleResetFilter} variant="outline" size="sm">
              Đặt lại
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Số hộ gia đình</p>
          <p className="mt-2 text-2xl font-semibold text-white">{householdCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Số nhân khẩu</p>
          <p className="mt-2 text-2xl font-semibold text-white">{citizenCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Tổng phải thu</p>
          <p className="mt-2 text-2xl font-semibold text-sky-400">
            {dashboardData.total_expected.toLocaleString("vi-VN")} ₫
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Tổng đã thu</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-400">
            {dashboardData.total_collected.toLocaleString("vi-VN")} ₫
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Tổng còn thiếu</p>
          <p className="mt-2 text-2xl font-semibold text-amber-400">
            {dashboardData.total_outstanding.toLocaleString("vi-VN")} ₫
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400">Tỷ lệ hoàn thành</p>
          <p className="mt-2 text-2xl font-semibold text-violet-400">{completionRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pie Chart - Collection Status */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Phân bố trạng thái thu phí</h2>
          <p className="text-sm text-slate-400">Tổng quan số tiền đã thu và còn thiếu</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${((entry.value / (dashboardData.total_expected || 1)) * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toLocaleString("vi-VN")} ₫`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart - Top Low Completion Fees */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Top khoản thu tỷ lệ thấp nhất</h2>
          <p className="text-sm text-slate-400">5 khoản thu có tỷ lệ hoàn thành thấp nhất</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topLowCompletionFees} layout="vertical">
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" width={120} stroke="#94a3b8" />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="completion_rate" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Debtors */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Top hộ còn nợ nhiều nhất</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 text-left text-slate-400">
                <tr>
                  <th className="pb-2">Mã hộ</th>
                  <th className="pb-2">Chủ hộ</th>
                  <th className="pb-2 text-right">Còn thiếu</th>
                  <th className="pb-2 text-right">Số khoản</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {dashboardData.top_debtors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-500">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  dashboardData.top_debtors.map((debtor: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-800/50">
                      <td className="py-2">{debtor.household_code}</td>
                      <td className="py-2">{debtor.head_of_household}</td>
                      <td className="py-2 text-right text-amber-400">{debtor.remaining.toLocaleString("vi-VN")} ₫</td>
                      <td className="py-2 text-right">{debtor.fee_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fee List */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Danh sách khoản thu</h2>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-slate-800 bg-slate-900 text-left text-slate-400">
                <tr>
                  <th className="pb-2">Tên khoản thu</th>
                  <th className="pb-2 text-right">Đã thu</th>
                  <th className="pb-2 text-right">Còn thiếu</th>
                  <th className="pb-2 text-right">%</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {dashboardData.fees.map((fee: any) => (
                  <tr key={fee.id} className="border-b border-slate-800/50">
                    <td className="py-2">{fee.name}</td>
                    <td className="py-2 text-right text-emerald-400">{fee.collected.toLocaleString("vi-VN")} ₫</td>
                    <td className="py-2 text-right text-amber-400">{fee.remaining.toLocaleString("vi-VN")} ₫</td>
                    <td className="py-2 text-right">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          fee.completion_rate >= 80
                            ? "bg-emerald-500/20 text-emerald-400"
                            : fee.completion_rate >= 50
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {fee.completion_rate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
