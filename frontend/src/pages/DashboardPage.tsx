import { useEffect, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { citizensApi, feesApi, householdsApi } from "../services/api";

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ expected_total: 0, collected_total: 0, outstanding: 0 });
  const [householdCount, setHouseholdCount] = useState(0);
  const [citizenCount, setCitizenCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [feeStats, households, citizens] = await Promise.all([
          feesApi.stats(),
          householdsApi.list(),
          citizensApi.list()
        ]);
        setStats(feeStats);
        setHouseholdCount(households.length ?? 0);
        setCitizenCount(citizens.length ?? 0);
      } catch (error) {
        console.error("Dashboard data load failed", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const chartData = [
    { name: "Tổng thu", value: stats.expected_total },
    { name: "Đã thu", value: stats.collected_total },
    { name: "Còn thiếu", value: stats.outstanding }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[220px] rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-400">Số hộ gia đình</p>
          <p className="mt-2 text-3xl font-semibold text-white">{loading ? "--" : householdCount}</p>
        </div>
        <div className="flex-1 min-w-[220px] rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-400">Số nhân khẩu</p>
          <p className="mt-2 text-3xl font-semibold text-white">{loading ? "--" : citizenCount}</p>
        </div>
        <div className="flex-1 min-w-[220px] rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-400">Tổng số phí dự kiến</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {loading ? "--" : stats.expected_total.toLocaleString("vi-VN")}{" "}₫
          </p>
        </div>
        <div className="flex-1 min-w-[220px] rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-400">Đã thu</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-400">
            {loading ? "--" : stats.collected_total.toLocaleString("vi-VN")}{" "}₫
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-white">Tình hình thu phí</h2>
        <p className="text-sm text-slate-400">Theo dõi tổng quan các khoản thu</p>
        <div className="mt-6 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={{ stroke: "#1e293b" }} />
              <YAxis stroke="#94a3b8" tickFormatter={(value) => `${(value / 1_000_000).toFixed(1)}tr`} axisLine={{ stroke: "#1e293b" }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#38bdf8" fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
