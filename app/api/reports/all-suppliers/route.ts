import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const shopFilter = session.user.shopId ? { shopId: session.user.shopId } : {}

  const [suppliers, purchaseTotals, commissionTotals, paymentTotals] = await Promise.all([
    db.supplier.findMany({
      where: { ...shopFilter, isActive: true },
      orderBy: { name: "asc" },
    }),
    db.purchase.groupBy({
      by: ["supplierId"],
      _sum: { totalAmount: true },
      where: { supplierId: { not: null }, ...shopFilter },
    }),
    db.commission.groupBy({
      by: ["supplierId"],
      _sum: { sellerPayable: true },
      where: { supplierId: { not: null }, ...shopFilter },
    }),
    db.supplierPayment.groupBy({
      by: ["supplierId"],
      _sum: { amount: true },
      where: { direction: "PAY", ...shopFilter },
    }),
  ])

  const ptMap = Object.fromEntries(purchaseTotals.map((r) => [r.supplierId!, r._sum.totalAmount || 0]))
  const cmMap = Object.fromEntries(commissionTotals.map((r) => [r.supplierId!, r._sum.sellerPayable || 0]))
  const pymtMap = Object.fromEntries(paymentTotals.map((r) => [r.supplierId, r._sum.amount || 0]))

  const result = suppliers.map((s) => {
    const totalDebit = (ptMap[s.id] || 0) + (cmMap[s.id] || 0)
    const totalCredit = pymtMap[s.id] || 0
    return { ...s, totalDebit, totalCredit }
  })

  return NextResponse.json({ suppliers: result })
}
