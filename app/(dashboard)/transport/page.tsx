"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, Truck, Printer, Search, Package } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  IN_TRANSIT: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
}

export default function TransportPage() {
  const [slips, setSlips] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [tab, setTab] = useState<"slips" | "vehicles">("slips")
  const [showSlipModal, setShowSlipModal] = useState(false)
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [showDispatchModal, setShowDispatchModal] = useState<any>(null)
  const [form, setForm] = useState({ vehicleId: "", customerId: "", fromLocation: "", toLocation: "", commodity: "", bags: "", weight: "", freight: "", notes: "" })
  const [vForm, setVForm] = useState({ vehicleNo: "", vehicleType: "Truck", driverName: "", driverPhone: "" })
  const [dispForm, setDispForm] = useState({ items: "", totalWeight: "", totalBags: "", receivedBy: "" })

  async function loadData() {
    setLoading(true)
    try {
      const [sr, vr, cr] = await Promise.allSettled([
        fetch("/api/freight").then((r) => r.json()),
        fetch("/api/vehicles").then((r) => r.json()),
        fetch("/api/customers").then((r) => r.json()),
      ])
      if (sr.status === "fulfilled") setSlips(sr.value.slips || [])
      if (vr.status === "fulfilled") setVehicles(vr.value.vehicles || [])
      if (cr.status === "fulfilled") setCustomers(cr.value.customers || [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadData() }, [])

  async function handleCreateSlip() {
    if (!form.fromLocation || !form.toLocation) return alert("From & To locations required")
    try {
      const res = await fetch("/api/freight", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bags: form.bags ? parseInt(form.bags) : null,
          weight: form.weight ? parseFloat(form.weight) : null,
          freight: parseFloat(form.freight) || 0,
          vehicleId: form.vehicleId || null,
          customerId: form.customerId || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        return alert(d?.error || "Failed to create freight slip")
      }
      setShowSlipModal(false); loadData()
    } catch {
      alert("Network error. Please try again.")
    }
  }

  async function handleDispatch(slipId: string) {
    try {
      const res = await fetch(`/api/freight/${slipId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "IN_TRANSIT",
          items: dispForm.items,
          totalWeight: dispForm.totalWeight ? parseFloat(dispForm.totalWeight) : null,
          totalBags: dispForm.totalBags ? parseInt(dispForm.totalBags) : null,
          receivedBy: dispForm.receivedBy,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        return alert(d?.error || "Failed to dispatch")
      }
      setShowDispatchModal(null); loadData()
    } catch {
      alert("Network error. Please try again.")
    }
  }

  async function handleDeliver(slipId: string) {
    try {
      const res = await fetch(`/api/freight/${slipId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED" }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        return alert(d?.error || "Failed to mark as delivered")
      }
      loadData()
    } catch {
      alert("Network error. Please try again.")
    }
  }

  async function handleSaveVehicle() {
    if (!vForm.vehicleNo.trim()) return alert("Vehicle number required")
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vForm),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        return alert(d?.error || "Failed to add vehicle")
      }
      setShowVehicleModal(false); loadData()
    } catch {
      alert("Network error. Please try again.")
    }
  }

  const filtered = slips.filter((s) => {
    const matchSearch = !search ||
      (s.vehicle?.vehicleNo || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.commodity || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.customer?.name || "").toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || s.status === filterStatus
    return matchSearch && matchStatus
  })

  const printChallan = (slip: any) => {
    const challan = slip.deliveryChallan
    const w = window.open("", "_blank")!
    w.document.write(`<html><head><title>Delivery Challan — ${challan?.challanNo || slip.slipNo}</title>
<style>body{font-family:Arial;padding:20px;} h1{font-size:18px} table{width:100%;border-collapse:collapse;} td,th{border:1px solid #ccc;padding:8px;}</style></head><body>
<h1>Delivery Challan</h1>
<p><strong>Challan No:</strong> ${challan?.challanNo || "—"} &nbsp; <strong>Date:</strong> ${new Date().toLocaleDateString("en-PK")}</p>
<p><strong>Vehicle:</strong> ${slip.vehicle?.vehicleNo || slip.vehicleNo || "—"} &nbsp; <strong>Driver:</strong> ${slip.vehicle?.driverName || "—"}</p>
<p><strong>From:</strong> ${slip.fromLocation || "—"} &nbsp; <strong>To:</strong> ${slip.toLocation || "—"}</p>
<p><strong>Customer:</strong> ${slip.customer?.name || "—"} &nbsp; <strong>Commodity:</strong> ${slip.commodity || "—"}</p>
<p><strong>Bags:</strong> ${challan?.totalBags || slip.bags || "—"} &nbsp; <strong>Weight:</strong> ${challan?.totalWeight || slip.weight || "—"} KG</p>
<br/><p>Received By: _____________________________ &nbsp; Signature: _____________________________</p>
</body></html>`)
    w.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transport & Freight Management</h2>
          <p className="text-gray-500 text-sm">Manage vehicles, freight slips & delivery challans</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowVehicleModal(true)} className="gap-2">
            <Truck className="w-4 h-4" /> Add Vehicle
          </Button>
          <Button onClick={() => { setForm({ vehicleId: "", customerId: "", fromLocation: "", toLocation: "", commodity: "", bags: "", weight: "", freight: "", notes: "" }); setShowSlipModal(true) }}
            className="bg-teal-700 hover:bg-teal-800 gap-2">
            <Plus className="w-4 h-4" /> New Freight Slip
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Slips", value: slips.length, color: "text-gray-900" },
          { label: "Pending", value: slips.filter((s) => s.status === "PENDING").length, color: "text-yellow-600" },
          { label: "In Transit", value: slips.filter((s) => s.status === "IN_TRANSIT").length, color: "text-blue-600" },
          { label: "Delivered", value: slips.filter((s) => s.status === "DELIVERED").length, color: "text-green-700" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["slips", "vehicles"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 px-4 text-sm font-medium capitalize transition-colors border-b-2 ${tab === t ? "border-teal-700 text-teal-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "slips" ? `Freight Slips (${slips.length})` : `Vehicles (${vehicles.length})`}
          </button>
        ))}
      </div>

      {/* Freight Slips */}
      {tab === "slips" && (
        <>
          <div className="flex gap-3">
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search vehicle, customer, commodity..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Slip #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vehicle</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Route</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Commodity</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Bags</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Freight</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
                    ) : filtered.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.slipNo}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{s.vehicle?.vehicleNo || "—"}</p>
                          <p className="text-xs text-gray-500">{s.vehicle?.driverName}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{s.customer?.name || "—"}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{s.fromLocation} → {s.toLocation}</td>
                        <td className="px-4 py-3 text-gray-700">{s.commodity || "—"}</td>
                        <td className="px-4 py-3 text-center text-gray-700">{s.bags || "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-teal-700">{formatCurrency(s.freight)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] || "bg-gray-100 text-gray-600"}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {s.status === "PENDING" && (
                              <button onClick={() => { setShowDispatchModal(s); setDispForm({ items: s.commodity || "", totalWeight: s.weight ? String(s.weight) : "", totalBags: s.bags ? String(s.bags) : "", receivedBy: "" }) }}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Dispatch</button>
                            )}
                            {s.status === "IN_TRANSIT" && (
                              <button onClick={() => handleDeliver(s.id)}
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Delivered</button>
                            )}
                            {s.deliveryChallan && (
                              <button onClick={() => printChallan(s)} className="p-1 text-gray-400 hover:text-teal-600">
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!loading && filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No freight slips found</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Vehicles Tab */}
      {tab === "vehicles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <Card key={v.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-5 h-5 text-teal-700" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{v.vehicleNo}</p>
                    <p className="text-xs text-gray-500">{v.vehicleType}</p>
                    <p className="text-sm text-gray-700 mt-1">{v.driverName || "No driver assigned"}</p>
                    {v.driverPhone && <p className="text-xs text-gray-500">{v.driverPhone}</p>}
                    <p className="text-xs text-gray-400 mt-2">{v._count?.freightSlips || 0} trips</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {vehicles.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-400">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No vehicles yet. Add your first vehicle.</p>
            </div>
          )}
        </div>
      )}

      {/* New Freight Slip Modal */}
      <Dialog open={showSlipModal} onOpenChange={setShowSlipModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Freight Slip</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vehicle</Label>
                <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.vehicleNo} — {v.vehicleType}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Customer</Label>
                <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>From *</Label>
                <Input value={form.fromLocation} onChange={(e) => setForm({ ...form, fromLocation: e.target.value })} placeholder="Origin" /></div>
              <div><Label>To *</Label>
                <Input value={form.toLocation} onChange={(e) => setForm({ ...form, toLocation: e.target.value })} placeholder="Destination" /></div>
            </div>
            <div><Label>Commodity</Label>
              <Input value={form.commodity} onChange={(e) => setForm({ ...form, commodity: e.target.value })} placeholder="e.g. Wheat, Rice..." /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Bags</Label>
                <Input type="number" value={form.bags} onChange={(e) => setForm({ ...form, bags: e.target.value })} /></div>
              <div><Label>Weight (KG)</Label>
                <Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
              <div><Label>Freight (PKR)</Label>
                <Input type="number" value={form.freight} onChange={(e) => setForm({ ...form, freight: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowSlipModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleCreateSlip} className="flex-1 bg-teal-700 hover:bg-teal-800">Create Slip</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dispatch Modal */}
      <Dialog open={!!showDispatchModal} onOpenChange={() => setShowDispatchModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Dispatch & Create Delivery Challan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Items / Description *</Label>
              <Input value={dispForm.items} onChange={(e) => setDispForm({ ...dispForm, items: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Total Bags</Label>
                <Input type="number" value={dispForm.totalBags} onChange={(e) => setDispForm({ ...dispForm, totalBags: e.target.value })} /></div>
              <div><Label>Total Weight (KG)</Label>
                <Input type="number" value={dispForm.totalWeight} onChange={(e) => setDispForm({ ...dispForm, totalWeight: e.target.value })} /></div>
            </div>
            <div><Label>Received By</Label>
              <Input value={dispForm.receivedBy} onChange={(e) => setDispForm({ ...dispForm, receivedBy: e.target.value })} /></div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowDispatchModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={() => handleDispatch(showDispatchModal.id)} className="flex-1">Dispatch & Create Challan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Vehicle Modal */}
      <Dialog open={showVehicleModal} onOpenChange={setShowVehicleModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Vehicle Number *</Label>
              <Input value={vForm.vehicleNo} onChange={(e) => setVForm({ ...vForm, vehicleNo: e.target.value })} placeholder="e.g. LHR-1234" autoFocus /></div>
            <div><Label>Vehicle Type</Label>
              <Select value={vForm.vehicleType} onValueChange={(v) => setVForm({ ...vForm, vehicleType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Truck", "Pickup", "Trailer", "Rickshaw", "Van", "Container"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Driver Name</Label>
                <Input value={vForm.driverName} onChange={(e) => setVForm({ ...vForm, driverName: e.target.value })} /></div>
              <div><Label>Driver Phone</Label>
                <Input value={vForm.driverPhone} onChange={(e) => setVForm({ ...vForm, driverPhone: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowVehicleModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSaveVehicle} className="flex-1">Add Vehicle</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
