"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, Search, Tractor, Edit, Trash2, ChevronDown, ChevronRight, BookOpen } from "lucide-react"

export default function FarmersPage() {
  const [farmers, setFarmers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [expanded, setExpanded] = useState<Record<string, any>>({})
  const [loadingRow, setLoadingRow] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "", phone: "", address: "", village: "", cnic: "", creditLimit: "0",
  })

  async function loadData() {
    setLoading(true)
    const d = await fetch("/api/farmers").then((r) => r.json())
    setFarmers(d.farmers || [])
    setLoading(false)
  }
  useEffect(() => { loadData() }, [])

  function openAdd() {
    setEditing(null)
    setForm({ name: "", phone: "", address: "", village: "", cnic: "", creditLimit: "0" })
    setShowModal(true)
  }
  function openEdit(f: any) {
    setEditing(f)
    setForm({ name: f.name, phone: f.phone || "", address: f.address || "", village: f.village || "", cnic: f.cnic || "", creditLimit: String(f.creditLimit) })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return alert("Name is required")
    const url = editing ? `/api/farmers/${editing.id}` : "/api/farmers"
    const method = editing ? "PUT" : "POST"
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, creditLimit: parseFloat(form.creditLimit) || 0 }),
    })
    if (res.ok) { setShowModal(false); loadData() }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deactivate farmer: "${name}"?`)) return
    await fetch(`/api/farmers/${id}`, { method: "DELETE" })
    loadData()
  }

  async function toggleExpand(id: string) {
    if (expanded[id]) { setExpanded((p) => { const n = { ...p }; delete n[id]; return n }); return }
    setLoadingRow(id)
    const d = await fetch(`/api/farmers/${id}`).then((r) => r.json())
    setExpanded((p) => ({ ...p, [id]: d }))
    setLoadingRow(null)
  }

  const filtered = farmers.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.village || "").toLowerCase().includes(search.toLowerCase()) ||
    (f.phone || "").includes(search)
  )

  const totals = filtered.reduce((acc, f) => ({
    totalBalance: acc.totalBalance + (f.balance || 0),
  }), { totalBalance: 0 })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Farmer Management</h2>
          <p className="text-gray-500 text-sm">Manage farmer records, ledgers & payments</p>
        </div>
        <Button onClick={openAdd} className="bg-green-700 hover:bg-green-800 gap-2">
          <Plus className="w-4 h-4" /> Add Farmer
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Total Farmers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{farmers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Outstanding Payable</p>
            <p className={`text-xl font-bold mt-1 ${totals.totalBalance > 0 ? "text-red-600" : "text-gray-500"}`}>
              {formatCurrency(totals.totalBalance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Showing</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{filtered.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search name, village, phone..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tractor className="w-4 h-4" /> Farmers ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-t">
                <tr>
                  <th className="px-4 py-3 w-8" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Farmer Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Village</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">CNIC</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Credit Limit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Purchases</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
                ) : filtered.map((f, i) => (
                  <>
                    <tr key={f.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${expanded[f.id] ? "bg-green-50/30" : ""}`}
                      onClick={() => toggleExpand(f.id)}
                    >
                      <td className="px-4 py-3">
                        {loadingRow === f.id
                          ? <div className="w-3.5 h-3.5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                          : expanded[f.id] ? <ChevronDown className="w-3.5 h-3.5 text-green-600" />
                          : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{f.name}</td>
                      <td className="px-4 py-3 text-gray-600">{f.village || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{f.phone || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{f.cnic || "—"}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(f.creditLimit)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${(f.balance || 0) > 0 ? "text-red-600" : "text-gray-400"}`}>
                        {(f.balance || 0) > 0 ? formatCurrency(f.balance) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">{f._count?.purchases || 0}</td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(f)} className="p-1 text-gray-400 hover:text-blue-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(f.id, f.name)} className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Ledger */}
                    {expanded[f.id] && (
                      <tr key={`${f.id}-ledger`} className="bg-green-50/20 border-b border-green-100">
                        <td colSpan={10} className="px-4 py-4">
                          <div className="ml-6">
                            <p className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5" /> Farmer Ledger
                            </p>
                            {expanded[f.id].ledger?.length === 0 ? (
                              <p className="text-xs text-gray-400">No transactions yet</p>
                            ) : (
                              <table className="w-full text-xs border border-gray-100 rounded">
                                <thead className="bg-white">
                                  <tr className="border-b border-gray-100">
                                    <th className="px-3 py-2 text-left text-gray-500">Date</th>
                                    <th className="px-3 py-2 text-left text-gray-500">Description</th>
                                    <th className="px-3 py-2 text-right text-red-600">Debit (Dr)</th>
                                    <th className="px-3 py-2 text-right text-green-700">Credit (Cr)</th>
                                    <th className="px-3 py-2 text-right text-gray-700">Balance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {expanded[f.id].ledger.map((e: any, li: number) => (
                                    <tr key={li} className="border-b border-gray-50">
                                      <td className="px-3 py-2 text-gray-500">{formatDate(e.date)}</td>
                                      <td className="px-3 py-2 text-gray-600">{e.description}</td>
                                      <td className="px-3 py-2 text-right text-red-600">{e.debit > 0 ? formatCurrency(e.debit) : "—"}</td>
                                      <td className="px-3 py-2 text-right text-green-700">{e.credit > 0 ? formatCurrency(e.credit) : "—"}</td>
                                      <td className={`px-3 py-2 text-right font-semibold ${e.balance > 0 ? "text-red-600" : "text-gray-500"}`}>
                                        {formatCurrency(Math.abs(e.balance))} {e.balance > 0 ? "Dr" : e.balance < 0 ? "Cr" : ""}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">No farmers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Farmer" : "Add Farmer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Farmer name" autoFocus /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="03001234567" /></div>
              <div><Label>Village / Area</Label>
                <Input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} placeholder="Village name" /></div>
            </div>
            <div><Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CNIC</Label>
                <Input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="35202-..." /></div>
              <div><Label>Credit Limit (PKR)</Label>
                <Input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} className="flex-1 bg-green-700 hover:bg-green-800">
                {editing ? "Update" : "Add Farmer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
