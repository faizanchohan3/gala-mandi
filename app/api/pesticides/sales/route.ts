import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sales = await db.pesticideSale.findMany({
    orderBy: { createdAt: "desc" },
    include: { pesticide: true, soldBy: { select: { name: true } } },
  })

  return NextResponse.json({ sales })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { pesticideId, quantity, unitPrice, customerName, paidAmount, notes } = await req.json()
  const totalAmount = quantity * unitPrice

  const sale = await db.$transaction(async (tx) => {
    const s = await tx.pesticideSale.create({
      data: {
        pesticideId, quantity, unitPrice, totalAmount,
        customerName, paidAmount: paidAmount || 0,
        soldById: session.user.id, notes,
      },
    })

    await tx.pesticide.update({
      where: { id: pesticideId },
      data: { quantity: { decrement: quantity } },
    })

    return s
  })

  await createAuditLog({ userId: session.user.id, action: "CREATE", module: "PESTICIDES", details: `Sold pesticide, amount: PKR ${totalAmount}` })

  return NextResponse.json({ sale }, { status: 201 })
}
