import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { amount, method, notes } = await req.json()

  if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 })

  const unpaidPurchases = await db.purchase.findMany({
    where: { supplierId: id, status: { in: ["PENDING", "PARTIAL"] } },
    orderBy: { createdAt: "asc" },
  })

  let remaining = parseFloat(amount)

  await db.$transaction(async (tx) => {
    for (const purchase of unpaidPurchases) {
      if (remaining <= 0) break
      const apply = Math.min(remaining, purchase.balance)
      const newPaid = purchase.paidAmount + apply
      const newBalance = purchase.balance - apply
      const newStatus = newBalance <= 0 ? "PAID" : "PARTIAL"

      await tx.purchase.update({
        where: { id: purchase.id },
        data: { paidAmount: newPaid, balance: newBalance, status: newStatus },
      })

      await tx.payment.create({
        data: { purchaseId: purchase.id, amount: apply, method: method || "CASH", notes },
      })

      remaining -= apply
    }
  })

  await createAuditLog({
    userId: session.user.id,
    action: "CREATE",
    module: "SUPPLIERS",
    details: `Paid PKR ${amount} to supplier ID: ${id}`,
  })

  return NextResponse.json({ success: true, applied: parseFloat(amount) - remaining })
}
