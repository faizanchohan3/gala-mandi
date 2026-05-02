"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, Search, Package, AlertTriangle, Edit, Trash2 } from "lucide-react"

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({
    name: "", categoryId: "", unit: "KG", currentStock: "0",
    minStock: "0", purchasePrice: "0", salePrice: "0",
  })

  async function loadData() {
    setLoading(true)
    const [pr, cr] = await Promise.all([
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
    setProducts(pr.products || [])
    setCategories(cr.categories || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function openAdd() {
    setEditing(null)
    setForm({ name: "", categoryId: "", unit: "KG", currentStock: "0", minStock: "0", purchasePrice: "0", salePrice: "0" })
    setShowModal(true)
  }

  function openEdit(p: any) {
    setEditing(p)
    setForm({
      name: p.name, categoryId: p.categoryId, unit: p.unit,
      currentStock: String(p.currentStock), minStock: String(p.minStock),
      purchasePrice: String(p.purchasePrice), salePrice: String(p.salePrice),
    })
    setShowModal(true)
  }

  async function handleSave() {
    const url = editing ? `/api/inventory/${editing.id}` : "/api/inventory"
    const method = editing ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        currentStock: parseFloat(form.currentStock),
        minStock: parseFloat(form.minStock),
        purchasePrice: parseFloat(form.purchasePrice),
        salePrice: parseFloat(form.salePrice),
      }),
    })
    if (res.ok) { setShowModal(false); loadData() }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return
    await fetch(`/api/inventory/${id}`, { method: "DELETE" })
    loadData()
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name.toLowerCase().includes(search.toLowerCase())
  )

  const lowStock = products.filter((p) => p.currentStock <= p.minStock)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory</h2>
          <p className="text-gray-500 text-sm">{products.length} products total</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {/* Alerts */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-amber-800 text-sm">
            <strong>{lowStock.length} products</strong> are below minimum stock levels:{" "}
            {lowStock.map((p) => p.name).join(", ")}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: products.length, icon: Package, color: "bg-blue-50 text-blue-600" },
          { label: "Low Stock", value: lowStock.length, icon: AlertTriangle, color: lowStock.length > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600" },
          { label: "Categories", value: categories.length, icon: Package, color: "bg-purple-50 text-purple-600" },
          { label: "Total Value", value: formatCurrency(products.reduce((s, p) => s + p.currentStock * p.purchasePrice, 0)), icon: Package, color: "bg-green-50 text-green-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={`inline-flex p-2 rounded-lg ${s.color} mb-2`}>
                <s.icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    {["Product", "Category", "Stock", "Min Stock", "Purchase Price", "Sale Price", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-800">{p.name}</td>
                      <td className="py-3 px-3 text-gray-600">{p.category?.name}</td>
                      <td className="py-3 px-3">
                        <span className={p.currentStock <= p.minStock ? "text-red-600 font-semibold" : "text-gray-700"}>
                          {p.currentStock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600">{p.minStock} {p.unit}</td>
                      <td className="py-3 px-3 text-gray-700">{formatCurrency(p.purchasePrice)}</td>
                      <td className="py-3 px-3 text-gray-700">{formatCurrency(p.salePrice)}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.currentStock <= p.minStock ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {p.currentStock <= p.minStock ? "Low Stock" : "In Stock"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(p)} className="p-1 text-gray-400 hover:text-blue-600">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">No products found</td></tr>
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
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Wheat" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["KG", "Quintal", "Maund", "Bag", "Litre", "Piece"].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Min Stock</Label>
                <Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Purchase Price (PKR)</Label>
                <Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} />
              </div>
              <div>
                <Label>Sale Price (PKR)</Label>
                <Input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
              </div>
            </div>
            {!editing && (
              <div>
                <Label>Opening Stock</Label>
                <Input type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} className="flex-1">{editing ? "Update" : "Add Product"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
