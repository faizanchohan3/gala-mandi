"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { Plus, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react"

export default function FinancePage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ type: "CREDIT", amount: "", description: "", reference: "", category: "" })

  async function loadData() {
    setLoading(true)
    const data = await fetch("/api/finance").then((r) => r.json())
    setTransactions(data.transactions || [])
    setSummary({ income: data.income || 0, expense: data.expense || 0, balance: data.balance || 0 })
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function handleSave() {
    if (!form.amount || !form.description) return alert("Amount and description required")
    const res = await fetch("/api/finance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    })
    if (res.ok) {
      setShowModal(false)
      setForm({ type: "CREDIT", amount: "", description: "", reference: "", category: "" })
      loadData()
    }
  }

  const categories = ["Sales", "Purchases", "Salary", "Rent", "Utilities", "Pesticides", "Miscellaneous"]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Finance</h2>
          <p className="text-gray-500 text-sm">Track income, expenses, and balance</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4" /> Add Transaction</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Income</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.income)}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.expense)}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Net Balance</p>
                <p className={`text-2xl font-bold ${summary.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  {formatCurrency(summary.balance)}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    {["Type", "Description", "Category", "Amount", "Reference", "By", "Date"].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {t.type === "CREDIT" ? (
                            <ArrowUpCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <ArrowDownCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`text-xs font-medium ${t.type === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
                            {t.type}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-gray-800">{t.description}</td>
                      <td className="py-3 px-3 text-gray-500">{t.category || "-"}</td>
                      <td className={`py-3 px-3 font-semibold ${t.type === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
                        {t.type === "CREDIT" ? "+" : "-"}{formatCurrency(t.amount)}
                      </td>
                      <td className="py-3 px-3 text-gray-500">{t.reference || "-"}</td>
                      <td className="py-3 px-3 text-gray-500">{t.createdBy?.name}</td>
                      <td className="py-3 px-3 text-gray-500">{formatDateTime(t.createdAt)}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">No transactions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREDIT">Income (Credit)</SelectItem>
                  <SelectItem value="DEBIT">Expense (Debit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount (PKR)</Label><Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>Description</Label><Input placeholder="e.g. Wheat sales, Rent payment" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference (optional)</Label><Input placeholder="Invoice #, Cheque #" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} className="flex-1">Add Transaction</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
