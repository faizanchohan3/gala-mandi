import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const shopFilter = session.user.shopId ? { shopId: session.user.shopId } : {}

  const [customers, saleTotals, commissionTotals, pesticideSaleTotals, paymentTotals] = await Promise.all([
    db.customer.findMany({
      where: { ...shopFilter, isActive: true },
      orderBy: { name: "asc" },
    }),
    db.sale.groupBy({
      by: ["customerId"],
      _sum: { totalAmount: true },
      where: { customerId: { not: null }, ...shopFilter },
    }),
    db.commission.groupBy({
      by: ["customerId"],
      _sum: { totalValue: true },
      where: { customerId: { not: null }, ...shopFilter },
    }),
    db.pesticideSale.groupBy({
      by: ["customerId"],
      _sum: { totalAmount: true },
      where: { customerId: { not: null }, ...shopFilter },
    }),
    db.customerPayment.groupBy({
      by: ["customerId"],
      _sum: { amount: true },
      where: { direction: "RECEIVE", ...shopFilter },
    }),
  ])

  const saleMap = Object.fromEntries(saleTotals.map((r) => [r.customerId!, r._sum.totalAmount || 0]))
  const commMap = Object.fromEntries(commissionTotals.map((r) => [r.customerId!, r._sum.totalValue || 0]))
  const pestMap = Object.fromEntries(pesticideSaleTotals.map((r) => [r.customerId!, r._sum.totalAmount || 0]))
  const pymtMap = Object.fromEntries(paymentTotals.map((r) => [r.customerId, r._sum.amount || 0]))

  const result = customers.map((c) => {
    const totalDebit = (saleMap[c.id] || 0) + (commMap[c.id] || 0) + (pestMap[c.id] || 0)
    const totalCredit = pymtMap[c.id] || 0
    return { ...c, totalDebit, totalCredit }
  })

  return NextResponse.json({ customers: result })
}
