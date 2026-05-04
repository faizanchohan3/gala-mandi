import { db } from "@/lib/db"
import { auth } from "@/auth"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, ShoppingCart, Package, Users, CheckSquare, Sprout, AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { RecentSales } from "@/components/dashboard/recent-sales"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { TasksSummary } from "@/components/dashboard/tasks-summary"
import { StatsSlider } from "@/components/dashboard/stats-slider"
import Link from "next/link"

async function getDashboardData() {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [todaySales, monthSales, totalProducts, pendingTasks, totalCustomers, recentSales, expiredPesticides, criticalStockProducts] =
    await Promise.all([
      db.sale.aggregate({
        where: { createdAt: { gte: startOfDay }, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      db.sale.aggregate({
        where: { createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      db.product.count({ where: { isActive: true } }),
      db.task.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] } } }),
      db.customer.count({ where: { isActive: true } }),
      db.sale.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { customer: true, createdBy: { select: { name: true } } },
      }),
      db.pesticide.count({
        where: {
          expiryDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          isActive: true,
        },
      }),
      db.product.findMany({
        where: { isActive: true, currentStock: { lte: 2 } },
        select: { name: true, currentStock: true, unit: true },
        orderBy: { currentStock: "asc" },
      }),
    ])

  return {
    todaySales: todaySales._sum.totalAmount || 0,
    monthSales: monthSales._sum.totalAmount || 0,
    totalProducts,
    pendingTasks,
    totalCustomers,
    recentSales,
    expiredPesticides,
    criticalStockProducts,
  }
}

export default async function DashboardPage() {
  const session = await auth()
  const data = await getDashboardData()

  const stats = [
    { title: "Today's Sales", value: formatCurrency(data.todaySales), icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50", href: "/sales" },
    { title: "Month Sales", value: formatCurrency(data.monthSales), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", href: "/sales" },
    { title: "Total Products", value: data.totalProducts.toString(), icon: Package, color: "text-purple-600", bg: "bg-purple-50", href: "/inventory" },
    { title: "Total Customers", value: data.totalCustomers.toString(), icon: Users, color: "text-orange-600", bg: "bg-orange-50", href: "/customers" },
    { title: "Pending Tasks", value: data.pendingTasks.toString(), icon: CheckSquare, color: "text-yellow-600", bg: "bg-yellow-50", href: "/tasks" },
    {
      title: "Pesticide Alerts",
      value: data.expiredPesticides.toString(),
      icon: Sprout,
      color: data.expiredPesticides > 0 ? "text-red-600" : "text-teal-600",
      bg: data.expiredPesticides > 0 ? "bg-red-50" : "bg-teal-50",
      href: "/pesticides",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {session?.user?.name?.split(" ")[0]}
        </h2>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s what&apos;s happening at your shop today.</p>
      </div>

      {/* Critical Stock Alert */}
      {data.criticalStockProducts.length > 0 && (
        <Link href="/inventory">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 hover:bg-red-100 transition-colors cursor-pointer">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-semibold text-sm">
                Critical Stock Alert — {data.criticalStockProducts.length} product{data.criticalStockProducts.length > 1 ? "s" : ""} almost out of stock!
              </p>
              <p className="text-red-600 text-xs mt-0.5">
                {data.criticalStockProducts.map((p) => `${p.name} (${p.currentStock} ${p.unit})`).join(" · ")}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Stats Slider */}
      <StatsSlider
        todaySales={data.todaySales}
        monthSales={data.monthSales}
        totalProducts={data.totalProducts}
        pendingTasks={data.pendingTasks}
        totalCustomers={data.totalCustomers}
        expiredPesticides={data.expiredPesticides}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-gray-300">
              <CardContent className="p-4">
                <div className={`inline-flex p-2 rounded-lg ${stat.bg} mb-3`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.title}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart />
        </div>
        <div>
          <TasksSummary />
        </div>
      </div>

      <RecentSales sales={data.recentSales} />
    </div>
  )
}
