import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { amount, method, notes, bankId } = await req.json()

  if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 })

  const [unpaidSales, unpaidPesticideSales] = await Promise.all([
    db.sale.findMany({
      where: { customerId: id, status: { in: ["PENDING", "PARTIAL"] } },
      orderBy: { createdAt: "asc" },
    }),
    db.pesticideSale.findMany({
      where: { customerId: id, balance: { gt: 0 } },
      orderBy: { createdAt: "asc" },
    }),
  ])

  let remaining = parseFloat(amount)

  await db.$transaction(async (tx) => {
    // Apply to regular sales first
    for (const sale of unpaidSales) {
      if (remaining <= 0) break
      const apply = Math.min(remaining, sale.balance)
      const newPaid = sale.paidAmount + apply
      const newBalance = sale.balance - apply
      const newStatus = newBalance <= 0 ? "PAID" : "PARTIAL"

      await tx.sale.update({
        where: { id: sale.id },
        data: { paidAmount: newPaid, balance: newBalance, status: newStatus },
      })
      await tx.payment.create({
        data: { saleId: sale.id, amount: apply, method: method || "CASH", notes, bankId: bankId || null },
      })
      remaining -= apply
    }

    // Apply remaining to pesticide sales
    for (const ps of unpaidPesticideSales) {
      if (remaining <= 0) break
      const apply = Math.min(remaining, ps.balance)
      await tx.pesticideSale.update({
        where: { id: ps.id },
        data: { paidAmount: { increment: apply }, balance: { decrement: apply } },
      })
      remaining -= apply
    }

    // Update customer balance
    if (parseFloat(amount) - remaining > 0) {
      await tx.customer.update({
        where: { id },
        data: { balance: { decrement: parseFloat(amount) - remaining } },
      })
    }
  })

  await createAuditLog({
    userId: session.user.id,
    action: "CREATE",
    module: "CUSTOMERS",
    details: `Received payment PKR ${amount} from customer ID: ${id}`,
  })

  return NextResponse.json({ success: true, applied: parseFloat(amount) - remaining })
}
