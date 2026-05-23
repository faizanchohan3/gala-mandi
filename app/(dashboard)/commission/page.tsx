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
import { buildPrintHeader, receiptCSS, reportCSS } from "@/lib/print-utils"
import { Plus, Search, Percent, CreditCard, Printer } from "lucide-react"

export default function CommissionPage() {
  const [commissions, setCommissions] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [farmers, setFarmers] = useState<any[]>([])
  const [shop, setShop] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  // New commission modal state
  const [showNew, setShowNew] = useState(false)
  const [customerId, setCustomerId] = useState("")        // "" = none selected, "walkin" = walk-in
  const [walkInCustomer, setWalkInCustomer] = useState("")
  const [partyId, setPartyId] = useState("")              // "" = none, "walkin" = walk-in, "farmer_X" or supplier id
  const [walkInSeller, setWalkInSeller] = useState("")
  const [commodity, setCommodity] = useState("")
  const [bags, setBags] = useState("")
  const [weight, setWeight] = useState("")
  const [rate, setRate] = useState("")
  const [totalValue, setTotalValue] = useState("")
  const [commissionRate, setCommissionRate] = useState("2.5")
  const [paidAmount, setPaidAmount] = useState("0")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  // Payment modal state
  const [payTarget, setPayTarget] = useState<any>(null)
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState("CASH")
  const [payNotes, setPayNotes] = useState("")
  const [paying, setPaying] = useState(false)

  async function safeFetch(url: string, fallback: any = {}) {
    try {
      const r = await fetch(url)
      if (!r.ok) return fallback
      return await r.json()
    } catch {
      return fallback
    }
  }

  async function loadData() {
    setLoading(true)
    const [cm, cu, su, fa, sh] = await Promise.all([
      safeFetch("/api/commissions", { commissions: [] }),
      safeFetch("/api/customers", { customers: [] }),
      safeFetch("/api/suppliers", { suppliers: [] }),
      safeFetch("/api/farmers", { farmers: [] }),
      safeFetch("/api/settings", { shop: null }),
    ])
    setCommissions(cm.commissions || [])
    setCustomers(cu.customers || [])
    setSuppliers(su.suppliers || [])
    setFarmers(fa.farmers || [])
    setShop(sh.shop || null)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const w = parseFloat(weight)
    const r = parseFloat(rate)
    if (w > 0 && r > 0) setTotalValue((w * r).toFixed(2))
  }, [weight, rate])

  const total = parseFloat(totalValue || "0")
  const commRate = parseFloat(commissionRate || "0")
  const commAmount = total > 0 ? parseFloat(((total * commRate) / 100).toFixed(2)) : 0
  const sellerPayable = total > 0 ? parseFloat((total - commAmount).toFixed(2)) : 0
  const balance = total - parseFloat(paidAmount || "0")

  function resetNewForm() {
    setCustomerId(""); setWalkInCustomer("")
    setPartyId(""); setWalkInSeller("")
    setCommodity(""); setBags(""); setWeight("")
    setRate(""); setTotalValue(""); setCommissionRate("2.5"); setPaidAmount("0"); setNotes("")
  }

  async function handleSave() {
    const hasCustomer = customerId && customerId !== "walkin"
    const hasWalkIn = customerId === "walkin" && walkInCustomer.trim()
    if (!hasCustomer && !hasWalkIn) return alert("Please select or enter a buyer")
    if (!totalValue || parseFloat(totalValue) <= 0) return alert("Total value is required")

    setSaving(true)
    try {
      const isFarmer = partyId.startsWith("farmer_")
      const isWalkInSeller = partyId === "walkin"
      const farmerId = isFarmer ? partyId.replace("farmer_", "") : null
      const supplierId = (!isFarmer && !isWalkInSeller && partyId) ? partyId : null

      const res = await fetch("/api/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: hasCustomer ? customerId : null,
          walkInCustomer: hasWalkIn ? walkInCustomer.trim() : null,
          farmerId,
          supplierId,
          walkInSeller: isWalkInSeller ? walkInSeller.trim() || null : null,
          commodity,
          bags,
          weight,
          rate,
          totalValue,
          commissionRate,
          paidAmount,
          notes,
        }),
      })
      if (res.ok) {
        setShowNew(false)
        resetNewForm()
        loadData()
      } else {
        const d = await res.json().catch(() => ({}))
        alert(d?.error || "Failed to save commission")
      }
    } finally {
      setSaving(false)
    }
  }

  async function handlePay() {
    if (!payAmount || parseFloat(payAmount) <= 0) return alert("Enter a valid amount")
    setPaying(true)
    try {
      const res = await fetch(`/api/commissions/${payTarget.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(payAmount), method: payMethod, notes: payNotes }),
      })
      if (res.ok) {
        setPayTarget(null); setPayAmount(""); setPayMethod("CASH"); setPayNotes("")
        loadData()
      } else {
        const d = await res.json().catch(() => ({}))
        alert(d?.error || "Failed to record payment")
      }
    } finally {
      setPaying(false)
    }
  }

  const filtered = commissions.filter((c) => {
    const q = search.toLowerCase()
    const buyerName = c.customer?.name || c.walkInCustomer || ""
    const sellerName = c.farmer?.name || c.supplier?.name || c.walkInSeller || ""
    return (
      buyerName.toLowerCase().includes(q) ||
      sellerName.toLowerCase().includes(q) ||
      (c.commodity || "").toLowerCase().includes(q)
    )
  })

  const totalCommEarned = commissions.reduce((s, c) => s + c.commissionAmount, 0)
  const totalPending = commissions.filter((c) => c.status !== "PAID").reduce((s, c) => s + c.balance, 0)

  // Seller copy: shows only what seller will receive — buyer total and commission hidden
  function printForSeller(c: any) {
    const seller = c.farmer?.name || c.supplier?.name || c.walkInSeller || "—"
    const buyer = c.customer?.name || c.walkInCustomer || "—"
    const ref = c.id.slice(-6).toUpperCase()
    const date = new Date(c.createdAt).toLocaleDateString("en-PK")
    const w = window.open("", "_blank")!
    w.document.write(`<html><head><title>Seller Copy — ${ref}</title>
<style>${receiptCSS}</style></head><body>
${buildPrintHeader(shop)}
<div class="doc-header">
  <div>
    <div class="doc-title">Seller Copy</div>
    <div class="doc-sub">Ref: #${ref} &nbsp;|&nbsp; ${date}</div>
  </div>
  <div class="doc-meta"><div>${date}</div></div>
</div>
<div class="body-pad">
  <div class="info-grid">
    <div><div class="lbl">Seller</div><div class="val">${seller}</div></div>
    <div><div class="lbl">Buyer</div><div class="val">${buyer}</div></div>
    ${c.commodity ? `<div><div class="lbl">Commodity</div><div class="val">${c.commodity}</div></div>` : ""}
    ${c.rate ? `<div><div class="lbl">Rate</div><div class="val">PKR ${c.rate}/kg</div></div>` : ""}
    ${c.bags ? `<div><div class="lbl">Bags</div><div class="val">${c.bags}</div></div>` : ""}
    ${c.weight ? `<div><div class="lbl">Weight</div><div class="val">${c.weight} KG</div></div>` : ""}
  </div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${c.weight ? `<tr><td>Weight</td><td style="text-align:right">${c.weight} KG</td></tr>` : ""}
      ${c.bags ? `<tr><td>Bags</td><td style="text-align:right">${c.bags} bags</td></tr>` : ""}
    </tbody>
    <tfoot>
      <tr><td><strong>Amount Payable to You</strong></td><td style="text-align:right;color:#1d4ed8" class="amount-big">PKR ${(c.sellerPayable || 0).toLocaleString()}</td></tr>
    </tfoot>
  </table>
  ${c.notes ? `<p style="font-size:11px;color:#555;margin-top:8px"><strong>Notes:</strong> ${c.notes}</p>` : ""}
  <div class="sig-row">
    <span>Seller Signature: _______________________</span>
    <span>Authorized By: _______________________</span>
  </div>
</div>
</body></html>`)
    w.print()
  }

  // Buyer copy: shows only what buyer owes — seller amount and commission hidden
  function printForBuyer(c: any) {
    const seller = c.farmer?.name || c.supplier?.name || c.walkInSeller || "—"
    const buyer = c.customer?.name || c.walkInCustomer || "—"
    const ref = c.id.slice(-6).toUpperCase()
    const date = new Date(c.createdAt).toLocaleDateString("en-PK")
    const statusCls = c.status === "PAID" ? "PAID" : c.status === "PARTIAL" ? "PARTIAL" : "PENDING"
    const w = window.open("", "_blank")!
    w.document.write(`<html><head><title>Buyer Copy — ${ref}</title>
<style>${receiptCSS}</style></head><body>
${buildPrintHeader(shop)}
<div class="doc-header">
  <div>
    <div class="doc-title">Buyer Copy</div>
    <div class="doc-sub">Ref: #${ref} &nbsp;|&nbsp; ${date}</div>
  </div>
  <div class="doc-meta"><div>${date}</div><span class="badge badge-${statusCls}">${c.status}</span></div>
</div>
<div class="body-pad">
  <div class="info-grid">
    <div><div class="lbl">Buyer</div><div class="val">${buyer}</div></div>
    <div><div class="lbl">Seller</div><div class="val">${seller}</div></div>
    ${c.commodity ? `<div><div class="lbl">Commodity</div><div class="val">${c.commodity}</div></div>` : ""}
    ${c.rate ? `<div><div class="lbl">Rate</div><div class="val">PKR ${c.rate}/kg</div></div>` : ""}
    ${c.bags ? `<div><div class="lbl">Bags</div><div class="val">${c.bags}</div></div>` : ""}
    ${c.weight ? `<div><div class="lbl">Weight</div><div class="val">${c.weight} KG</div></div>` : ""}
  </div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${c.weight ? `<tr><td>Weight</td><td style="text-align:right">${c.weight} KG</td></tr>` : ""}
      ${c.bags ? `<tr><td>Bags</td><td style="text-align:right">${c.bags} bags</td></tr>` : ""}
      <tr><td>Total Amount</td><td style="text-align:right">PKR ${(c.totalValue || 0).toLocaleString()}</td></tr>
      <tr><td>Paid</td><td style="text-align:right;color:#15803d">PKR ${(c.paidAmount || 0).toLocaleString()}</td></tr>
    </tbody>
    <tfoot>
      <tr><td><strong>Balance Due</strong></td><td style="text-align:right;color:${c.balance > 0 ? "#b91c1c" : "#15803d"}" class="amount-big">PKR ${(c.balance || 0).toLocaleString()}</td></tr>
    </tfoot>
  </table>
  ${c.notes ? `<p style="font-size:11px;color:#555;margin-top:8px"><strong>Notes:</strong> ${c.notes}</p>` : ""}
  <div class="sig-row">
    <span>Buyer Signature: _______________________</span>
    <span>Authorized By: _______________________</span>
  </div>
</div>
</body></html>`)
    w.print()
  }

  function printAllCommissions(list: any[]) {
    const rows = list.map((c, i) => {
      const seller = c.farmer?.name || c.supplier?.name || c.walkInSeller || "—"
      const buyer = c.customer?.name || c.walkInCustomer || "—"
      const commodity = [c.commodity, c.bags ? `${c.bags} bags` : null, c.weight ? `${c.weight} kg` : null].filter(Boolean).join(", ")
      const statusCls = c.status === "PAID" ? "PAID" : c.status === "PARTIAL" ? "PARTIAL" : "PENDING"
      return `<tr>
        <td>${i + 1}</td>
        <td>${seller}</td>
        <td>${buyer}</td>
        <td>${commodity || "—"}</td>
        <td style="text-align:right">PKR ${(c.totalValue || 0).toLocaleString()}</td>
        <td style="text-align:right;color:#15803d">PKR ${(c.paidAmount || 0).toLocaleString()}</td>
        <td style="text-align:right;color:${c.balance > 0 ? "#b91c1c" : "#15803d"}">PKR ${(c.balance || 0).toLocaleString()}</td>
        <td><span class="badge badge-${statusCls}">${c.status}</span></td>
        <td>${new Date(c.createdAt).toLocaleDateString("en-PK")}</td>
      </tr>`
    }).join("")
    const totVal = list.reduce((s, c) => s + (c.totalValue || 0), 0)
    const totPaid = list.reduce((s, c) => s + (c.paidAmount || 0), 0)
    const totBal = list.reduce((s, c) => s + (c.balance || 0), 0)
    const w = window.open("", "_blank")!
    w.document.write(`<html><head><title>All Commissions</title>
<style>${reportCSS}</style></head><body>
${buildPrintHeader(shop)}
<div class="doc-header">
  <div>
    <div class="doc-title">Commission Transactions</div>
    <div class="doc-sub">Printed on ${new Date().toLocaleDateString("en-PK")} &nbsp;|&nbsp; ${list.length} entries</div>
  </div>
  <div class="doc-meta"><div>${new Date().toLocaleString("en-PK")}</div></div>
</div>
<div class="body-pad">
<table>
  <thead><tr>
    <th>#</th><th>Seller</th><th>Buyer</th><th>Commodity</th>
    <th style="text-align:right">Total Value</th>
    <th style="text-align:right">Paid</th>
    <th style="text-align:right">Balance</th>
    <th>Status</th><th>Date</th>
  </tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr>
    <td colspan="4" style="text-align:right">Totals</td>
    <td style="text-align:right">PKR ${totVal.toLocaleString()}</td>
    <td style="text-align:right;color:#15803d">PKR ${totPaid.toLocaleString()}</td>
    <td style="text-align:right">PKR ${totBal.toLocaleString()}</td>
    <td colspan="2"></td>
  </tr></tfoot>
</table>
</div>
</body></html>`)
    w.print()
  }

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
          <h2 className="text-2xl font-bold text-gray-900">Commission</h2>
          <p className="text-gray-500 text-sm">{commissions.length} total transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => printAllCommissions(filtered)}>
            <Printer className="w-4 h-4" /> Print All
          </Button>
          <Button onClick={() => { resetNewForm(); setShowNew(true) }}>
            <Plus className="w-4 h-4" /> New Commission
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Total Commission Earned</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCommEarned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Pending from Customers</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalPending)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search by customer, seller, commodity..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                    {["#", "Seller", "Buyer", "Commodity", "Total Value", "Comm %", "Commission", "Seller Payable", "Paid", "Balance", "Status", "Date", "Action", ""].map((h) => (
                      <th key={h} className="text-left py-3 px-2 text-gray-500 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-3 px-2 font-medium text-gray-800">
                        {c.farmer?.name || c.supplier?.name || c.walkInSeller || <span className="text-gray-400">—</span>}
                        {c.walkInSeller && <span className="ml-1 text-xs text-orange-500">(walk-in)</span>}
                      </td>
                      <td className="py-3 px-2 font-medium text-gray-800">
                        {c.customer?.name || c.walkInCustomer}
                        {c.walkInCustomer && <span className="ml-1 text-xs text-orange-500">(walk-in)</span>}
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {c.commodity || "—"}
                        {c.bags ? <span className="ml-1 text-xs text-gray-400">{c.bags} bags</span> : null}
                        {c.weight ? <span className="ml-1 text-xs text-gray-400">{c.weight} kg</span> : null}
                      </td>
                      <td className="py-3 px-2 text-gray-700">{formatCurrency(c.totalValue)}</td>
                      <td className="py-3 px-2 text-gray-600">{c.commissionRate}%</td>
                      <td className="py-3 px-2 text-green-700 font-medium">{formatCurrency(c.commissionAmount)}</td>
                      <td className="py-3 px-2 text-blue-700">{formatCurrency(c.sellerPayable)}</td>
                      <td className="py-3 px-2 text-green-600">{formatCurrency(c.paidAmount)}</td>
                      <td className="py-3 px-2 text-red-600">{formatCurrency(c.balance)}</td>
                      <td className="py-3 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(c.status)}`}>{c.status}</span>
                      </td>
                      <td className="py-3 px-2 text-gray-500 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                      <td className="py-3 px-2">
                        {c.status !== "PAID" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                            setPayTarget(c); setPayAmount(String(c.balance)); setPayMethod("CASH"); setPayNotes("")
                          }}>
                            <CreditCard className="w-3 h-3 mr-1" /> Pay
                          </Button>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1 flex-nowrap">
                          <button onClick={() => printForSeller(c)} className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 whitespace-nowrap">
                            <Printer className="w-3 h-3" /> Seller
                          </button>
                          <button onClick={() => printForBuyer(c)} className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 whitespace-nowrap">
                            <Printer className="w-3 h-3" /> Buyer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={14} className="text-center py-8 text-gray-400">No commissions found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Commission Modal */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" /> New Commission Transaction
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* Seller */}
            <div>
              <Label>Seller (Farmer / Supplier) <span className="text-gray-400 font-normal">— optional</span></Label>
              <SearchableSelect
                value={partyId}
                onValueChange={(v) => { setPartyId(v); if (v !== "walkin") setWalkInSeller("") }}
                placeholder="Select seller or walk-in..."
                options={sellerOptions}
              />
              {partyId === "walkin" && (
                <Input
                  className="mt-2"
                  placeholder="Enter seller name..."
                  value={walkInSeller}
                  onChange={(e) => setWalkInSeller(e.target.value)}
                />
              )}
            </div>

            {/* Buyer */}
            <div>
              <Label>Buyer (Customer) <span className="text-red-500">*</span></Label>
              <SearchableSelect
                value={customerId}
                onValueChange={(v) => { setCustomerId(v); if (v !== "walkin") setWalkInCustomer("") }}
                placeholder="Select customer or walk-in..."
                options={customerOptions}
              />
              {customerId === "walkin" && (
                <Input
                  className="mt-2"
                  placeholder="Enter buyer name..."
                  value={walkInCustomer}
                  onChange={(e) => setWalkInCustomer(e.target.value)}
                />
              )}
            </div>

            {/* Commodity */}
            <div>
              <Label>Commodity / Product Name</Label>
              <Input
                placeholder="e.g. Wheat, Rice, Cotton, Sugar..."
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
              />
            </div>

            {/* Bags / Weight / Rate */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Bags</Label>
                <Input type="number" placeholder="0" value={bags} onChange={(e) => setBags(e.target.value)} />
              </div>
              <div>
                <Label>Weight (KG)</Label>
                <Input type="number" placeholder="0" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
              <div>
                <Label>Rate (per KG)</Label>
                <Input type="number" placeholder="0" value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
            </div>

            {/* Total + Commission % */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Value <span className="text-red-500">*</span></Label>
                <Input type="number" placeholder="0" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Auto-filled from weight × rate</p>
              </div>
              <div>
                <Label>Commission %</Label>
                <Input type="number" placeholder="2.5" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} />
              </div>
            </div>

            {/* Summary box */}
            <div className="bg-green-50 rounded-lg p-3 space-y-1.5 text-sm border border-green-100">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Value (buyer owes):</span>
                <span className="font-medium">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Your Commission ({commissionRate}%):</span>
                <span className="font-bold">{formatCurrency(commAmount)}</span>
              </div>
              <div className="flex justify-between text-blue-700 border-t border-green-200 pt-1.5">
                <span>Seller Payable (owed to them):</span>
                <span className="font-semibold">{formatCurrency(sellerPayable)}</span>
              </div>
            </div>

            {/* Initial payment */}
            <div className="flex items-center gap-3">
              <Label className="whitespace-nowrap">Initial Payment:</Label>
              <Input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="max-w-[150px]" />
              <span className="text-sm text-gray-500">Balance: {formatCurrency(balance)}</span>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowNew(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "Saving..." : "Create Commission"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={!!payTarget} onOpenChange={(o) => { if (!o) setPayTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {payTarget && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Buyer:</span>
                  <span className="font-medium">{payTarget.customer?.name || payTarget.walkInCustomer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Outstanding:</span>
                  <span className="font-bold text-red-600">{formatCurrency(payTarget.balance)}</span>
                </div>
              </div>
              <div>
                <Label>Amount</Label>
                <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </div>
              <div>
                <Label>Method</Label>
                <SearchableSelect
                  value={payMethod}
                  onValueChange={setPayMethod}
                  options={[
                    { value: "CASH", label: "Cash" },
                    { value: "BANK_TRANSFER", label: "Bank Transfer" },
                    { value: "CHEQUE", label: "Cheque" },
                  ]}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Optional..." />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setPayTarget(null)} className="flex-1">Cancel</Button>
                <Button onClick={handlePay} disabled={paying} className="flex-1">
                  {paying ? "Saving..." : "Record Payment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
