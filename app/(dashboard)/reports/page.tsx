"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts"
import { BarChart3, TrendingUp, Package, Sprout } from "lucide-react"

const COLORS = ["#15803d", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

export default function ReportsPage() {
  const [monthlySales, setMonthlySales] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [financeData, setFinanceData] = useState({ income: 0, expense: 0, balance: 0 })
  const [pesticidesData, setPesticidesData] = useState<any[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [loading, setLoading] = useState(true)

  async function loadReports() {
    setLoading(true)
    const [ms, fi] = await Promise.all([
      fetch("/api/reports/monthly-sales").then((r) => r.json()),
      fetch("/api/finance").then((r) => r.json()),
    ])
    setMonthlySales(ms.data || [])
    setFinanceData({ income: fi.income || 0, expense: fi.expense || 0, balance: fi.balance || 0 })
    setLoading(false)
  }

  useEffect(() => { loadReports() }, [])

  const financeChartData = [
    { name: "Income", value: financeData.income, color: "#15803d" },
    { name: "Expenses", value: financeData.expense, color: "#ef4444" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
        <p className="text-gray-500 text-sm">Business performance overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-700 to-green-800 text-white border-0">
          <CardContent className="p-5">
            <TrendingUp className="w-6 h-6 mb-2 opacity-80" />
            <p className="text-2xl font-bold">{formatCurrency(financeData.income)}</p>
            <p className="text-green-200 text-sm">Total Income</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
          <CardContent className="p-5">
            <TrendingUp className="w-6 h-6 mb-2 opacity-80 rotate-180" />
            <p className="text-2xl font-bold">{formatCurrency(financeData.expense)}</p>
            <p className="text-red-200 text-sm">Total Expenses</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0">
          <CardContent className="p-5">
            <BarChart3 className="w-6 h-6 mb-2 opacity-80" />
            <p className="text-2xl font-bold">{formatCurrency(financeData.balance)}</p>
            <p className="text-blue-200 text-sm">Net Balance</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0">
          <CardContent className="p-5">
            <Package className="w-6 h-6 mb-2 opacity-80" />
            <p className="text-2xl font-bold">{monthlySales.length > 0 ? formatCurrency(monthlySales[monthlySales.length - 1]?.sales || 0) : "—"}</p>
            <p className="text-purple-200 text-sm">This Month Sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Monthly Sales Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₨${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Bar dataKey="sales" fill="#15803d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={financeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {financeChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {financeChartData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                  <span className="text-gray-600">{d.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">6-Month Sales Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₨${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
              <Line type="monotone" dataKey="sales" stroke="#15803d" strokeWidth={2} dot={{ fill: "#15803d", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
