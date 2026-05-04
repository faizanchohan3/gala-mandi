"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Printer, BookOpen } from "lucide-react"

export default function CustomerLedgerPage() {
  const searchParams = useSearchParams()
  const [customers, setCustomers] = useState<any[]>([])
  const [customerId, setCustomerId] = useState("")
  const [ledger, setLedger] = useState<any>(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => {
        setCustomers(d.customers || [])
        const preselect = searchParams.get("id")
        if (preselect) setCustomerId(preselect)
      })
  }, [])

  // Auto-load when customerId is set via URL param
  useEffect(() => {
    if (customerId) loadLedger()
  }, [customerId])

  async function loadLedger() {
    if (!customerId) return
    setLoading(true)
    const params = new URLSearchParams()
    if (dateFrom) params.set("from", dateFrom)
    if (dateTo) params.set("to", dateTo)
    const data = await fetch(`/api/reports/customer-ledger/${customerId}?${params}`).then((r) => r.json())
    setLedger(data)
    setLoading(false)
  }

  const dateLabel =
    dateFrom || dateTo
      ? `${dateFrom ? formatDate(dateFrom) : "Start"} — ${dateTo ? formatDate(dateTo) : "Today"}`
      : "All Time"

  return (
    <div className="space-y-6">
      {/* Print header */}
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
        <h2 className="text-xl font-bold">Customer Ledger</h2>
        {ledger?.customer && <p className="text-base font-medium text-gray-700">{ledger.customer.name}</p>}
        <p className="text-sm text-gray-600">Period: {dateLabel}</p>
      </div>

      {/* Screen header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Ledger</h2>
          <p className="text-gray-500 text-sm">Full transaction history per customer</p>
        </div>
        {ledger && (
          <Button onClick={() => window.print()} variant="outline" className="gap-2">
            <Printer className="w-4 h-4" /> Print Ledger
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Customer *</label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">From Date</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">To Date</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={loadLedger} disabled={loading || !customerId} className="bg-green-700 hover:bg-green-800">
              {loading ? "Loading..." : "View Ledger"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!ledger && !loading && (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Select a customer to view their ledger</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-20 text-gray-400">Loading ledger...</div>
      )}

      {ledger && !loading && (
        <>
          {/* Customer Info + Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="md:col-span-2 bg-green-50">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 font-medium uppercase">Customer</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{ledger.customer?.name}</p>
                {ledger.customer?.phone && <p className="text-sm text-gray-600">{ledger.customer.phone}</p>}
                {ledger.customer?.address && <p className="text-xs text-gray-500">{ledger.customer.address}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 font-medium uppercase">Total Sales (Dr)</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(ledger.totalDebit)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 font-medium uppercase">Total Received (Cr)</p>
                <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(ledger.totalCredit)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Closing Balance Banner */}
          <div
            className={`rounded-lg px-5 py-4 flex items-center justify-between ${
              ledger.closingBalance > 0 ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"
            }`}
          >
            <div>
              <p className="text-sm font-medium text-gray-700">Closing Balance</p>
              <p className="text-xs text-gray-500">{ledger.entries?.length || 0} transactions</p>
            </div>
            <div className="text-right">
              <p
                className={`text-2xl font-bold ${
                  ledger.closingBalance > 0 ? "text-red-700" : "text-green-700"
                }`}
              >
                {formatCurrency(Math.abs(ledger.closingBalance))}
              </p>
              <p className={`text-sm font-semibold ${ledger.closingBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                {ledger.closingBalance > 0 ? "Outstanding (Customer Owes)" : ledger.closingBalance < 0 ? "Credit (Overpaid)" : "Settled"}
              </p>
            </div>
          </div>

          {/* Ledger Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Account Statement
                <span className="text-gray-400 font-normal text-sm">({ledger.entries?.length || 0} entries)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-t">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">#</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Description</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Debit (Dr)</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Credit (Cr)</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ledger.entries?.map((entry: any, i: number) => (
                      <tr key={i} className={entry.type === "PAYMENT" ? "bg-green-50/40" : ""}>
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(entry.date)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded ${
                              entry.type === "PAYMENT"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-xs">{entry.description}</td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-green-700">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            entry.balance > 0 ? "text-red-600" : "text-green-700"
                          }`}
                        >
                          {formatCurrency(Math.abs(entry.balance))}
                          {entry.balance !== 0 && (
                            <span className="text-xs ml-1 font-normal">
                              {entry.balance > 0 ? "Dr" : "Cr"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {ledger.entries?.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 font-bold text-gray-700">Closing Balance</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {formatCurrency(ledger.totalDebit)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">
                        {formatCurrency(ledger.totalCredit)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold text-lg ${
                          ledger.closingBalance > 0 ? "text-red-600" : "text-green-700"
                        }`}
                      >
                        {formatCurrency(Math.abs(ledger.closingBalance))}
                        <span className="text-sm ml-1 font-normal">
                          {ledger.closingBalance > 0 ? "Dr" : "Cr"}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
