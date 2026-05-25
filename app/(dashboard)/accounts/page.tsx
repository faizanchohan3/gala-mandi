"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Plus, Edit, X, BookOpen, TrendingUp, TrendingDown, Landmark,
  ArrowUpCircle, ArrowDownCircle, Loader2,
} from "lucide-react"

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const
type AccountType = (typeof ACCOUNT_TYPES)[number]

const TYPE_META: Record<AccountType, { label: string; color: string; bg: string; border: string }> = {
  ASSET:     { label: "Assets",      color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  LIABILITY: { label: "Liabilities", color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
  EQUITY:    { label: "Equity",      color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  INCOME:    { label: "Income",      color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200" },
  EXPENSE:   { label: "Expenses",    color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
}

const BLANK_FORM = { code: "", name: "", type: "EXPENSE" as AccountType, description: "" }

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [detail, setDetail] = useState<any>(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)

  async function loadAccounts() {
    setLoading(true)
    const data = await fetch("/api/accounts").then((r) => r.json())
    setAccounts(data.accounts || [])
    setLoading(false)
  }

  useEffect(() => { loadAccounts() }, [])

  async function handleSeed() {
    if (!confirm("This will create 25 default accounts (Assets, Liabilities, Income, Expenses). Continue?")) return
    setSeeding(true)
    const res = await fetch("/api/accounts/seed", { method: "POST" })
    const data = await res.json()
    setSeeding(false)
    if (data.skipped) alert("Accounts already exist — seed skipped.")
    else { loadAccounts() }
  }

  function openAdd() {
    setEditing(null)
    setForm(BLANK_FORM)
    setShowModal(true)
  }

  function openEdit(a: any) {
    setEditing(a)
    setForm({ code: a.code, name: a.name, type: a.type, description: a.description || "" })
    setShowModal(true)
  }

  async function openDetail(a: any) {
    setSelected(a)
    setDetail(null)
    setShowDetail(true)
    const data = await fetch(`/api/accounts/${a.id}`).then((r) => r.json())
    setDetail(data)
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) return alert("Code and name are required")
    setSaving(true)
    const url = editing ? `/api/accounts/${editing.id}` : "/api/accounts"
    const method = editing ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { setShowModal(false); loadAccounts() }
    else { const d = await res.json(); alert(d.error || "Failed to save") }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deactivate account "${name}"?`)) return
    await fetch(`/api/accounts/${id}`, { method: "DELETE" })
    loadAccounts()
  }

  const grouped = ACCOUNT_TYPES.reduce((acc, type) => {
    acc[type] = accounts.filter((a) => a.type === type)
    return acc
  }, {} as Record<AccountType, any[]>)

  const totalIncome  = grouped.INCOME.reduce((s, a) => s + a.balance, 0)
  const totalExpense = grouped.EXPENSE.reduce((s, a) => s + a.balance, 0)
  const totalAsset   = grouped.ASSET.reduce((s, a) => s + a.balance, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chart of Accounts</h2>
          <p className="text-gray-500 text-sm">{accounts.length} accounts</p>
        </div>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <Button variant="outline" onClick={handleSeed} disabled={seeding}>
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              Load Default Accounts
            </Button>
          )}
          <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Account</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Income</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-200" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalExpense)}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-orange-200" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Assets</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAsset)}</p>
            </div>
            <Landmark className="w-8 h-8 text-blue-200" />
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading accounts...</div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium mb-2">No accounts yet</p>
            <p className="text-gray-400 text-sm mb-5">Click "Load Default Accounts" to set up a standard chart of accounts for a grain mandi</p>
            <Button onClick={handleSeed} disabled={seeding}>
              {seeding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BookOpen className="w-4 h-4 mr-2" />}
              Load Default Accounts
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {ACCOUNT_TYPES.map((type) => {
            const group = grouped[type]
            if (group.length === 0) return null
            const meta = TYPE_META[type]
            const groupTotal = group.reduce((s, a) => s + a.balance, 0)
            return (
              <Card key={type} className={`border ${meta.border}`}>
                <CardHeader className={`${meta.bg} rounded-t-lg py-3 px-5`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className={`text-sm font-bold uppercase tracking-wide ${meta.color}`}>
                      {meta.label}
                    </CardTitle>
                    <span className={`text-sm font-bold ${meta.color}`}>{formatCurrency(groupTotal)}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-4 text-gray-400 font-medium text-xs w-20">Code</th>
                        <th className="text-left py-2 px-4 text-gray-400 font-medium text-xs">Account Name</th>
                        <th className="text-left py-2 px-4 text-gray-400 font-medium text-xs hidden md:table-cell">Description</th>
                        <th className="text-right py-2 px-4 text-gray-400 font-medium text-xs">Balance</th>
                        <th className="text-right py-2 px-4 text-gray-400 font-medium text-xs w-24">Txns</th>
                        <th className="py-2 px-4 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {group.map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-4 font-mono text-xs text-gray-500">{a.code}</td>
                          <td className="py-2.5 px-4">
                            <button
                              onClick={() => openDetail(a)}
                              className={`font-semibold hover:underline ${meta.color}`}
                            >
                              {a.name}
                            </button>
                          </td>
                          <td className="py-2.5 px-4 text-gray-400 text-xs hidden md:table-cell">{a.description || "—"}</td>
                          <td className={`py-2.5 px-4 text-right font-semibold ${a.balance > 0 ? meta.color : "text-gray-400"}`}>
                            {formatCurrency(a.balance)}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                              {a._count?.transactions || 0}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => openEdit(a)} className="p-1 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="Edit">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(a.id, a.name)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Deactivate">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Account" : "Add Account"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Account Code *</Label>
                <Input
                  placeholder="e.g. 5002"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div>
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as AccountType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Account Name *</Label>
              <Input
                placeholder="e.g. Transport / Freight"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                placeholder="Optional description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "Saving..." : editing ? "Update" : "Add Account"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Detail / Ledger Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {selected?.code} — {selected?.name}
              {selected && (
                <span className={`text-xs px-2 py-0.5 rounded-full ml-1 ${TYPE_META[selected.type as AccountType]?.bg} ${TYPE_META[selected.type as AccountType]?.color}`}>
                  {TYPE_META[selected.type as AccountType]?.label}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {!detail ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(detail.account.balance)}</p>
                  <p className="text-xs text-gray-500 mt-1">Running Balance</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{detail.entries.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Transactions</p>
                </div>
              </div>

              {detail.entries.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No transactions posted to this account yet</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Date</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Description</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium text-xs">Debit</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium text-xs">Credit</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium text-xs">Balance</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {detail.entries.map((e: any, i: number) => (
                        <tr key={i} className={e.type === "CREDIT" ? "bg-green-50/30" : ""}>
                          <td className="py-2 px-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(e.createdAt)}</td>
                          <td className="py-2 px-3 text-gray-700 text-xs max-w-xs">
                            <p className="truncate">{e.description}</p>
                            {e.reference && <p className="text-gray-400 text-xs">{e.reference}</p>}
                          </td>
                          <td className="py-2 px-3 text-right text-red-600 font-medium">
                            {e.type === "DEBIT" ? formatCurrency(e.amount) : "—"}
                          </td>
                          <td className="py-2 px-3 text-right text-green-600 font-medium">
                            {e.type === "CREDIT" ? formatCurrency(e.amount) : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-gray-800">
                            {formatCurrency(e.runningBalance)}
                          </td>
                          <td className="py-2 px-3 text-gray-400 text-xs">{e.createdBy?.name}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={4} className="py-2 px-3 font-bold text-gray-700 text-xs">Closing Balance</td>
                        <td className="py-2 px-3 text-right font-bold text-gray-900">{formatCurrency(detail.closingBalance)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
