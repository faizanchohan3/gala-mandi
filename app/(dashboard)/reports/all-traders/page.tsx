"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { buildPrintHeader, reportCSS } from "@/lib/print-utils"
import { Printer, Search, Users, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function AllTradersReportPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [shop, setShop] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/reports/all-traders").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()).catch(() => ({ shop: null })),
    ]).then(([cd, sd]) => {
      setCustomers(cd.customers || [])
      setShop(sd.shop || null)
      setLoading(false)
    })
  }, [])

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search) ||
      (c.address || "").toLowerCase().includes(search.toLowerCase())
  )

  const totalOutstanding = filtered.filter((c) => c.balance > 0).reduce((s, c) => s + c.balance, 0)
  const totalCredit = filtered.filter((c) => c.balance < 0).reduce((s, c) => s + Math.abs(c.balance), 0)
  const settled = filtered.filter((c) => c.balance === 0).length

  function printReport() {
    const date = new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })
    const rows = filtered.map((c, i) => {
      const bal = c.balance || 0
      const status = bal > 0 ? "Outstanding" : bal < 0 ? "Overpaid" : "Settled"
      const statusColor = bal > 0 ? "#b91c1c" : bal < 0 ? "#15803d" : "#6b7280"
      return `<tr style="${i % 2 === 0 ? "background:#f9fdf9" : ""}">
        <td>${i + 1}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.phone || "—"}</td>
        <td>${c.address || "—"}</td>
        <td style="text-align:right">PKR ${(c.totalDebit || 0).toLocaleString()}</td>
        <td style="text-align:right">PKR ${(c.totalCredit || 0).toLocaleString()}</td>
        <td style="text-align:right;font-weight:700;color:${statusColor}">
          PKR ${Math.abs(bal).toLocaleString()}
        </td>
        <td style="text-align:center">
          <span style="font-size:9px;padding:2px 7px;border-radius:99px;background:${bal > 0 ? "#fee2e2" : bal < 0 ? "#dcfce7" : "#f3f4f6"};color:${statusColor};font-weight:700">
            ${status}
          </span>
        </td>
      </tr>`
    }).join("")

    const w = window.open("", "_blank")!
    w.document.write(`<html><head><title>All Traders Report</title>
<style>${reportCSS}
  body { max-width: 900px; margin: 0 auto; }
</style></head><body>
${buildPrintHeader(shop)}
<div class="doc-header">
  <div><div class="doc-title">All Traders Report</div><div class="doc-sub">Total: ${filtered.length} traders</div></div>
  <div class="doc-meta"><div>Printed: ${date}</div></div>
</div>
<div class="body-pad">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px">
      <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;font-weight:700">Total Outstanding (Udhar)</div>
      <div style="font-size:16px;font-weight:900;color:#b91c1c;margin-top:3px">PKR ${totalOutstanding.toLocaleString()}</div>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px">
      <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;font-weight:700">Overpaid (Credit)</div>
      <div style="font-size:16px;font-weight:900;color:#15803d;margin-top:3px">PKR ${totalCredit.toLocaleString()}</div>
    </div>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px">
      <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;font-weight:700">Settled / Clear</div>
      <div style="font-size:16px;font-weight:900;color:#374151;margin-top:3px">${settled} traders</div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>Name</th><th>Phone</th><th>Address</th>
      <th style="text-align:right">Total Dr</th>
      <th style="text-align:right">Total Cr</th>
      <th style="text-align:right">Balance</th>
      <th style="text-align:center">Status</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="4"><strong>Total: ${filtered.length} traders</strong></td>
      <td style="text-align:right"><strong>PKR ${filtered.reduce((s, c) => s + (c.totalDebit || 0), 0).toLocaleString()}</strong></td>
      <td style="text-align:right"><strong>PKR ${filtered.reduce((s, c) => s + (c.totalCredit || 0), 0).toLocaleString()}</strong></td>
      <td style="text-align:right;color:#b91c1c"><strong>PKR ${totalOutstanding.toLocaleString()}</strong></td>
      <td></td>
    </tr></tfoot>
  </table>
  <div class="sig-row"><span>Generated on ${date}</span><span>${shop?.name || ""}</span></div>
</div>
<script>window.onload=()=>{window.print()}<\/script>
</body></html>`)
    w.document.close()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Traders Report</h2>
          <p className="text-gray-500 text-sm">Balance summary for all registered traders</p>
        </div>
        <Button variant="outline" onClick={printReport} className="gap-2">
          <Printer className="w-4 h-4" /> Print Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium uppercase">Total Traders</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{loading ? "—" : filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-4">
            <p className="text-xs text-red-500 font-medium uppercase">Outstanding (Udhar)</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{loading ? "—" : formatCurrency(totalOutstanding)}</p>
            <p className="text-xs text-red-400 mt-0.5">{filtered.filter((c) => c.balance > 0).length} traders</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="p-4">
            <p className="text-xs text-green-600 font-medium uppercase">Overpaid / Credit</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{loading ? "—" : formatCurrency(totalCredit)}</p>
            <p className="text-xs text-green-500 mt-0.5">{filtered.filter((c) => c.balance < 0).length} traders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-medium uppercase">Settled</p>
            <p className="text-2xl font-bold text-gray-700 mt-1">{loading ? "—" : settled}</p>
            <p className="text-xs text-gray-400 mt-0.5">no balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search by name, phone, address..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-t">
                <tr>
                  {["#", "Name", "Phone", "Address", "Total Dr", "Total Cr", "Balance", "Status", ""].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase ${["Total Dr","Total Cr","Balance"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-gray-400">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No traders found
                    </td>
                  </tr>
                ) : filtered.map((c, i) => {
                  const bal = c.balance || 0
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.phone || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{c.address || "—"}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(c.totalDebit || 0)}</td>
                      <td className="px-4 py-3 text-right text-green-700">{formatCurrency(c.totalCredit || 0)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${bal > 0 ? "text-red-600" : bal < 0 ? "text-green-700" : "text-gray-400"}`}>
                        {formatCurrency(Math.abs(bal))}
                        {bal !== 0 && <span className="text-xs font-normal ml-1">{bal > 0 ? "Dr" : "Cr"}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          bal > 0 ? "bg-red-100 text-red-700"
                          : bal < 0 ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                        }`}>
                          {bal > 0 ? "Outstanding" : bal < 0 ? "Overpaid" : "Settled"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/reports/customer-ledger?id=${c.id}`}
                          className="flex items-center gap-1 text-xs text-orange-700 hover:text-orange-900 font-medium">
                          Ledger <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {!loading && filtered.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 font-bold text-gray-700">{filtered.length} traders</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {formatCurrency(filtered.reduce((s, c) => s + (c.totalDebit || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">
                      {formatCurrency(filtered.reduce((s, c) => s + (c.totalCredit || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">
                      {formatCurrency(totalOutstanding)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
