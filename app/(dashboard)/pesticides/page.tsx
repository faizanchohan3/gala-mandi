"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, Search, AlertTriangle, ShoppingCart, Edit, Sprout } from "lucide-react"

export default function PesticidesPage() {
  const [pesticides, setPesticides] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [selectedPesticide, setSelectedPesticide] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"stock" | "sales">("stock")

  const [form, setForm] = useState({
    name: "", categoryId: "", manufacturer: "", batchNumber: "",
    expiryDate: "", quantity: "0", unit: "Litre",
    purchasePrice: "0", salePrice: "0", minStock: "0",
  })

  const [saleForm, setSaleForm] = useState({ quantity: "1", customerName: "", paidAmount: "0", notes: "" })

  async function loadData() {
    setLoading(true)
    const [pr, cr, sr] = await Promise.all([
      fetch("/api/pesticides").then((r) => r.json()),
      fetch("/api/pesticide-categories").then((r) => r.json()),
      fetch("/api/pesticides/sales").then((r) => r.json()),
    ])
    setPesticides(pr.pesticides || [])
    setCategories(cr.categories || [])
    setSales(sr.sales || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function openAdd() {
    setEditing(null)
    setForm({ name: "", categoryId: "", manufacturer: "", batchNumber: "", expiryDate: "", quantity: "0", unit: "Litre", purchasePrice: "0", salePrice: "0", minStock: "0" })
    setShowModal(true)
  }

  function openEdit(p: any) {
    setEditing(p)
    setForm({
      name: p.name, categoryId: p.categoryId, manufacturer: p.manufacturer || "",
      batchNumber: p.batchNumber || "",
      expiryDate: p.expiryDate ? new Date(p.expiryDate).toISOString().split("T")[0] : "",
      quantity: String(p.quantity), unit: p.unit,
      purchasePrice: String(p.purchasePrice), salePrice: String(p.salePrice), minStock: String(p.minStock),
    })
    setShowModal(true)
  }

  function openSale(p: any) {
    setSelectedPesticide(p)
    setSaleForm({ quantity: "1", customerName: "", paidAmount: "0", notes: "" })
    setShowSaleModal(true)
  }

  async function handleSave() {
    const url = editing ? `/api/pesticides/${editing.id}` : "/api/pesticides"
    const method = editing ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        quantity: parseFloat(form.quantity),
        purchasePrice: parseFloat(form.purchasePrice),
        salePrice: parseFloat(form.salePrice),
        minStock: parseFloat(form.minStock),
      }),
    })
    if (res.ok) { setShowModal(false); loadData() }
  }

  async function handleSale() {
    const res = await fetch("/api/pesticides/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pesticideId: selectedPesticide.id,
        quantity: parseFloat(saleForm.quantity),
        unitPrice: selectedPesticide.salePrice,
        customerName: saleForm.customerName,
        paidAmount: parseFloat(saleForm.paidAmount),
        notes: saleForm.notes,
      }),
    })
    if (res.ok) { setShowSaleModal(false); loadData() }
  }

  const now = new Date()
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const expiring = pesticides.filter((p) => p.expiryDate && new Date(p.expiryDate) <= thirtyDays)
  const filtered = pesticides.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pesticides</h2>
          <p className="text-gray-500 text-sm">{pesticides.length} products</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Pesticide</Button>
      </div>

      {expiring.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium text-sm">Expiry Alerts</p>
            <p className="text-red-700 text-sm mt-1">
              {expiring.map((p) => `${p.name} (expires ${formatDate(p.expiryDate)})`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(["stock", "sales"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab ? "border-green-700 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "stock" ? "Stock" : "Sales History"}
          </button>
        ))}
      </div>

      {activeTab === "stock" ? (
        <Card>
          <CardHeader>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search pesticides..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    {["Name", "Category", "Stock", "Batch", "Expiry", "Purchase", "Sale", "Actions"].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const isExpired = p.expiryDate && new Date(p.expiryDate) < now
                    const isExpiring = p.expiryDate && new Date(p.expiryDate) <= thirtyDays && !isExpired
                    return (
                      <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50 ${isExpired ? "bg-red-50" : ""}`}>
                        <td className="py-3 px-3 font-medium text-gray-800">{p.name}</td>
                        <td className="py-3 px-3 text-gray-600">{p.category?.name}</td>
                        <td className="py-3 px-3">
                          <span className={p.quantity <= p.minStock ? "text-red-600 font-semibold" : "text-gray-700"}>
                            {p.quantity} {p.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-600">{p.batchNumber || "-"}</td>
                        <td className="py-3 px-3">
                          {p.expiryDate ? (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isExpired ? "bg-red-100 text-red-700" : isExpiring ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                              {formatDate(p.expiryDate)}
                            </span>
                          ) : "-"}
                        </td>
                        <td className="py-3 px-3">{formatCurrency(p.purchasePrice)}</td>
                        <td className="py-3 px-3">{formatCurrency(p.salePrice)}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openSale(p)} className="p-1 text-gray-400 hover:text-green-600" title="Sell">
                              <ShoppingCart className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEdit(p)} className="p-1 text-gray-400 hover:text-blue-600">
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">No pesticides found</td></tr>}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {["Pesticide", "Qty", "Unit Price", "Total", "Customer", "Paid", "Date", "By"].map((h) => (
                    <th key={h} className="text-left py-3 px-3 text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium text-gray-800">{s.pesticide?.name}</td>
                    <td className="py-3 px-3">{s.quantity}</td>
                    <td className="py-3 px-3">{formatCurrency(s.unitPrice)}</td>
                    <td className="py-3 px-3 font-semibold">{formatCurrency(s.totalAmount)}</td>
                    <td className="py-3 px-3">{s.customerName || "-"}</td>
                    <td className="py-3 px-3 text-green-600">{formatCurrency(s.paidAmount)}</td>
                    <td className="py-3 px-3 text-gray-500">{formatDate(s.createdAt)}</td>
                    <td className="py-3 px-3 text-gray-500">{s.soldBy?.name}</td>
                  </tr>
                ))}
                {sales.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">No sales yet</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Pesticide Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sprout className="w-5 h-5" /> {editing ? "Edit" : "Add"} Pesticide
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
              <div><Label>Batch Number</Label><Input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></div>
              <div>
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Litre", "ML", "KG", "Gram", "Bottle", "Bag"].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              <div><Label>Purchase Price</Label><Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} /></div>
              <div><Label>Sale Price</Label><Input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} className="flex-1">{editing ? "Update" : "Add"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sale Modal */}
      <Dialog open={showSaleModal} onOpenChange={setShowSaleModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sell: {selectedPesticide?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Available: <strong>{selectedPesticide?.quantity} {selectedPesticide?.unit}</strong></p>
              <p className="text-sm text-gray-500">Sale Price: <strong>{formatCurrency(selectedPesticide?.salePrice || 0)}</strong></p>
            </div>
            <div><Label>Quantity</Label><Input type="number" value={saleForm.quantity} onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })} /></div>
            <div>
              <Label>Total Amount</Label>
              <p className="text-lg font-bold text-green-700 mt-1">
                {formatCurrency(parseFloat(saleForm.quantity || "0") * (selectedPesticide?.salePrice || 0))}
              </p>
            </div>
            <div><Label>Customer Name</Label><Input value={saleForm.customerName} onChange={(e) => setSaleForm({ ...saleForm, customerName: e.target.value })} /></div>
            <div><Label>Amount Paid</Label><Input type="number" value={saleForm.paidAmount} onChange={(e) => setSaleForm({ ...saleForm, paidAmount: e.target.value })} /></div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowSaleModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSale} className="flex-1">Sell</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
