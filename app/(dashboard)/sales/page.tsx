"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, formatDate, formatDateTime, getStatusColor } from "@/lib/utils"
import { Plus, Search, Trash2, ShoppingCart, Eye, Printer, Sprout } from "lucide-react"

export default function SalesPage() {
  const { data: session } = useSession()
  const [sales, setSales] = useState<any[]>([])
  const [pesticideSales, setPesticideSales] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [pesticides, setPesticides] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"products" | "pesticides">("products")
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showPesticideSaleModal, setShowPesticideSaleModal] = useState(false)
  const [showPesticideDetailModal, setShowPesticideDetailModal] = useState(false)
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [selectedPesticideSaleDetail, setSelectedPesticideSaleDetail] = useState<any>(null)
  const [customerId, setCustomerId] = useState("")
  const [paidAmount, setPaidAmount] = useState("0")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState([{ productId: "", quantity: "1", price: "0" }])
  const [pesticideSaleForm, setPesticideSaleForm] = useState({ pesticideId: "", quantity: "1", customerId: "", customerName: "", paidAmount: "0" })

  async function loadData() {
    setLoading(true)
    try {
      const [sr, pr, cr, psr, pestr] = await Promise.allSettled([
        fetch("/api/sales").then((r) => r.json()),
        fetch("/api/inventory").then((r) => r.json()),
        fetch("/api/customers").then((r) => r.json()),
        fetch("/api/pesticides/sales").then((r) => r.json()),
        fetch("/api/pesticides").then((r) => r.json()),
      ])
      if (sr.status === "fulfilled") setSales(sr.value.sales || [])
      if (pr.status === "fulfilled") setProducts(pr.value.products || [])
      if (cr.status === "fulfilled") setCustomers(cr.value.customers || [])
      if (psr.status === "fulfilled") setPesticideSales(psr.value.sales || [])
      if (pestr.status === "fulfilled") setPesticides(pestr.value.pesticides || [])
    } finally {
      setLoading(false)
    }
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
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data?.error || "Failed to create sale")
    }
  }

  const selectedPesticide = pesticides.find((p) => p.id === pesticideSaleForm.pesticideId)
  const pesticideSaleTotal = parseFloat(pesticideSaleForm.quantity || "0") * (selectedPesticide?.salePrice || 0)

  async function handlePesticideSale() {
    if (!pesticideSaleForm.pesticideId) return alert("Please select a pesticide")
    if (!selectedPesticide) return alert("Selected pesticide not found. Please refresh and try again.")
    const qty = parseFloat(pesticideSaleForm.quantity)
    if (!qty || qty <= 0) return alert("Please enter a valid quantity")
    if (qty > selectedPesticide.quantity) return alert(`Insufficient stock. Available: ${selectedPesticide.quantity} ${selectedPesticide.unit}`)
    const chosenCustomer = customers.find((c: any) => c.id === pesticideSaleForm.customerId)
    const customerName = chosenCustomer ? chosenCustomer.name : pesticideSaleForm.customerName
    try {
      const res = await fetch("/api/pesticides/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pesticideId: pesticideSaleForm.pesticideId,
          quantity: qty,
          unitPrice: selectedPesticide.salePrice,
          customerId: pesticideSaleForm.customerId || null,
          customerName,
          paidAmount: parseFloat(pesticideSaleForm.paidAmount) || 0,
        }),
      })
      if (res.ok) {
        setShowPesticideSaleModal(false)
        setPesticideSaleForm({ pesticideId: "", quantity: "1", customerId: "", customerName: "", paidAmount: "0" })
        loadData()
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data?.error || "Failed to create pesticide sale")
      }
    } catch (err) {
      alert("Network error. Please try again.")
    }
  }

  function openDetail(sale: any) {
    setSelectedSale(sale)
    setShowDetailModal(true)
  }

  function handlePrint() {
    window.print()
  }

  const filtered = sales.filter((s) =>
    s.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.status.toLowerCase().includes(search.toLowerCase())
  )

  const filteredPesticideSales = pesticideSales.filter((s) =>
    s.pesticide?.name?.toLowerCase().includes(search.toLowerCase()) ||
    (s.customerName || "").toLowerCase().includes(search.toLowerCase())
  )

  const todayTotal = sales
    .filter((s) => new Date(s.createdAt).toDateString() === new Date().toDateString() && s.status !== "CANCELLED")
    .reduce((sum, s) => sum + s.totalAmount, 0)

  const shopName = (session?.user as any)?.shopName || "Gala Mandi"

  return (
    <>
      {/* ── Pesticide Sale Print Template ── */}
      {selectedPesticideSaleDetail && (
        <div className="hidden print:block fixed inset-0 bg-white z-50 p-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-5">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{shopName}</h1>
                <p className="text-sm text-gray-500">Pesticide Sale Invoice</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-800">Invoice #{selectedPesticideSaleDetail.id.slice(-8).toUpperCase()}</p>
                <p className="text-sm text-gray-600">Date: {formatDate(selectedPesticideSaleDetail.createdAt)}</p>
                <p className="text-sm text-gray-600">Time: {new Date(selectedPesticideSaleDetail.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bill To</p>
              {(selectedPesticideSaleDetail.customer || selectedPesticideSaleDetail.customerName) ? (
                <div>
                  <p className="text-base font-bold text-gray-900">{selectedPesticideSaleDetail.customer?.name || selectedPesticideSaleDetail.customerName}</p>
                  {selectedPesticideSaleDetail.customer?.phone && <p className="text-sm text-gray-600">Phone: {selectedPesticideSaleDetail.customer.phone}</p>}
                </div>
              ) : (
                <p className="text-base font-medium text-gray-700">Walk-in Customer</p>
              )}
            </div>
            <table className="w-full text-sm border-collapse mb-5">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="px-3 py-2 text-left font-semibold">#</th>
                  <th className="px-3 py-2 text-left font-semibold">Pesticide</th>
                  <th className="px-3 py-2 text-center font-semibold">Qty</th>
                  <th className="px-3 py-2 text-center font-semibold">Unit</th>
                  <th className="px-3 py-2 text-right font-semibold">Unit Price</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-50">
                  <td className="px-3 py-2 border-b border-gray-200 text-gray-500">1</td>
                  <td className="px-3 py-2 border-b border-gray-200 font-medium text-gray-900">{selectedPesticideSaleDetail.pesticide?.name}</td>
                  <td className="px-3 py-2 border-b border-gray-200 text-center">{selectedPesticideSaleDetail.quantity}</td>
                  <td className="px-3 py-2 border-b border-gray-200 text-center text-gray-500">{selectedPesticideSaleDetail.pesticide?.unit}</td>
                  <td className="px-3 py-2 border-b border-gray-200 text-right">{formatCurrency(selectedPesticideSaleDetail.unitPrice)}</td>
                  <td className="px-3 py-2 border-b border-gray-200 text-right font-semibold">{formatCurrency(selectedPesticideSaleDetail.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
            <div className="flex justify-end mb-5">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sub Total:</span>
                  <span className="font-semibold">{formatCurrency(selectedPesticideSaleDetail.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-700">
                  <span>Amount Paid:</span>
                  <span className="font-semibold">{formatCurrency(selectedPesticideSaleDetail.paidAmount)}</span>
                </div>
                <div className="border-t border-gray-300 pt-1.5 flex justify-between font-bold text-base">
                  <span className={(selectedPesticideSaleDetail.balance ?? 0) > 0 ? "text-red-700" : "text-green-700"}>
                    {(selectedPesticideSaleDetail.balance ?? 0) > 0 ? "Balance Due:" : "Change:"}
                  </span>
                  <span className={(selectedPesticideSaleDetail.balance ?? 0) > 0 ? "text-red-700" : "text-green-700"}>
                    {formatCurrency(Math.abs(selectedPesticideSaleDetail.balance ?? 0))}
                  </span>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4 flex items-start justify-between text-sm text-gray-600">
              <div>
                {selectedPesticideSaleDetail.notes && (
                  <p><span className="font-medium">Notes:</span> {selectedPesticideSaleDetail.notes}</p>
                )}
              </div>
              <div className="text-right">
                <p>Sold by: {selectedPesticideSaleDetail.soldBy?.name}</p>
                <p className="mt-4 pt-8 border-t border-gray-400 text-xs text-gray-400">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Product Sale Print Invoice Template (hidden on screen, shown on print) ── */}
      {selectedSale && (
        <div className="hidden print:block fixed inset-0 bg-white z-50 p-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start justify-between border-b-2 border-gray-800 pb-4 mb-5">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{shopName}</h1>
                <p className="text-sm text-gray-500">Sales Invoice</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-800">Invoice #{selectedSale.id.slice(-8).toUpperCase()}</p>
                <p className="text-sm text-gray-600">Date: {formatDate(selectedSale.createdAt)}</p>
                <p className="text-sm text-gray-600">Time: {new Date(selectedSale.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bill To</p>
              {selectedSale.customer ? (
                <div>
                  <p className="text-base font-bold text-gray-900">{selectedSale.customer.name}</p>
                  {selectedSale.customer.phone && <p className="text-sm text-gray-600">Phone: {selectedSale.customer.phone}</p>}
                  {selectedSale.customer.address && <p className="text-sm text-gray-600">Address: {selectedSale.customer.address}</p>}
                </div>
              ) : (
                <p className="text-base font-medium text-gray-700">Walk-in Customer</p>
              )}
            </div>
            <table className="w-full text-sm border-collapse mb-5">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="px-3 py-2 text-left font-semibold">#</th>
                  <th className="px-3 py-2 text-left font-semibold">Product</th>
                  <th className="px-3 py-2 text-center font-semibold">Qty</th>
                  <th className="px-3 py-2 text-center font-semibold">Unit</th>
                  <th className="px-3 py-2 text-right font-semibold">Unit Price</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedSale.items?.map((item: any, i: number) => (
                  <tr key={item.id} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="px-3 py-2 border-b border-gray-200 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2 border-b border-gray-200 font-medium text-gray-900">{item.product?.name}</td>
                    <td className="px-3 py-2 border-b border-gray-200 text-center">{item.quantity}</td>
                    <td className="px-3 py-2 border-b border-gray-200 text-center text-gray-500">{item.product?.unit || "KG"}</td>
                    <td className="px-3 py-2 border-b border-gray-200 text-right">{formatCurrency(item.price)}</td>
                    <td className="px-3 py-2 border-b border-gray-200 text-right font-semibold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mb-5">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sub Total:</span>
                  <span className="font-semibold">{formatCurrency(selectedSale.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-700">
                  <span>Amount Paid:</span>
                  <span className="font-semibold">{formatCurrency(selectedSale.paidAmount)}</span>
                </div>
                <div className="border-t border-gray-300 pt-1.5 flex justify-between font-bold text-base">
                  <span className={selectedSale.balance > 0 ? "text-red-700" : "text-green-700"}>
                    {selectedSale.balance > 0 ? "Balance Due:" : "Change:"}
                  </span>
                  <span className={selectedSale.balance > 0 ? "text-red-700" : "text-green-700"}>
                    {formatCurrency(Math.abs(selectedSale.balance))}
                  </span>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4 flex items-start justify-between text-sm text-gray-600">
              <div>
                <span className="font-medium">Status: </span>
                <span className="font-bold uppercase">{selectedSale.status}</span>
                {selectedSale.notes && (
                  <p className="mt-1"><span className="font-medium">Notes:</span> {selectedSale.notes}</p>
                )}
              </div>
              <div className="text-right">
                <p>Prepared by: {selectedSale.createdBy?.name}</p>
                <p className="mt-4 pt-8 border-t border-gray-400 text-xs text-gray-400">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Page (hidden on print) ── */}
      <div className="space-y-6 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sales</h2>
            <p className="text-gray-500 text-sm">Today: {formatCurrency(todayTotal)}</p>
          </div>
          <div className="flex gap-2">
            {activeTab === "products" ? (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4" /> New Sale
              </Button>
            ) : (
              <Button onClick={() => { setPesticideSaleForm({ pesticideId: "", quantity: "1", customerId: "", customerName: "", paidAmount: "0" }); setShowPesticideSaleModal(true) }} className="gap-2">
                <Plus className="w-4 h-4" /> New Pesticide Sale
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "products" ? "border-green-700 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            <ShoppingCart className="w-4 h-4" /> Product Sales
          </button>
          <button
            onClick={() => setActiveTab("pesticides")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "pesticides" ? "border-green-700 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            <Sprout className="w-4 h-4" /> Pesticide Sales
          </button>
        </div>

        {/* Product Sales Table */}
        {activeTab === "products" && (
          <Card>
            <CardHeader>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search sales..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </CardHeader>
            <CardContent>
              {loading && !sales.length ? (
                <div className="text-center py-8 text-gray-400">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {["#", "Customer", "Total", "Paid", "Balance", "Status", "Date", "By", ""].map((h) => (
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
                          <td className="py-3 px-3">
                            <button
                              onClick={() => openDetail(s)}
                              className="p-1.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                              title="View & Print"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr><td colSpan={9} className="text-center py-8 text-gray-400">No sales found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pesticide Sales Table */}
        {activeTab === "pesticides" && (
          <Card>
            <CardHeader>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Search pesticide sales..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </CardHeader>
            <CardContent>
              {loading && !pesticideSales.length ? (
                <div className="text-center py-8 text-gray-400">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {["#", "Pesticide", "Qty", "Unit Price", "Total", "Customer", "Paid", "Balance", "Date", "By", ""].map((h) => (
                          <th key={h} className="text-left py-3 px-3 text-gray-500 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPesticideSales.map((s, i) => {
                        const bal = s.balance ?? (s.totalAmount - s.paidAmount)
                        const displayName = s.customer?.name || s.customerName
                        return (
                          <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-3 text-gray-400 text-xs">{i + 1}</td>
                            <td className="py-3 px-3 font-medium text-gray-800">{s.pesticide?.name}</td>
                            <td className="py-3 px-3 text-gray-700">{s.quantity} {s.pesticide?.unit}</td>
                            <td className="py-3 px-3 text-gray-700">{formatCurrency(s.unitPrice)}</td>
                            <td className="py-3 px-3 font-semibold text-gray-900">{formatCurrency(s.totalAmount)}</td>
                            <td className="py-3 px-3">
                              {displayName ? (
                                <span className="text-gray-800">{displayName}</span>
                              ) : (
                                <span className="text-gray-400 text-xs">Walk-in</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-green-600">{formatCurrency(s.paidAmount)}</td>
                            <td className="py-3 px-3 text-red-600">{formatCurrency(bal)}</td>
                            <td className="py-3 px-3 text-gray-500">{formatDate(s.createdAt)}</td>
                            <td className="py-3 px-3 text-gray-500">{s.soldBy?.name}</td>
                            <td className="py-3 px-3">
                              <button
                                onClick={() => { setSelectedPesticideSaleDetail(s); setShowPesticideDetailModal(true) }}
                                className="p-1.5 text-gray-400 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                title="View & Print"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                      {filteredPesticideSales.length === 0 && (
                        <tr><td colSpan={11} className="text-center py-8 text-gray-400">No pesticide sales found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* New Product Sale Modal */}
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
                            {products.map((p: any) => (
                              <SelectItem key={p.id} value={p.id} disabled={p.currentStock <= 0}>
                                {p.name}
                                {p.currentStock <= 0
                                  ? " — Out of Stock"
                                  : ` — ${p.currentStock} ${p.unit} left`}
                              </SelectItem>
                            ))}
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

        {/* New Pesticide Sale Modal */}
        <Dialog open={showPesticideSaleModal} onOpenChange={setShowPesticideSaleModal}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sprout className="w-5 h-5 text-green-600" /> New Pesticide Sale
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Pesticide</Label>
                <Select value={pesticideSaleForm.pesticideId} onValueChange={(v) => setPesticideSaleForm({ ...pesticideSaleForm, pesticideId: v, quantity: "1" })}>
                  <SelectTrigger><SelectValue placeholder="Select pesticide" /></SelectTrigger>
                  <SelectContent>
                    {pesticides.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} — {p.quantity} {p.unit} available</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPesticide && (
                <div className="bg-green-50 rounded-lg p-3 text-sm space-y-0.5">
                  <p className="text-gray-600">Sale Price: <strong className="text-gray-900">{formatCurrency(selectedPesticide.salePrice)} / {selectedPesticide.unit}</strong></p>
                  <p className="text-gray-600">In Stock: <strong className="text-gray-900">{selectedPesticide.quantity} {selectedPesticide.unit}</strong></p>
                </div>
              )}
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={pesticideSaleForm.quantity} onChange={(e) => setPesticideSaleForm({ ...pesticideSaleForm, quantity: e.target.value })} />
              </div>
              {selectedPesticide && (
                <div className="flex justify-between items-center bg-gray-50 rounded px-3 py-2">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="text-lg font-bold text-green-700">{formatCurrency(pesticideSaleTotal)}</span>
                </div>
              )}
              <div>
                <Label>Customer (optional)</Label>
                <Select value={pesticideSaleForm.customerId || "walk-in"} onValueChange={(v) => setPesticideSaleForm({ ...pesticideSaleForm, customerId: v === "walk-in" ? "" : v, customerName: "" })}>
                  <SelectTrigger><SelectValue placeholder="Walk-in / select customer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                    {customers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!pesticideSaleForm.customerId && (
                <div>
                  <Label>Walk-in Name (optional)</Label>
                  <Input placeholder="Enter customer name" value={pesticideSaleForm.customerName} onChange={(e) => setPesticideSaleForm({ ...pesticideSaleForm, customerName: e.target.value })} />
                </div>
              )}
              <div>
                <Label>Amount Paid</Label>
                <Input type="number" value={pesticideSaleForm.paidAmount} onChange={(e) => setPesticideSaleForm({ ...pesticideSaleForm, paidAmount: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowPesticideSaleModal(false)} className="flex-1">Cancel</Button>
                <Button onClick={handlePesticideSale} className="flex-1">Sell</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sale Detail Modal */}
        {selectedSale && (
          <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-green-600" />
                    Sale Details
                    <span className="text-sm font-normal text-gray-400">#{selectedSale.id.slice(-8).toUpperCase()}</span>
                  </DialogTitle>
                  <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2 mr-6">
                    <Printer className="w-4 h-4" /> Print Invoice
                  </Button>
                </div>
              </DialogHeader>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 font-medium uppercase mb-1">Customer</p>
                    <p className="font-bold text-gray-900">{selectedSale.customer?.name || "Walk-in"}</p>
                    {selectedSale.customer?.phone && (
                      <p className="text-sm text-gray-600">{selectedSale.customer.phone}</p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 font-medium uppercase mb-1">Sale Info</p>
                    <p className="text-sm text-gray-700">Date: <span className="font-medium">{formatDate(selectedSale.createdAt)}</span></p>
                    <p className="text-sm text-gray-700">By: <span className="font-medium">{selectedSale.createdBy?.name}</span></p>
                    <p className="text-sm text-gray-700">Status:
                      <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${getStatusColor(selectedSale.status)}`}>
                        {selectedSale.status}
                      </span>
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Items</p>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">#</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Qty</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Unit</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Unit Price</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedSale.items?.map((item: any, i: number) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-3 py-2.5 font-medium text-gray-900">{item.product?.name}</td>
                            <td className="px-3 py-2.5 text-center text-gray-700">{item.quantity}</td>
                            <td className="px-3 py-2.5 text-center text-gray-500 text-xs">{item.product?.unit || "KG"}</td>
                            <td className="px-3 py-2.5 text-right text-gray-700">{formatCurrency(item.price)}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-end">
                    <div className="w-56 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-bold text-gray-900">{formatCurrency(selectedSale.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-green-700">
                        <span>Amount Paid:</span>
                        <span className="font-semibold">{formatCurrency(selectedSale.paidAmount)}</span>
                      </div>
                      <div className={`flex justify-between border-t border-gray-200 pt-2 font-bold ${selectedSale.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                        <span>{selectedSale.balance > 0 ? "Balance Due:" : "Change:"}</span>
                        <span>{formatCurrency(Math.abs(selectedSale.balance))}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {selectedSale.notes && (
                  <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{selectedSale.notes}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Pesticide Sale Detail Modal */}
        {selectedPesticideSaleDetail && (
          <Dialog open={showPesticideDetailModal} onOpenChange={setShowPesticideDetailModal}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <Sprout className="w-5 h-5 text-green-600" />
                    Pesticide Sale
                    <span className="text-sm font-normal text-gray-400">#{selectedPesticideSaleDetail.id.slice(-8).toUpperCase()}</span>
                  </DialogTitle>
                  <Button onClick={() => window.print()} variant="outline" size="sm" className="gap-2 mr-6">
                    <Printer className="w-4 h-4" /> Print
                  </Button>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 font-medium uppercase mb-1">Customer</p>
                    <p className="font-bold text-gray-900">
                      {selectedPesticideSaleDetail.customer?.name || selectedPesticideSaleDetail.customerName || "Walk-in"}
                    </p>
                    {selectedPesticideSaleDetail.customer?.phone && (
                      <p className="text-sm text-gray-600">{selectedPesticideSaleDetail.customer.phone}</p>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 font-medium uppercase mb-1">Sale Info</p>
                    <p className="text-sm text-gray-700">Date: <span className="font-medium">{formatDate(selectedPesticideSaleDetail.createdAt)}</span></p>
                    <p className="text-sm text-gray-700">By: <span className="font-medium">{selectedPesticideSaleDetail.soldBy?.name}</span></p>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Pesticide</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Qty</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Unit</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Unit Price</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2.5 font-medium text-gray-900">{selectedPesticideSaleDetail.pesticide?.name}</td>
                        <td className="px-3 py-2.5 text-center text-gray-700">{selectedPesticideSaleDetail.quantity}</td>
                        <td className="px-3 py-2.5 text-center text-gray-500 text-xs">{selectedPesticideSaleDetail.pesticide?.unit}</td>
                        <td className="px-3 py-2.5 text-right text-gray-700">{formatCurrency(selectedPesticideSaleDetail.unitPrice)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{formatCurrency(selectedPesticideSaleDetail.totalAmount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-end">
                    <div className="w-56 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-bold text-gray-900">{formatCurrency(selectedPesticideSaleDetail.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-green-700">
                        <span>Amount Paid:</span>
                        <span className="font-semibold">{formatCurrency(selectedPesticideSaleDetail.paidAmount)}</span>
                      </div>
                      <div className={`flex justify-between border-t border-gray-200 pt-2 font-bold ${(selectedPesticideSaleDetail.balance ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                        <span>{(selectedPesticideSaleDetail.balance ?? 0) > 0 ? "Balance Due:" : "Paid"}</span>
                        <span>{formatCurrency(Math.abs(selectedPesticideSaleDetail.balance ?? 0))}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {selectedPesticideSaleDetail.notes && (
                  <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{selectedPesticideSaleDetail.notes}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  )
}
