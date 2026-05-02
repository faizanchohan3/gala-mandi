"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils"
import { Plus, Search, Trash2, ShoppingCart } from "lucide-react"

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [customerId, setCustomerId] = useState("")
  const [paidAmount, setPaidAmount] = useState("0")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState([{ productId: "", quantity: "1", price: "0" }])

  async function loadData() {
    setLoading(true)
    const [sr, pr, cr] = await Promise.all([
      fetch("/api/sales").then((r) => r.json()),
      fetch("/api/inventory").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
    ])
    setSales(sr.sales || [])
    setProducts(pr.products || [])
    setCustomers(cr.customers || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function addItem() {
    setItems([...items, { productId: "", quantity: "1", price: "0" }])
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: string, val: string) {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: val }
    if (field === "productId") {
      const prod = products.find((p) => p.id === val)
      if (prod) updated[i].price = String(prod.salePrice)
    }
    setItems(updated)
  }

  const total = items.reduce((s, i) => s + parseFloat(i.quantity || "0") * parseFloat(i.price || "0"), 0)
  const balance = total - parseFloat(paidAmount || "0")

  async function handleSave() {
    if (!items[0].productId) return alert("Please add at least one item")
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: (customerId && customerId !== "walk-in") ? customerId : null,
        items: items.filter((i) => i.productId).map((i) => ({
          productId: i.productId,
          quantity: parseFloat(i.quantity),
          price: parseFloat(i.price),
        })),
        paidAmount: parseFloat(paidAmount),
        notes,
      }),
    })
    if (res.ok) {
      setShowModal(false)
      setItems([{ productId: "", quantity: "1", price: "0" }])
      setCustomerId(""); setPaidAmount("0"); setNotes("")
      loadData()
    }
  }

  const filtered = sales.filter((s) =>
    s.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.status.toLowerCase().includes(search.toLowerCase())
  )

  const todayTotal = sales
    .filter((s) => new Date(s.createdAt).toDateString() === new Date().toDateString() && s.status !== "CANCELLED")
    .reduce((sum, s) => sum + s.totalAmount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales</h2>
          <p className="text-gray-500 text-sm">Today: {formatCurrency(todayTotal)}</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> New Sale
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search sales..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                    {["#", "Customer", "Total", "Paid", "Balance", "Status", "Date", "By"].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-3 px-3 font-medium text-gray-800">{s.customer?.name || "Walk-in"}</td>
                      <td className="py-3 px-3 text-gray-700">{formatCurrency(s.totalAmount)}</td>
                      <td className="py-3 px-3 text-green-600">{formatCurrency(s.paidAmount)}</td>
                      <td className="py-3 px-3 text-red-600">{formatCurrency(s.balance)}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(s.status)}`}>{s.status}</span>
                      </td>
                      <td className="py-3 px-3 text-gray-500">{formatDate(s.createdAt)}</td>
                      <td className="py-3 px-3 text-gray-500">{s.createdBy?.name}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">No sales found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Sale Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> New Sale
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Customer (optional)</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-3 h-3" /> Add Row</Button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Select value={item.productId} onValueChange={(v) => updateItem(i, "productId", v)}>
                        <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                        <SelectContent>
                          {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" placeholder="Price" value={item.price} onChange={(e) => updateItem(i, "price", e.target.value)} />
                    </div>
                    <div className="col-span-1 text-xs text-gray-500 text-right">
                      {formatCurrency(parseFloat(item.quantity || "0") * parseFloat(item.price || "0"))}
                    </div>
                    <div className="col-span-1">
                      <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Label className="whitespace-nowrap">Amount Paid:</Label>
                <Input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="max-w-[150px]" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Balance:</span>
                <span className={`font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(balance)}</span>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} className="flex-1">Create Sale</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
