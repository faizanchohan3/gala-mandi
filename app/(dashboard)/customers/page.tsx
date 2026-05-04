"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils"
import {
  Plus, Search, Edit, Phone, MapPin, Wallet,
  TrendingUp, ArrowDownCircle, Eye, Users, X,
  BookOpen, ShoppingCart, ExternalLink, Camera, UserCheck,
  CreditCard, Shield,
} from "lucide-react"
import Link from "next/link"

type Tab = "sales" | "ledger"

const DEFAULT_FORM = {
  name: "", phone: "", address: "",
  image: "", referenceName: "", referencePhone: "", creditLimit: "0",
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [selected, setSelected] = useState<any>(null)
  const [detail, setDetail] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>("ledger")
  const [form, setForm] = useState(DEFAULT_FORM)
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "CASH", notes: "" })
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function loadData() {
    setLoading(true)
    const data = await fetch("/api/customers").then((r) => r.json())
    setCustomers(data.customers || [])
    setLoading(false)
  }

  async function loadDetail(id: string) {
    const data = await fetch(`/api/customers/${id}`).then((r) => r.json())
    setDetail(data)
  }

  useEffect(() => { loadData() }, [])

  function openAdd() {
    setEditing(null)
    setForm(DEFAULT_FORM)
    setShowModal(true)
  }

  function openEdit(c: any) {
    setEditing(c)
    setForm({
      name: c.name,
      phone: c.phone || "",
      address: c.address || "",
      image: c.image || "",
      referenceName: c.referenceName || "",
      referencePhone: c.referencePhone || "",
      creditLimit: String(c.creditLimit || 0),
    })
    setShowModal(true)
  }

  async function openDetail(c: any) {
    setSelected(c)
    setDetail(null)
    setActiveTab("ledger")
    setShowDetailModal(true)
    await loadDetail(c.id)
  }

  function openPayment(c: any) {
    setSelected(c)
    setPaymentForm({ amount: "", method: "CASH", notes: "" })
    setShowPaymentModal(true)
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return alert("Image must be under 2 MB")
    const reader = new FileReader()
    reader.onload = () => setForm((f) => ({ ...f, image: reader.result as string }))
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!form.name.trim()) return alert("Name is required")
    setSaving(true)
    const url = editing ? `/api/customers/${editing.id}` : "/api/customers"
    const method = editing ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, creditLimit: parseFloat(form.creditLimit) || 0 }),
    })
    setSaving(false)
    if (res.ok) { setShowModal(false); loadData() }
  }

  async function handlePayment() {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) return alert("Enter a valid amount")
    setSaving(true)
    const res = await fetch(`/api/customers/${selected.id}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...paymentForm, amount: parseFloat(paymentForm.amount) }),
    })
    setSaving(false)
    if (res.ok) {
      setShowPaymentModal(false)
      loadData()
      if (showDetailModal) loadDetail(selected.id)
    } else {
      alert("Payment failed")
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove customer "${name}"?`)) return
    await fetch(`/api/customers/${id}`, { method: "DELETE" })
    loadData()
  }

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search) ||
    (c.referenceName || "").toLowerCase().includes(search.toLowerCase())
  )

  const totalOutstanding = customers.reduce((s, c) => s + (c.balance || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
          <p className="text-gray-500 text-sm">{customers.length} customers registered</p>
        </div>
        <Button onClick={openAdd} className="bg-green-700 hover:bg-green-800 gap-2">
          <Plus className="w-4 h-4" /> Add Customer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
              <p className="text-sm text-gray-500">Total Customers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{customers.filter((c) => c.isActive).length}</p>
              <p className="text-sm text-gray-500">Active Customers</p>
            </div>
          </CardContent>
        </Card>
        <Card className={totalOutstanding > 0 ? "border-orange-200" : ""}>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg"><Wallet className="w-5 h-5 text-orange-600" /></div>
            <div>
              <p className={`text-2xl font-bold ${totalOutstanding > 0 ? "text-orange-600" : "text-gray-900"}`}>
                {formatCurrency(totalOutstanding)}
              </p>
              <p className="text-sm text-gray-500">Total Outstanding (Udhar)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search name, phone, reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-10 text-gray-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {["#", "Customer", "Phone", "Reference", "Credit Limit", "Balance", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-gray-500 font-semibold text-xs uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {/* Avatar */}
                          {c.image ? (
                            <img src={c.image} alt={c.name}
                              className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-green-700 font-bold text-xs">{c.name.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <button onClick={() => openDetail(c)}
                            className="font-semibold text-green-700 hover:underline text-left">
                            {c.name}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {c.phone ? <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span> : "—"}
                      </td>
                      <td className="py-3 px-3">
                        {c.referenceName ? (
                          <div>
                            <p className="text-gray-700 text-xs font-medium">{c.referenceName}</p>
                            {c.referencePhone && <p className="text-gray-400 text-xs">{c.referencePhone}</p>}
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-3">
                        {(c.creditLimit || 0) > 0 ? (
                          <span className="flex items-center gap-1 text-blue-700 text-xs font-medium">
                            <Shield className="w-3 h-3" />{formatCurrency(c.creditLimit)}
                          </span>
                        ) : <span className="text-gray-400 text-xs">No limit</span>}
                      </td>
                      <td className="py-3 px-3">
                        {(c.balance || 0) > 0 ? (
                          <span className="font-bold text-red-600">{formatCurrency(c.balance)}</span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openDetail(c)} className="p-1.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded" title="View ledger">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => openPayment(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Record payment">
                            <ArrowDownCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(c.id, c.name)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Remove">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400">No customers found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add/Edit Modal ─────────────────────────────────────── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Photo Upload */}
            <div className="flex items-center gap-4">
              <div className="relative">
                {form.image ? (
                  <img src={form.image} alt="Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-green-200" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <Camera className="w-7 h-7 text-gray-400" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-700 text-white rounded-full flex items-center justify-center hover:bg-green-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Customer Photo</p>
                <p className="text-xs text-gray-400 mt-0.5">JPG, PNG — max 2 MB. Shown in table & detail view.</p>
                {form.image && (
                  <button type="button" onClick={() => setForm({ ...form, image: "" })}
                    className="text-xs text-red-500 hover:underline mt-1">Remove photo</button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Full Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Muhammad Tariq" autoFocus />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="0300-1234567" />
              </div>
              <div>
                <Label>Credit Limit (PKR)</Label>
                <Input type="number" value={form.creditLimit}
                  onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
                  placeholder="0 = no limit" />
              </div>
            </div>

            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Village / City / Area" />
            </div>

            {/* Reference */}
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Reference / Guarantor</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Reference Name</Label>
                  <Input value={form.referenceName} onChange={(e) => setForm({ ...form, referenceName: e.target.value })}
                    placeholder="e.g. Ali Hassan" />
                </div>
                <div>
                  <Label>Reference Phone</Label>
                  <Input value={form.referencePhone} onChange={(e) => setForm({ ...form, referencePhone: e.target.value })}
                    placeholder="0300-0000000" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-green-700 hover:bg-green-800">
                {saving ? "Saving..." : editing ? "Update Customer" : "Add Customer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Customer Detail Modal ──────────────────────────────── */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selected?.image ? (
                <img src={selected.image} alt={selected?.name}
                  className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-700 font-bold text-sm">{selected?.name?.charAt(0)}</span>
                </div>
              )}
              <span>{selected?.name}</span>
              {selected && (
                <Link
                  href={`/reports/customer-ledger?id=${selected.id}`}
                  className="ml-auto flex items-center gap-1 text-xs font-normal text-green-600 hover:underline"
                  onClick={() => setShowDetailModal(false)}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Full Ledger Report
                </Link>
              )}
            </DialogTitle>
          </DialogHeader>

          {!detail ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-4">
              {/* Profile + Balance row */}
              <div className="flex gap-4">
                {/* Photo card */}
                <div className="flex-shrink-0 text-center w-32">
                  {selected?.image ? (
                    <img src={selected.image} alt={selected.name}
                      className="w-24 h-24 rounded-xl object-cover border border-gray-200 mx-auto" />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-green-100 flex items-center justify-center mx-auto">
                      <span className="text-green-700 font-bold text-3xl">{selected?.name?.charAt(0)}</span>
                    </div>
                  )}
                  <p className="mt-2 text-xs font-semibold text-gray-700 truncate">{selected?.name}</p>
                  {selected?.phone && <p className="text-xs text-gray-500">{selected.phone}</p>}
                </div>

                {/* Info + Stats */}
                <div className="flex-1 space-y-3">
                  {/* Contact & Reference Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selected?.address && (
                      <div className="flex items-start gap-1.5 text-gray-600">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{selected.address}</span>
                      </div>
                    )}
                    {(selected?.creditLimit || 0) > 0 && (
                      <div className="flex items-center gap-1.5 text-blue-700">
                        <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Credit Limit: <strong>{formatCurrency(selected.creditLimit)}</strong></span>
                      </div>
                    )}
                    {selected?.referenceName && (
                      <div className="flex items-start gap-1.5 text-gray-600 col-span-2">
                        <UserCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>
                          Reference: <strong>{selected.referenceName}</strong>
                          {selected.referencePhone && <span className="text-gray-400 ml-1">({selected.referencePhone})</span>}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Balance Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-green-700">{formatCurrency(detail.totalBusiness)}</p>
                      <p className="text-xs text-green-600 mt-0.5">Total Business</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-blue-700">{formatCurrency(detail.totalPaid)}</p>
                      <p className="text-xs text-blue-600 mt-0.5">Total Received</p>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${detail.totalBalance > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                      <p className={`text-lg font-bold ${detail.totalBalance > 0 ? "text-red-700" : "text-gray-700"}`}>
                        {formatCurrency(detail.totalBalance)}
                      </p>
                      <p className={`text-xs mt-0.5 ${detail.totalBalance > 0 ? "text-red-600" : "text-gray-500"}`}>
                        {detail.totalBalance > 0 ? "Outstanding" : "Settled"}
                      </p>
                    </div>
                  </div>

                  {/* Credit limit usage bar */}
                  {(selected?.creditLimit || 0) > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Credit Used</span>
                        <span>{formatCurrency(detail.totalBalance)} / {formatCurrency(selected.creditLimit)}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            detail.totalBalance / selected.creditLimit > 0.9 ? "bg-red-500" :
                            detail.totalBalance / selected.creditLimit > 0.6 ? "bg-orange-400" : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min((detail.totalBalance / selected.creditLimit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button size="sm" className="bg-green-700 hover:bg-green-800"
                  onClick={() => { setShowDetailModal(false); openPayment(selected) }}
                  disabled={detail.totalBalance <= 0}>
                  <ArrowDownCircle className="w-4 h-4" /> Record Payment
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowDetailModal(false); openEdit(selected) }}>
                  <Edit className="w-4 h-4" /> Edit
                </Button>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex gap-0">
                  {(["ledger", "sales"] as Tab[]).map((t) => (
                    <button key={t} onClick={() => setActiveTab(t)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === t ? "border-green-700 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}>
                      {t === "ledger" ? <BookOpen className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                      {t === "ledger" ? "Account Ledger" : "Sales History"}
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        {t === "ledger" ? detail.ledger?.length || 0 : detail.sales?.length || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ledger Tab */}
              {activeTab === "ledger" && (
                detail.ledger?.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">No transactions yet</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Date</th>
                          <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Type</th>
                          <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Description</th>
                          <th className="text-right py-2 px-3 text-gray-500 font-medium text-xs">Debit (Dr)</th>
                          <th className="text-right py-2 px-3 text-gray-500 font-medium text-xs">Credit (Cr)</th>
                          <th className="text-right py-2 px-3 text-gray-500 font-medium text-xs">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detail.ledger.map((entry: any, i: number) => (
                          <tr key={i} className={entry.type === "PAYMENT" ? "bg-green-50/50" : ""}>
                            <td className="py-2 px-3 text-gray-500 whitespace-nowrap text-xs">{formatDate(entry.date)}</td>
                            <td className="py-2 px-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${entry.type === "PAYMENT" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                                {entry.type}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-700 text-xs max-w-xs truncate">{entry.description}</td>
                            <td className="py-2 px-3 text-right font-medium text-gray-900">{entry.debit > 0 ? formatCurrency(entry.debit) : "—"}</td>
                            <td className="py-2 px-3 text-right text-green-700">{entry.credit > 0 ? formatCurrency(entry.credit) : "—"}</td>
                            <td className={`py-2 px-3 text-right font-semibold ${entry.balance > 0 ? "text-red-600" : "text-green-700"}`}>
                              {formatCurrency(Math.abs(entry.balance))}
                              {entry.balance !== 0 && <span className="text-xs ml-1 font-normal">{entry.balance > 0 ? "Dr" : "Cr"}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td colSpan={3} className="py-2 px-3 font-bold text-gray-700 text-xs">Closing Balance</td>
                          <td className="py-2 px-3 text-right font-bold text-gray-900">{formatCurrency(detail.totalBusiness)}</td>
                          <td className="py-2 px-3 text-right font-bold text-green-700">{formatCurrency(detail.totalPaid)}</td>
                          <td className={`py-2 px-3 text-right font-bold ${detail.totalBalance > 0 ? "text-red-600" : "text-green-700"}`}>
                            {formatCurrency(detail.totalBalance)}
                            <span className="text-xs ml-1 font-normal">{detail.totalBalance > 0 ? "Dr" : "Cr"}</span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )
              )}

              {/* Sales Tab */}
              {activeTab === "sales" && (
                detail.sales?.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">No sales yet</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Date", "Items", "Total", "Paid", "Balance", "Status"].map((h) => (
                            <th key={h} className="text-left py-2 px-3 text-gray-500 font-medium text-xs">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detail.sales.map((sale: any) => (
                          <tr key={sale.id} className="hover:bg-gray-50">
                            <td className="py-2 px-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(sale.createdAt)}</td>
                            <td className="py-2 px-3 text-gray-600 text-xs max-w-xs truncate">
                              {sale.items.map((i: any) => `${i.quantity} ${i.product?.unit} ${i.product?.name}`).join(", ")}
                            </td>
                            <td className="py-2 px-3 font-medium">{formatCurrency(sale.totalAmount)}</td>
                            <td className="py-2 px-3 text-green-700">{formatCurrency(sale.paidAmount)}</td>
                            <td className="py-2 px-3 text-red-600 font-medium">{formatCurrency(sale.balance)}</td>
                            <td className="py-2 px-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(sale.status)}`}>{sale.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t border-gray-200">
                        <tr>
                          <td colSpan={2} className="py-2 px-3 font-semibold text-gray-600 text-xs">Total ({detail.sales.length} sales)</td>
                          <td className="py-2 px-3 font-bold">{formatCurrency(detail.totalBusiness)}</td>
                          <td className="py-2 px-3 font-bold text-green-700">{formatCurrency(detail.totalPaid)}</td>
                          <td className="py-2 px-3 font-bold text-red-600">{formatCurrency(detail.totalBalance)}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Payment Modal ──────────────────────────────────────── */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-green-600" /> Receive Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 rounded-lg p-3 flex items-center gap-3">
              {selected?.image ? (
                <img src={selected.image} alt={selected?.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">
                  <span className="text-green-800 font-bold text-xs">{selected?.name?.charAt(0)}</span>
                </div>
              )}
              <div>
                <p className="font-semibold text-green-800 text-sm">{selected?.name}</p>
                {selected?.phone && <p className="text-xs text-green-600">{selected.phone}</p>}
              </div>
            </div>
            <div>
              <Label>Amount (PKR) *</Label>
              <Input type="number" placeholder="Enter amount received"
                value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} autoFocus />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm({ ...paymentForm, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input placeholder="Cheque no., reference..."
                value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handlePayment} disabled={saving} className="flex-1 bg-green-700 hover:bg-green-800">
                {saving ? "Processing..." : "Confirm Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
