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
import { Plus, Search, Percent, CreditCard } from "lucide-react"

export default function CommissionPage() {
  const [commissions, setCommissions] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [farmers, setFarmers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  // New commission modal state
  const [showNew, setShowNew] = useState(false)
  const [customerId, setCustomerId] = useState("")
  const [partyId, setPartyId] = useState("")
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

  async function loadData() {
    try {
      setLoading(true)
      const [cm, cu, su, fa] = await Promise.all([
        fetch("/api/commissions").then((r) => r.json()),
        fetch("/api/customers").then((r) => r.json()),
        fetch("/api/suppliers").then((r) => r.json()),
        fetch("/api/farmers").then((r) => r.json()),
      ])
      setCommissions(cm.commissions || [])
      setCustomers(cu.customers || [])
      setSuppliers(su.suppliers || [])
      setFarmers(fa.farmers || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Auto-compute total value from weight × rate
  useEffect(() => {
    const w = parseFloat(weight)
    const r = parseFloat(rate)
    if (w > 0 && r > 0) setTotalValue((w * r).toFixed(2))
  }, [weight, rate])

  const commAmount = totalValue ? parseFloat(((parseFloat(totalValue) * parseFloat(commissionRate || "0")) / 100).toFixed(2)) : 0
  const balance = totalValue ? parseFloat(totalValue) - parseFloat(paidAmount || "0") : 0

  function resetNewForm() {
    setCustomerId(""); setPartyId(""); setCommodity(""); setBags(""); setWeight("")
    setRate(""); setTotalValue(""); setCommissionRate("2.5"); setPaidAmount("0"); setNotes("")
  }

  async function handleSave() {
    if (!customerId) return alert("Please select a buyer (customer)")
    if (!totalValue || parseFloat(totalValue) <= 0) return alert("Total value is required")
    setSaving(true)
    try {
      const isFarmer = partyId.startsWith("farmer_")
      const farmerId = isFarmer ? partyId.replace("farmer_", "") : null
      const supplierId = (!isFarmer && partyId && partyId !== "") ? partyId : null

      const res = await fetch("/api/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, farmerId, supplierId, commodity, bags, weight, rate, totalValue, commissionRate, paidAmount, notes }),
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
    return (
      c.customer?.name?.toLowerCase().includes(q) ||
      c.farmer?.name?.toLowerCase().includes(q) ||
      c.supplier?.name?.toLowerCase().includes(q) ||
      (c.commodity || "").toLowerCase().includes(q)
    )
  })

  const totalCommEarned = commissions.reduce((s, c) => s + c.commissionAmount, 0)
  const totalPending = commissions.filter((c) => c.status !== "PAID").reduce((s, c) => s + c.balance, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Commission</h2>
          <p className="text-gray-500 text-sm">{commissions.length} total transactions</p>
        </div>
        <Button onClick={() => { resetNewForm(); setShowNew(true) }}>
          <Plus className="w-4 h-4" /> New Commission
        </Button>
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
                    {["#", "Seller", "Buyer", "Commodity", "Total Value", "Comm %", "Commission", "Paid", "Balance", "Status", "Date", "Action"].map((h) => (
                      <th key={h} className="text-left py-3 px-2 text-gray-500 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-3 px-2 font-medium text-gray-800">
                        {c.farmer?.name || c.supplier?.name || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-2 font-medium text-gray-800">{c.customer?.name}</td>
                      <td className="py-3 px-2 text-gray-600">
                        {c.commodity || "—"}
                        {c.bags ? <span className="ml-1 text-xs text-gray-400">{c.bags} bags</span> : null}
                        {c.weight ? <span className="ml-1 text-xs text-gray-400">{c.weight} kg</span> : null}
                      </td>
                      <td className="py-3 px-2 text-gray-700">{formatCurrency(c.totalValue)}</td>
                      <td className="py-3 px-2 text-gray-600">{c.commissionRate}%</td>
                      <td className="py-3 px-2 text-green-700 font-medium">{formatCurrency(c.commissionAmount)}</td>
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
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={12} className="text-center py-8 text-gray-400">No commissions found</td></tr>
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
            <div>
              <Label>Seller (Farmer / Supplier) <span className="text-gray-400 font-normal">— optional</span></Label>
              <SearchableSelect
                value={partyId}
                onValueChange={setPartyId}
                placeholder="Select seller..."
                groups={[
                  { label: "Farmers", options: farmers.map((f: any) => ({ value: `farmer_${f.id}`, label: f.name, sub: f.village || f.phone || undefined })) },
                  { label: "Suppliers", options: suppliers.map((s: any) => ({ value: s.id, label: s.name, sub: s.phone || undefined })) },
                ]}
              />
            </div>
            <div>
              <Label>Buyer (Customer) <span className="text-red-500">*</span></Label>
              <SearchableSelect
                value={customerId}
                onValueChange={setCustomerId}
                placeholder="Select customer..."
                options={customers.map((c: any) => ({ value: c.id, label: c.name, sub: c.phone || undefined }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <Label>Commodity</Label>
                <Input placeholder="e.g. Wheat, Rice..." value={commodity} onChange={(e) => setCommodity(e.target.value)} />
              </div>
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
            <div className="bg-green-50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Value:</span>
                <span className="font-medium">{formatCurrency(parseFloat(totalValue || "0"))}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Your Commission ({commissionRate}%):</span>
                <span className="font-bold">{formatCurrency(commAmount)}</span>
              </div>
            </div>
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
                  <span className="font-medium">{payTarget.customer?.name}</span>
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
