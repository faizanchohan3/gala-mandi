"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"
import { Printer, Package, AlertTriangle, Search, TrendingUp } from "lucide-react"

export default function ProductReportPage() {
  const [products, setProducts] = useState<any[]>([])
  const [totals, setTotals] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "low">("all")

  useEffect(() => {
    fetch("/api/reports/products")
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || [])
        setTotals(d.totals || {})
        setLoading(false)
      })
  }, [])

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "all" || (filter === "low" && p.isLowStock)
    return matchSearch && matchFilter
  })

  const today = new Date().toLocaleDateString("en-PK")

  return (
    <div className="space-y-6">
      {/* ── Print Header ── */}
      <div className="hidden print:block">
        <div className="flex items-start justify-between pb-4 mb-4 border-b-2 border-gray-900">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gala Mandi</h1>
            <p className="text-sm text-gray-500">Shop Management System</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Printed: {today}</p>
          </div>
        </div>
        <h2 className="text-xl font-bold mb-1">Product Inventory Report</h2>
        <p className="text-sm text-gray-600 mb-4">
          All active products — stock levels, valuations and sales performance
        </p>

        {/* Print summary strip */}
        <div className="flex gap-8 mb-6 p-3 bg-gray-50 rounded text-sm">
          <span><strong>{totals.totalProducts}</strong> Products</span>
          <span>Stock Value: <strong>{formatCurrency(totals.totalStockValue)}</strong></span>
          <span>Total Sold: <strong>{formatCurrency(totals.totalSaleAmount)}</strong></span>
          <span className="text-red-700">Low Stock: <strong>{totals.lowStockCount}</strong></span>
        </div>
      </div>

      {/* ── Screen Header ── */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Report</h2>
          <p className="text-gray-500 text-sm">Stock levels, valuations & sales performance</p>
        </div>
        <Button onClick={() => window.print()} variant="outline" className="gap-2">
          <Printer className="w-4 h-4" /> Print Report
        </Button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Total Products</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totals.totalProducts ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Stock Value</p>
            <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(totals.totalStockValue || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Total Sold</p>
            <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totals.totalSaleAmount || 0)}</p>
          </CardContent>
        </Card>
        <Card className={totals.lowStockCount > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="p-4">
            <p className={`text-xs uppercase font-medium tracking-wide ${totals.lowStockCount > 0 ? "text-red-600" : "text-gray-500"}`}>
              Low Stock Items
            </p>
            <p className={`text-2xl font-bold mt-1 ${totals.lowStockCount > 0 ? "text-red-600" : "text-gray-900"}`}>
              {totals.lowStockCount ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-3 items-center print:hidden">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search product or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          className={filter === "all" ? "bg-green-700 hover:bg-green-800" : ""}
        >
          All Products
        </Button>
        <Button
          variant={filter === "low" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("low")}
          className={filter === "low" ? "bg-red-600 hover:bg-red-700" : ""}
        >
          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
          Low Stock ({totals.lowStockCount ?? 0})
        </Button>
      </div>

      {/* ── Table ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" />
            Product Inventory
            <span className="text-gray-400 font-normal text-sm">({filtered.length} products)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-t">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Min Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Buy Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Sale Price</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Margin</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Stock Value</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total Sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-400">Loading...</td></tr>
                ) : filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-gray-50 ${p.isLowStock ? "bg-red-50/40" : ""}`}
                  >
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{p.name}</span>
                        {p.isLowStock && (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 text-xs">{p.unit}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${p.isLowStock ? "text-red-600" : "text-gray-900"}`}>
                      {p.currentStock}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{p.minStock}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(p.purchasePrice)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(p.salePrice)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-medium ${p.margin > 20 ? "text-green-700" : p.margin > 0 ? "text-orange-600" : "text-gray-400"}`}>
                        {p.margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-blue-700">{formatCurrency(p.stockValue)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{formatCurrency(p.totalSaleAmount)}</td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-10 text-center text-gray-400">No products found</td></tr>
                )}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={9} className="px-4 py-3 font-bold text-gray-700">
                    Total — {filtered.length} products
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">
                    {formatCurrency(filtered.reduce((s, p) => s + p.stockValue, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">
                    {formatCurrency(filtered.reduce((s, p) => s + p.totalSaleAmount, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
