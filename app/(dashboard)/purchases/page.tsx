"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils"
import { Plus, Search, Trash2, ShoppingBag } from "lucide-react"

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [farmers, setFarmers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [partyId, setPartyId] = useState("")
  const [paidAmount, setPaidAmount] = useState("0")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState([{ productId: "", quantity: "1", price: "0" }])

  async function loadData() {
    try {
      setLoading(true)
      const [pr, prod, sup, fr] = await Promise.all([
        fetch("/api/purchases").then((r) => r.json()),
        fetch("/api/inventory").then((r) => r.json()),
        fetch("/api/suppliers").then((r) => r.json()),
        fetch("/api/farmers").then((r) => r.json()),
      ])
      setPurchases(pr.purchases || [])
      setProducts(prod.products || [])
      setSuppliers(sup.suppliers || [])
      setFarmers(fr.farmers || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  function addItem() { setItems([...items, { productId: "", quantity: "1", price: "0" }]) }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, field: string, val: string) {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: val }
    if (field === "productId") {
      const prod = products.find((p) => p.id === val)
      if (prod) updated[i].price = String(prod.purchasePrice)
    }
    setItems(updated)
  }

  const total = items.reduce((s, i) => s + parseFloat(i.quantity || "0") * parseFloat(i.price || "0"), 0)
  const balance = total - parseFloat(paidAmount || "0")

  async function handleSave() {
    if (!items[0].productId) return alert("Add at least one item")
    const isFarmer = partyId.startsWith("farmer_")
    const supplierId = (!isFarmer && partyId && partyId !== "direct") ? partyId : null
    const farmerId = isFarmer ? partyId.replace("farmer_", "") : null

    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId,
        farmerId,
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
      setPartyId(""); setPaidAmount("0"); setNotes("")
      loadData()
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data?.error || "Failed to create purchase")
    }
  }

  const filtered = purchases.filter((p) =>
    (p.supplier?.name || p.farmer?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    p.status.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Purchases</h2>
          <p className="text-gray-500 text-sm">{purchases.length} total purchases</p>
        </div>
        <Button onClick={() => { setPartyId(""); setPaidAmount("0"); setNotes(""); setItems([{ productId: "", quantity: "1", price: "0" }]); setShowModal(true) }}>
          <Plus className="w-4 h-4" /> New Purchase
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search purchases..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading && !purchases.length ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    {["#", "From", "Type", "Total", "Paid", "Balance", "Status", "Date", "By"].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-3 px-3 font-medium text-gray-800">
                        {p.farmer?.name || p.supplier?.name || "Direct"}
                      </td>
                      <td className="py-3 px-3">
                        {p.farmer ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Farmer</span>
                        ) : p.supplier ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Supplier</span>
                        ) : (
                          <span className="text-xs text-gray-400">Direct</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-700">{formatCurrency(p.totalAmount)}</td>
                      <td className="py-3 px-3 text-green-600">{formatCurrency(p.paidAmount)}</td>
                      <td className="py-3 px-3 text-red-600">{formatCurrency(p.balance)}</td>
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(p.status)}`}>{p.status}</span>
                      </td>
                      <td className="py-3 px-3 text-gray-500">{formatDate(p.createdAt)}</td>
                      <td className="py-3 px-3 text-gray-500">{p.createdBy?.name}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="text-center py-8 text-gray-400">No purchases found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" /> New Purchase
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>From (Supplier / Farmer)</Label>
              <SearchableSelect
                value={partyId}
                onValueChange={setPartyId}
                placeholder="Direct purchase"
                options={[{ value: "direct", label: "Direct Purchase" }]}
                groups={[
                  {
                    label: "Suppliers",
                    options: suppliers.map((s: any) => ({ value: s.id, label: s.name, sub: s.phone || undefined })),
                  },
                  {
                    label: "Farmers",
                    options: farmers.map((f: any) => ({ value: `farmer_${f.id}`, label: f.name, sub: f.village || f.phone || undefined })),
                  },
                ]}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-3 h-3" /> Add Row</Button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <SearchableSelect
                        value={item.productId}
                        onValueChange={(v) => updateItem(i, "productId", v)}
                        placeholder="Select product"
                        options={products.map((p: any) => ({ value: p.id, label: p.name }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Input type="number" placeholder="Price" value={item.price} onChange={(e) => updateItem(i, "price", e.target.value)} />
                    </div>
                    <div className="col-span-1 text-xs text-right text-gray-500">
                      {formatCurrency(parseFloat(item.quantity || "0") * parseFloat(item.price || "0"))}
                    </div>
                    <div className="col-span-1">
                      <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total:</span>
                <span className="font-bold">{formatCurrency(total)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Label className="whitespace-nowrap">Amount Paid:</Label>
                <Input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="max-w-[150px]" />
              </div>
              <div className="flex justify-between text-sm">
                <span>Balance:</span>
                <span className={`font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(balance)}</span>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} className="flex-1">Create Purchase</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
