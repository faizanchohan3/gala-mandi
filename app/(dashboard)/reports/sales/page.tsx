"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils"
import { Printer, ShoppingCart } from "lucide-react"

export default function SalesReportPage() {
  const [sales, setSales] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [totals, setTotals] = useState({ totalAmount: 0, totalPaid: 0, totalBalance: 0 })
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [customerId, setCustomerId] = useState("all")
  const [loading, setLoading] = useState(false)
  const [printed, setPrinted] = useState(false)

  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then((d) => setCustomers(d.customers || []))
    loadReport()
  }, [])

  async function loadReport() {
    setLoading(true)
    const params = new URLSearchParams()
    if (dateFrom) params.set("from", dateFrom)
    if (dateTo) params.set("to", dateTo)
    if (customerId !== "all") params.set("customerId", customerId)
    const data = await fetch(`/api/reports/sales?${params}`).then((r) => r.json())
    setSales(data.sales || [])
    setTotals({ totalAmount: data.totalAmount || 0, totalPaid: data.totalPaid || 0, totalBalance: data.totalBalance || 0 })
    setLoading(false)
  }

  const dateLabel = dateFrom || dateTo
    ? `${dateFrom ? formatDate(dateFrom) : "Start"} — ${dateTo ? formatDate(dateTo) : "Today"}`
    : "All Time"

  return (
    <div className="space-y-6">
      {/* Print header (hidden on screen) */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center justify-between border-b-2 border-gray-800 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gala Mandi</h1>
            <p className="text-sm text-gray-500">Shop Management System</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Generated: {new Date().toLocaleDateString("en-PK")}</p>
          </div>
        </div>
        <h2 className="text-xl font-bold">Sales Report</h2>
        <p className="text-sm text-gray-600">Period: {dateLabel}</p>
      </div>

      {/* Screen header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales Report</h2>
          <p className="text-gray-500 text-sm">Detailed sales transactions</p>
        </div>
        <Button onClick={() => window.print()} variant="outline" className="gap-2">
          <Printer className="w-4 h-4" /> Print Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">From Date</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">To Date</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Customer</label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadReport} disabled={loading} className="bg-green-700 hover:bg-green-800">
              {loading ? "Loading..." : "Apply Filter"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Amount</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totals.totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Paid</p>
            <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totals.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Outstanding Balance</p>
            <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totals.totalBalance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Sales Transactions
            <span className="text-gray-400 font-normal text-sm">({sales.length} records)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-t">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Items</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Total</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Paid</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Balance</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600 text-xs uppercase print:hidden">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(sale.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{sale.customer?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                      {sale.items?.map((item: any) => `${item.quantity} ${item.product?.unit} ${item.product?.name}`).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(sale.totalAmount)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{formatCurrency(sale.paidAmount)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(sale.balance)}</td>
                    <td className="px-4 py-3 text-center print:hidden">
                      <Badge className={`text-xs ${getStatusColor(sale.status)}`}>{sale.status}</Badge>
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">No sales found for selected filters</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 font-bold text-gray-700">Total — {sales.length} sales</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(totals.totalAmount)}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(totals.totalPaid)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(totals.totalBalance)}</td>
                  <td className="print:hidden"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
