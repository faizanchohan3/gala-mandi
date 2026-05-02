"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils"
import {
  Plus, Search, Edit, Phone, MapPin, Wallet,
  TrendingUp, ArrowDownCircle, Eye, Users, X
} from "lucide-react"

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
  const [form, setForm] = useState({ name: "", phone: "", address: "" })
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "CASH", notes: "" })
  const [saving, setSaving] = useState(false)

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
    setForm({ name: "", phone: "", address: "" })
    setShowModal(true)
  }

  function openEdit(c: any) {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone || "", address: c.address || "" })
    setShowModal(true)
  }

  async function openDetail(c: any) {
    setSelected(c)
    setDetail(null)
    setShowDetailModal(true)
    await loadDetail(c.id)
  }

  function openPayment(c: any) {
    setSelected(c)
    setPaymentForm({ amount: "", method: "CASH", notes: "" })
    setShowPaymentModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return alert("Name is required")
    setSaving(true)
    const url = editing ? `/api/customers/${editing.id}` : "/api/customers"
    const method = editing ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
    (c.phone || "").includes(search)
  )

  const totalUdhar = customers.reduce((s, c) => {
    return s
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
          <p className="text-gray-500 text-sm">{customers.length} customers registered</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Customer</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
                <p className="text-sm text-gray-500">Total Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{customers.filter(c => c.isActive).length}</p>
                <p className="text-sm text-gray-500">Active Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-lg"><Wallet className="w-5 h-5 text-orange-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">View Detail</p>
                <p className="text-sm text-gray-500">Click customer for balance</p>
              </div>
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
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-gray-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    {["#", "Name", "Phone", "Address", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => openDetail(c)}
                          className="font-semibold text-green-700 hover:underline text-left"
                        >
                          {c.name}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {c.phone ? (
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>
                        ) : "—"}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        {c.address ? (
                          <span className="flex items-center gap-1 max-w-xs truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />{c.address}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openDetail(c)} className="p-1.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded" title="View details">
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
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">No customers found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Muhammad Tariq" />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0300-1234567" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Village / City" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "Saving..." : editing ? "Update" : "Add Customer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selected?.name}
            </DialogTitle>
          </DialogHeader>

          {!detail ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-5">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-xl font-bold text-green-700">{formatCurrency(detail.totalBusiness)}</p>
                  <p className="text-xs text-green-600 mt-1">Total Business</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-xl font-bold text-blue-700">{formatCurrency(detail.totalPaid)}</p>
                  <p className="text-xs text-blue-600 mt-1">Total Paid</p>
                </div>
                <div className={`rounded-lg p-4 text-center ${detail.totalBalance > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                  <p className={`text-xl font-bold ${detail.totalBalance > 0 ? "text-red-700" : "text-gray-700"}`}>
                    {formatCurrency(detail.totalBalance)}
                  </p>
                  <p className={`text-xs mt-1 ${detail.totalBalance > 0 ? "text-red-600" : "text-gray-500"}`}>
                    Outstanding (Udhar)
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex gap-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                {selected?.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selected.phone}</span>}
                {selected?.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selected.address}</span>}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => { setShowDetailModal(false); openPayment(selected) }}
                  disabled={detail.totalBalance <= 0}
                >
                  <ArrowDownCircle className="w-4 h-4" /> Record Payment
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowDetailModal(false); openEdit(selected) }}>
                  <Edit className="w-4 h-4" /> Edit
                </Button>
              </div>

              {/* Sales History */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Sales History ({detail.sales.length})</h3>
                {detail.sales.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No sales yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          {["Date", "Items", "Total", "Paid", "Balance", "Status"].map((h) => (
                            <th key={h} className="text-left py-2 px-3 text-gray-500 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detail.sales.map((sale: any) => (
                          <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-2 px-3 text-gray-500">{formatDate(sale.createdAt)}</td>
                            <td className="py-2 px-3 text-gray-600 text-xs">
                              {sale.items.map((i: any) => `${i.product?.name} ×${i.quantity}`).join(", ")}
                            </td>
                            <td className="py-2 px-3 font-medium">{formatCurrency(sale.totalAmount)}</td>
                            <td className="py-2 px-3 text-green-600">{formatCurrency(sale.paidAmount)}</td>
                            <td className="py-2 px-3 text-red-600">{formatCurrency(sale.balance)}</td>
                            <td className="py-2 px-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(sale.status)}`}>
                                {sale.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-green-600" />
              Receive Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 rounded-lg p-3 text-sm text-green-800">
              Customer: <strong>{selected?.name}</strong>
            </div>
            <div>
              <Label>Amount (PKR) *</Label>
              <Input
                type="number"
                placeholder="Enter amount received"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                autoFocus
              />
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
              <Input
                placeholder="Cheque no., reference..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handlePayment} disabled={saving} className="flex-1">
                {saving ? "Processing..." : "Confirm Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
