import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const shopFilter = session.user.shopId ? { shopId: session.user.shopId } : {}

  const [farmers, farmerPurchaseTotals, productPurchaseTotals, commissionTotals, paymentTotals] = await Promise.all([
    db.farmer.findMany({
      where: { ...shopFilter, isActive: true },
      orderBy: { name: "asc" },
    }),
    db.farmerPurchase.groupBy({
      by: ["farmerId"],
      _sum: { totalAmount: true },
      where: shopFilter,
    }),
    db.purchase.groupBy({
      by: ["farmerId"],
      _sum: { totalAmount: true },
      where: { farmerId: { not: null }, ...shopFilter },
    }),
    db.commission.groupBy({
      by: ["farmerId"],
      _sum: { sellerPayable: true },
      where: { farmerId: { not: null }, ...shopFilter },
    }),
    db.farmerPayment.groupBy({
      by: ["farmerId"],
      _sum: { amount: true },
      where: shopFilter,
    }),
  ])

  const fpMap = Object.fromEntries(farmerPurchaseTotals.map((r) => [r.farmerId, r._sum.totalAmount || 0]))
  const ppMap = Object.fromEntries(productPurchaseTotals.map((r) => [r.farmerId!, r._sum.totalAmount || 0]))
  const cmMap = Object.fromEntries(commissionTotals.map((r) => [r.farmerId!, r._sum.sellerPayable || 0]))
  const pymtMap = Object.fromEntries(paymentTotals.map((r) => [r.farmerId, r._sum.amount || 0]))

  const result = farmers.map((f) => {
    const totalDebit = (fpMap[f.id] || 0) + (ppMap[f.id] || 0) + (cmMap[f.id] || 0)
    const totalCredit = pymtMap[f.id] || 0
    return { ...f, totalDebit, totalCredit }
  })

  return NextResponse.json({ farmers: result })
}
