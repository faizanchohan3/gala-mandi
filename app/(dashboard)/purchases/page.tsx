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
import { Plus, Search, Trash2, ShoppingBag, Printer, Percent, Package } from "lucide-react"

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [farmers, setFarmers] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Purchase type toggle
  const [purchaseType, setPurchaseType] = useState<"stock" | "commission">("stock")

  // Stock path state
  const [partyId, setPartyId] = useState("")
  const [paidAmount, setPaidAmount] = useState("0")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState([{ productId: "", quantity: "1", price: "0" }])

  // Commission path state
  const [cPartyId, setCPartyId] = useState("")
  const [cWalkInSeller, setCWalkInSeller] = useState("")
  const [cCustomerId, setCCustomerId] = useState("")
  const [cWalkInCustomer, setCWalkInCustomer] = useState("")
  const [cProductId, setCProductId] = useState("")
  const [cBags, setCBags] = useState("")
  const [cWeight, setCWeight] = useState("")
  const [cRate, setCRate] = useState("")
  const [cTotalValue, setCTotalValue] = useState("")
  const [cCommissionRate, setCCommissionRate] = useState("2.5")
  const [cPaidAmount, setCPaidAmount] = useState("0")
  const [cNotes, setCNotes] = useState("")
  const [saving, setSaving] = useState(false)

  async function safeFetch(url: string, fallback: any = {}) {
    try {
      const r = await fetch(url)
      if (!r.ok) return fallback
      return await r.json()
    } catch { return fallback }
  }

  async function loadData() {
    setLoading(true)
    const [pr, prod, sup, fr, cu] = await Promise.all([
      safeFetch("/api/purchases", { purchases: [] }),
      safeFetch("/api/inventory", { products: [] }),
      safeFetch("/api/suppliers", { suppliers: [] }),
      safeFetch("/api/farmers", { farmers: [] }),
      safeFetch("/api/customers", { customers: [] }),
    ])
    setPurchases(pr.purchases || [])
    setProducts(prod.products || [])
    setSuppliers(sup.suppliers || [])
    setFarmers(fr.farmers || [])
    setCustomers(cu.customers || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  // Auto-compute commission total from weight × rate
  useEffect(() => {
    const w = parseFloat(cWeight)
    const r = parseFloat(cRate)
    if (w > 0 && r > 0) setCTotalValue((w * r).toFixed(2))
  }, [cWeight, cRate])

  // Auto-fill rate from product salePrice
  useEffect(() => {
    if (cProductId) {
      const prod = products.find((p: any) => p.id === cProductId)
      if (prod?.salePrice) setCRate(String(prod.salePrice))
    }
  }, [cProductId])

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

  const stockTotal = items.reduce((s, i) => s + parseFloat(i.quantity || "0") * parseFloat(i.price || "0"), 0)
  const stockBalance = stockTotal - parseFloat(paidAmount || "0")

  const cTotal = parseFloat(cTotalValue || "0")
  const cCommAmt = cTotal > 0 ? parseFloat(((cTotal * parseFloat(cCommissionRate || "0")) / 100).toFixed(2)) : 0
  const cSellerPayable = cTotal > 0 ? parseFloat((cTotal - cCommAmt).toFixed(2)) : 0
  const cBalance = cTotal - parseFloat(cPaidAmount || "0")

  function resetModal() {
    setPurchaseType("stock")
    setPartyId(""); setPaidAmount("0"); setNotes("")
    setItems([{ productId: "", quantity: "1", price: "0" }])
    setCPartyId(""); setCWalkInSeller(""); setCCustomerId(""); setCWalkInCustomer("")
    setCProductId(""); setCBags(""); setCWeight(""); setCRate(""); setCTotalValue("")
    setCCommissionRate("2.5"); setCPaidAmount("0"); setCNotes("")
  }

  async function handleSaveStock() {
    if (!items[0].productId) return alert("Add at least one item")
    const isFarmer = partyId.startsWith("farmer_")
    const supplierId = (!isFarmer && partyId && partyId !== "direct") ? partyId : null
    const farmerId = isFarmer ? partyId.replace("farmer_", "") : null

    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId, farmerId,
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
      setShowModal(false); resetModal(); loadData()
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d?.error || "Failed to create purchase")
    }
  }

  async function handleSaveCommission() {
    const hasCustomer = cCustomerId && cCustomerId !== "walkin"
    const hasWalkIn = cCustomerId === "walkin" && cWalkInCustomer.trim()
    if (!hasCustomer && !hasWalkIn) return alert("Please select or enter a buyer")
    if (!cTotalValue || parseFloat(cTotalValue) <= 0) return alert("Total value is required")

    setSaving(true)
    try {
      const isFarmer = cPartyId.startsWith("farmer_")
      const isWalkIn = cPartyId === "walkin"
      const farmerId = isFarmer ? cPartyId.replace("farmer_", "") : null
      const supplierId = (!isFarmer && !isWalkIn && cPartyId) ? cPartyId : null
      const selectedProduct = products.find((p: any) => p.id === cProductId)

      const res = await fetch("/api/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: hasCustomer ? cCustomerId : null,
          walkInCustomer: hasWalkIn ? cWalkInCustomer.trim() : null,
          farmerId, supplierId,
          walkInSeller: isWalkIn ? cWalkInSeller.trim() || null : null,
          commodity: selectedProduct?.name || null,
          bags: cBags, weight: cWeight, rate: cRate,
          totalValue: cTotalValue, commissionRate: cCommissionRate,
          paidAmount: cPaidAmount, notes: cNotes,
        }),
      })
      if (res.ok) {
        setShowModal(false); resetModal(); loadData()
      } else {
        const d = await res.json().catch(() => ({}))
        alert(d?.error || "Failed to create commission")
      }
    } finally { setSaving(false) }
  }

  function printPurchase(p: any) {
    const from = p.farmer?.name || p.supplier?.name || "Direct"
    const itemRows = (p.items || []).map((i: any) => `
      <tr>
        <td>${i.product?.name || "—"}</td>
        <td style="text-align:center">${i.quantity} ${i.product?.unit || ""}</td>
        <td style="text-align:right">PKR ${(i.price || 0).toLocaleString()}</td>
        <td style="text-align:right">PKR ${(i.total || 0).toLocaleString()}</td>
      </tr>`).join("")
    const w = window.open("", "_blank")!
    w.document.write(`<html><head><title>Purchase — ${p.id.slice(-6).toUpperCase()}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; padding: 24px; max-width: 600px; margin: 0 auto; }
  h2 { font-size: 18px; margin: 0 0 2px; }
  .sub { color: #666; font-size: 11px; margin-bottom: 16px; }
  .info { display: flex; gap: 32px; margin-bottom: 16px; }
  .info div { font-size: 11px; }
  .info .lbl { color: #888; text-transform: uppercase; font-size: 10px; }
  .info .val { font-weight: bold; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; }
  th { background: #f5f5f5; font-size: 10px; text-transform: uppercase; text-align: left; }
  .totals { margin-left: auto; width: 240px; }
  .totals td { border: none; padding: 3px 8px; font-size: 12px; }
  .totals .grand { font-weight: bold; font-size: 14px; border-top: 2px solid #333; }
  .status { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 10px; font-weight: bold;
    background: ${p.status === "PAID" ? "#dcfce7" : p.status === "PARTIAL" ? "#fef9c3" : "#fee2e2"};
    color: ${p.status === "PAID" ? "#15803d" : p.status === "PARTIAL" ? "#854d0e" : "#b91c1c"}; }
</style></head><body>
<h2>Purchase Receipt</h2>
<div class="sub">Ref: #${p.id.slice(-6).toUpperCase()} &nbsp;|&nbsp; ${new Date(p.createdAt).toLocaleDateString("en-PK")} &nbsp;|&nbsp; By: ${p.createdBy?.name || "—"}</div>
<div class="info">
  <div><div class="lbl">From</div><div class="val">${from}</div>${p.farmer?.phone || p.supplier?.phone ? `<div style="color:#555;margin-top:2px">${p.farmer?.phone || p.supplier?.phone}</div>` : ""}</div>
  <div><div class="lbl">Type</div><div class="val">${p.farmer ? "Farmer" : p.supplier ? "Supplier" : "Direct"}</div></div>
  <div><div class="lbl">Status</div><div class="val"><span class="status">${p.status}</span></div></div>
</div>
<table>
  <thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${itemRows}</tbody>
</table>
<table class="totals">
  <tr><td>Subtotal</td><td style="text-align:right">PKR ${(p.totalAmount || 0).toLocaleString()}</td></tr>
  <tr><td>Paid</td><td style="text-align:right;color:#15803d">PKR ${(p.paidAmount || 0).toLocaleString()}</td></tr>
  <tr class="grand"><td>Balance Due</td><td style="text-align:right;color:${p.balance > 0 ? "#b91c1c" : "#15803d"}">PKR ${(p.balance || 0).toLocaleString()}</td></tr>
</table>
${p.notes ? `<p style="color:#555;font-size:11px;margin-top:8px"><strong>Notes:</strong> ${p.notes}</p>` : ""}
</body></html>`)
    w.print()
  }

  function printAllPurchases(list: any[]) {
    const rows = list.map((p, i) => {
      const from = p.farmer?.name || p.supplier?.name || "Direct"
      const type = p.farmer ? "Farmer" : p.supplier ? "Supplier" : "Direct"
      const its = (p.items || []).map((it: any) => `${it.quantity} ${it.product?.unit || ""} ${it.product?.name || ""}`).join(", ")
      return `<tr>
        <td>${i + 1}</td><td>${from}</td><td>${type}</td>
        <td style="font-size:10px;color:#555">${its || "—"}</td>
        <td style="text-align:right">PKR ${(p.totalAmount || 0).toLocaleString()}</td>
        <td style="text-align:right;color:#15803d">PKR ${(p.paidAmount || 0).toLocaleString()}</td>
        <td style="text-align:right;color:${p.balance > 0 ? "#b91c1c" : "#15803d"}">PKR ${(p.balance || 0).toLocaleString()}</td>
        <td style="text-align:center">${p.status}</td>
        <td>${new Date(p.createdAt).toLocaleDateString("en-PK")}</td>
        <td>${p.createdBy?.name || "—"}</td>
      </tr>`
    }).join("")
    const totalAmt = list.reduce((s, p) => s + (p.totalAmount || 0), 0)
    const totalPaid = list.reduce((s, p) => s + (p.paidAmount || 0), 0)
    const totalBal = list.reduce((s, p) => s + (p.balance || 0), 0)
    const w = window.open("", "_blank")!
    w.document.write(`<html><head><title>All Purchases</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; padding: 16px; }
  h2 { font-size: 15px; margin-bottom: 4px; }
  .sub { color: #666; font-size: 10px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: left; }
  th { background: #f0f0f0; font-weight: bold; font-size: 10px; text-transform: uppercase; }
  tr:nth-child(even) { background: #fafafa; }
  tfoot td { font-weight: bold; background: #f0f0f0; }
</style></head><body>
<h2>All Purchases</h2>
<p class="sub">Printed on ${new Date().toLocaleDateString("en-PK")} &nbsp;|&nbsp; Total: ${list.length} purchases</p>
<table>
  <thead><tr><th>#</th><th>From</th><th>Type</th><th>Items</th>
    <th style="text-align:right">Total</th><th style="text-align:right">Paid</th>
    <th style="text-align:right">Balance</th><th style="text-align:center">Status</th>
    <th>Date</th><th>By</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr>
    <td colspan="4" style="text-align:right">Totals</td>
    <td style="text-align:right">PKR ${totalAmt.toLocaleString()}</td>
    <td style="text-align:right">PKR ${totalPaid.toLocaleString()}</td>
    <td style="text-align:right">PKR ${totalBal.toLocaleString()}</td>
    <td colspan="3"></td>
  </tr></tfoot>
</table>
</body></html>`)
    w.print()
  }

  const filtered = purchases.filter((p) =>
    (p.supplier?.name || p.farmer?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    p.status.toLowerCase().includes(search.toLowerCase())
  )

  const sellerOptions = [
    { value: "walkin", label: "Walk-in / Direct (enter name)" },
    ...farmers.map((f: any) => ({ value: `farmer_${f.id}`, label: f.name, sub: f.village || f.phone || undefined })),
    ...suppliers.map((s: any) => ({ value: s.id, label: s.name, sub: s.phone || undefined })),
  ]

  const customerOptions = [
    { value: "walkin", label: "Walk-in / Direct (enter name)" },
    ...customers.map((c: any) => ({ value: c.id, label: c.name, sub: c.phone || undefined })),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Purchases</h2>
          <p className="text-gray-500 text-sm">{purchases.length} total purchases</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => printAllPurchases(filtered)}>
            <Printer className="w-4 h-4" /> Print All
          </Button>
          <Button onClick={() => { resetModal(); setShowModal(true) }}>
            <Plus className="w-4 h-4" /> New Purchase
          </Button>
        </div>
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
                    {["#", "From", "Type", "Total", "Paid", "Balance", "Status", "Date", "By", ""].map((h) => (
                      <th key={h} className="text-left py-3 px-3 text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-3 px-3 font-medium text-gray-800">{p.farmer?.name || p.supplier?.name || "Direct"}</td>
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
                      <td className="py-3 px-3">
                        <button onClick={() => printPurchase(p)} className="text-gray-400 hover:text-green-700" title="Print">
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={10} className="text-center py-8 text-gray-400">No purchases found</td></tr>
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

          {/* Type toggle */}
          <div className="flex rounded-lg border border-gray-200 p-1 gap-1">
            <button
              onClick={() => setPurchaseType("stock")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                purchaseType === "stock"
                  ? "bg-green-700 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Package className="w-4 h-4" /> Add to Stock
            </button>
            <button
              onClick={() => setPurchaseType("commission")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                purchaseType === "commission"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Percent className="w-4 h-4" /> Commission
            </button>
          </div>

          {/* ── ADD TO STOCK path ── */}
          {purchaseType === "stock" && (
            <div className="space-y-4">
              <div>
                <Label>From (Supplier / Farmer)</Label>
                <SearchableSelect
                  value={partyId}
                  onValueChange={setPartyId}
                  placeholder="Direct purchase"
                  options={[{ value: "direct", label: "Direct Purchase" }]}
                  groups={[
                    { label: "Suppliers", options: suppliers.map((s: any) => ({ value: s.id, label: s.name, sub: s.phone || undefined })) },
                    { label: "Farmers", options: farmers.map((f: any) => ({ value: `farmer_${f.id}`, label: f.name, sub: f.village || f.phone || undefined })) },
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
                  <span>Total:</span><span className="font-bold">{formatCurrency(stockTotal)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="whitespace-nowrap">Amount Paid:</Label>
                  <Input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="max-w-[150px]" />
                </div>
                <div className="flex justify-between text-sm">
                  <span>Balance:</span>
                  <span className={`font-bold ${stockBalance > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(stockBalance)}</span>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSaveStock} className="flex-1 bg-green-700 hover:bg-green-800">Add to Stock</Button>
              </div>
            </div>
          )}

          {/* ── COMMISSION path ── */}
          {purchaseType === "commission" && (
            <div className="space-y-4">
              <div>
                <Label>Seller (Farmer / Supplier) <span className="text-gray-400 font-normal">— optional</span></Label>
                <SearchableSelect
                  value={cPartyId}
                  onValueChange={(v) => { setCPartyId(v); if (v !== "walkin") setCWalkInSeller("") }}
                  placeholder="Select seller or walk-in..."
                  options={sellerOptions}
                />
                {cPartyId === "walkin" && (
                  <Input className="mt-2" placeholder="Enter seller name..." value={cWalkInSeller} onChange={(e) => setCWalkInSeller(e.target.value)} />
                )}
              </div>
              <div>
                <Label>Buyer (Customer) <span className="text-red-500">*</span></Label>
                <SearchableSelect
                  value={cCustomerId}
                  onValueChange={(v) => { setCCustomerId(v); if (v !== "walkin") setCWalkInCustomer("") }}
                  placeholder="Select customer or walk-in..."
                  options={customerOptions}
                />
                {cCustomerId === "walkin" && (
                  <Input className="mt-2" placeholder="Enter buyer name..." value={cWalkInCustomer} onChange={(e) => setCWalkInCustomer(e.target.value)} />
                )}
              </div>
              <div>
                <Label>Product / Commodity</Label>
                <SearchableSelect
                  value={cProductId}
                  onValueChange={setCProductId}
                  placeholder="Select product..."
                  options={products.map((p: any) => ({ value: p.id, label: p.name, sub: p.unit }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Bags</Label><Input type="number" placeholder="0" value={cBags} onChange={(e) => setCBags(e.target.value)} /></div>
                <div><Label>Weight (KG)</Label><Input type="number" placeholder="0" value={cWeight} onChange={(e) => setCWeight(e.target.value)} /></div>
                <div><Label>Rate (per KG)</Label><Input type="number" placeholder="0" value={cRate} onChange={(e) => setCRate(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Total Value <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="0" value={cTotalValue} onChange={(e) => setCTotalValue(e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">Auto-filled from weight × rate</p>
                </div>
                <div><Label>Commission %</Label><Input type="number" placeholder="2.5" value={cCommissionRate} onChange={(e) => setCCommissionRate(e.target.value)} /></div>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 space-y-1.5 text-sm border border-orange-100">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Value (buyer owes):</span>
                  <span className="font-medium">{formatCurrency(cTotal)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Your Commission ({cCommissionRate}%):</span>
                  <span className="font-bold">{formatCurrency(cCommAmt)}</span>
                </div>
                <div className="flex justify-between text-blue-700 border-t border-orange-200 pt-1.5">
                  <span>Seller Payable:</span>
                  <span className="font-semibold">{formatCurrency(cSellerPayable)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label className="whitespace-nowrap">Initial Payment:</Label>
                <Input type="number" value={cPaidAmount} onChange={(e) => setCPaidAmount(e.target.value)} className="max-w-[150px]" />
                <span className="text-sm text-gray-500">Balance: {formatCurrency(cBalance)}</span>
              </div>
              <div><Label>Notes</Label><Textarea value={cNotes} onChange={(e) => setCNotes(e.target.value)} rows={2} /></div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleSaveCommission} disabled={saving} className="flex-1 bg-orange-600 hover:bg-orange-700">
                  {saving ? "Saving..." : "Create Commission"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
