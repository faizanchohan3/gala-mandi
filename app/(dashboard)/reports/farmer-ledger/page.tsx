"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Printer, BookOpen, Tractor } from "lucide-react"

export default function FarmerLedgerPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gray-400">Loading...</div>}>
      <FarmerLedgerContent />
    </Suspense>
  )
}

function FarmerLedgerContent() {
  const searchParams = useSearchParams()
  const [farmers, setFarmers] = useState<any[]>([])
  const [farmerId, setFarmerId] = useState("")
  const [ledger, setLedger] = useState<any>(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [loading, setLoading] = useState(false)
  const [shop, setShop] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/farmers").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()).catch(() => ({ shop: null })),
    ]).then(([farmersData, settingsData]) => {
      setFarmers(farmersData.farmers || [])
      setShop(settingsData.shop || null)
      const preselect = searchParams.get("id")
      if (preselect) setFarmerId(preselect)
    })
  }, [])

  useEffect(() => {
    if (farmerId) loadLedger()
  }, [farmerId])

  async function loadLedger() {
    if (!farmerId) return
    setLoading(true)
    const params = new URLSearchParams()
    if (dateFrom) params.set("from", dateFrom)
    if (dateTo) params.set("to", dateTo)
    const data = await fetch(`/api/reports/farmer-ledger/${farmerId}?${params}`).then((r) => r.json())
    setLedger(data)
    setLoading(false)
  }

  const dateLabel =
    dateFrom || dateTo
      ? `${dateFrom ? formatDate(dateFrom) : "Start"} — ${dateTo ? formatDate(dateTo) : "Today"}`
      : "All Time"

  const selectedFarmer = farmers.find((f) => f.id === farmerId)

  return (
    <div className="space-y-6">
      {/* Print Header */}
      <div className="hidden print:block mb-4">
        <style>{`@media print { thead { display: table-header-group; } tfoot { display: table-footer-group; } tr { page-break-inside: avoid; } @page { margin: 12mm; size: A4; } }`}</style>
        <div style={{background:"linear-gradient(135deg,#14532d 0%,#166534 60%,#15803d 100%)",color:"#fff",padding:"16px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            {shop?.logo
              ? <img src={shop.logo} style={{width:"52px",height:"52px",borderRadius:"8px",background:"#fff",padding:"3px",objectFit:"contain"}} alt="" />
              : <div style={{width:"52px",height:"52px",borderRadius:"8px",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"26px",fontWeight:900,border:"2px solid rgba(255,255,255,0.3)"}}>{(shop?.name||"G")[0].toUpperCase()}</div>
            }
            <div>
              <div style={{fontSize:"20px",fontWeight:900,letterSpacing:"-0.5px"}}>{shop?.name||"Gala Mandi"}</div>
              {shop?.ownerName && <div style={{fontSize:"11px",opacity:0.8,marginTop:"2px"}}>{shop.ownerName}</div>}
            </div>
          </div>
          <div style={{textAlign:"right",fontSize:"11px",lineHeight:1.9,opacity:0.9}}>
            {shop?.phone && <div>&#9990;&nbsp;{shop.phone}</div>}
            {shop?.address && <div>&#9679;&nbsp;{shop.address}</div>}
            <div style={{fontSize:"10px",opacity:0.75}}>Generated: {new Date().toLocaleDateString("en-PK")}</div>
          </div>
        </div>
        <div style={{height:"4px",background:"linear-gradient(90deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%)"}}></div>
        <div style={{padding:"10px 22px 8px",background:"#f8fdf8",borderBottom:"1px solid #e5e7eb"}}>
          <h2 style={{margin:0,fontSize:"16px",fontWeight:800,color:"#14532d"}}>Farmer Ledger</h2>
          {ledger?.farmer && (
            <div style={{marginTop:"6px",fontSize:"13px"}}>
              <span style={{fontWeight:700,color:"#111827"}}>{ledger.farmer.name}</span>
              {ledger.farmer.village && <span style={{color:"#6b7280",marginLeft:"8px"}}>Village: {ledger.farmer.village}</span>}
              {ledger.farmer.phone && <span style={{color:"#6b7280",marginLeft:"8px"}}>Ph: {ledger.farmer.phone}</span>}
            </div>
          )}
          <div style={{fontSize:"11px",color:"#6b7280",marginTop:"2px"}}>Period: {dateLabel}</div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Farmer Ledger</h2>
          <p className="text-gray-500 text-sm">Full purchase & payment history per farmer</p>
        </div>
        {ledger && (
          <Button onClick={() => window.print()} variant="outline" className="gap-2">
            <Printer className="w-4 h-4" /> Print Ledger
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Farmer *</label>
              <Select value={farmerId} onValueChange={setFarmerId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select farmer..." />
                </SelectTrigger>
                <SelectContent>
                  {farmers.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}{f.village ? ` — ${f.village}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">From Date</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">To Date</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={loadLedger} disabled={loading || !farmerId} className="bg-green-700 hover:bg-green-800">
              {loading ? "Loading..." : "View Ledger"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!ledger && !loading && (
        <div className="text-center py-20 text-gray-400">
          <Tractor className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Select a farmer to view their ledger</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-20 text-gray-400">Loading ledger...</div>
      )}

      {ledger && !loading && (
        <>
          {/* Farmer Info + Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="md:col-span-2 bg-green-50">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 font-medium uppercase">Farmer</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{ledger.farmer?.name}</p>
                {ledger.farmer?.village && <p className="text-sm text-gray-600">Village: {ledger.farmer.village}</p>}
                {ledger.farmer?.phone && <p className="text-sm text-gray-600">{ledger.farmer.phone}</p>}
                {ledger.farmer?.cnic && <p className="text-xs text-gray-500">CNIC: {ledger.farmer.cnic}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 font-medium uppercase">Total Purchased (Dr)</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(ledger.totalDebit)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 font-medium uppercase">Total Paid (Cr)</p>
                <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(ledger.totalCredit)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Closing Balance Banner */}
          <div
            className={`rounded-lg px-5 py-4 flex items-center justify-between ${
              ledger.closingBalance > 0 ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"
            }`}
          >
            <div>
              <p className="text-sm font-medium text-gray-700">Closing Balance</p>
              <p className="text-xs text-gray-500">{ledger.entries?.length || 0} transactions • {dateLabel}</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${ledger.closingBalance > 0 ? "text-red-700" : "text-green-700"}`}>
                {formatCurrency(Math.abs(ledger.closingBalance))}
              </p>
              <p className={`text-sm font-semibold ${ledger.closingBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                {ledger.closingBalance > 0
                  ? "Payable to Farmer"
                  : ledger.closingBalance < 0
                  ? "Advance Paid"
                  : "Settled"}
              </p>
            </div>
          </div>

          {/* Ledger Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Farmer Account Statement
                <span className="text-gray-400 font-normal text-sm">({ledger.entries?.length || 0} entries)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-t">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">#</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">Description</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Debit (Dr)</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Credit (Cr)</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ledger.entries?.map((entry: any, i: number) => (
                      <tr key={i} className={entry.type === "PAYMENT" ? "bg-green-50/40" : ""}>
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(entry.date)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded ${
                              entry.type === "PAYMENT" ? "bg-green-100 text-green-700"
                              : entry.type === "INCOME" ? "bg-blue-100 text-blue-700"
                              : entry.type === "SALE" ? "bg-purple-100 text-purple-700"
                              : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {entry.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-xs">{entry.description}</td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-green-700">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${entry.balance > 0 ? "text-red-600" : "text-green-700"}`}>
                          {formatCurrency(Math.abs(entry.balance))}
                          {entry.balance !== 0 && (
                            <span className="text-xs ml-1 font-normal">
                              {entry.balance > 0 ? "Dr" : "Cr"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {ledger.entries?.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 font-bold text-gray-700">Closing Balance</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {formatCurrency(ledger.totalDebit)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">
                        {formatCurrency(ledger.totalCredit)}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold text-lg ${ledger.closingBalance > 0 ? "text-red-600" : "text-green-700"}`}>
                        {formatCurrency(Math.abs(ledger.closingBalance))}
                        <span className="text-sm ml-1 font-normal">
                          {ledger.closingBalance > 0 ? "Dr" : "Cr"}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
