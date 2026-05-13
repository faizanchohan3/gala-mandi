import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sales = await db.pesticideSale.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      pesticide: true,
      customer: { select: { id: true, name: true, phone: true } },
      soldBy: { select: { name: true } },
    },
  })

  return NextResponse.json({ sales })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { pesticideId, quantity, unitPrice, customerId, customerName, paidAmount, notes } = await req.json()
  const totalAmount = quantity * unitPrice
  const paid = paidAmount || 0
  const balance = totalAmount - paid

  const sale = await db.$transaction(async (tx) => {
    const s = await tx.pesticideSale.create({
      data: {
        shopId: session.user.shopId || null,
        pesticideId,
        customerId: customerId || null,
        quantity,
        unitPrice,
        totalAmount,
        customerName: customerName || null,
        paidAmount: paid,
        balance,
        soldById: session.user.id,
        notes: notes || null,
      },
      include: {
        pesticide: true,
        customer: { select: { id: true, name: true, phone: true } },
        soldBy: { select: { name: true } },
      },
    })

    await tx.pesticide.update({
      where: { id: pesticideId },
      data: { quantity: { decrement: quantity } },
    })

    // Update customer balance if linked to a registered customer with outstanding balance
    if (customerId && balance > 0) {
      await tx.customer.update({
        where: { id: customerId },
        data: { balance: { increment: balance } },
      })
    }

    return s
  })

  await createAuditLog({
    userId: session.user.id,
    action: "CREATE",
    module: "PESTICIDES",
    details: `Sold pesticide, amount: PKR ${totalAmount}${customerId ? ` to customer ${customerId}` : ""}`,
  })

  return NextResponse.json({ sale }, { status: 201 })
}
