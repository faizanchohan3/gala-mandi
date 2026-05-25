import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { amount, method, notes, bankId, direction } = await req.json()

  if (!amount || parseFloat(amount) <= 0)
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })

  const amt = parseFloat(amount)
  const dir = direction === "RECEIVE" ? "RECEIVE" : "PAY"

  await db.$transaction(async (tx) => {
    await tx.supplierPayment.create({
      data: {
        supplierId: id,
        amount: amt,
        direction: dir,
        method: method || "CASH",
        notes: notes || null,
      },
    })

    // PAY = we pay supplier → balance decreases (we owe less)
    // RECEIVE = supplier pays us → balance increases (they owe us / gave advance)
    await tx.supplier.update({
      where: { id },
      data: { balance: dir === "PAY" ? { decrement: amt } : { increment: amt } },
    })
  })

  await createAuditLog({
    userId: session.user.id,
    action: "CREATE",
    module: "SUPPLIERS",
    details: `${dir === "PAY" ? "Paid to" : "Received from"} supplier PKR ${amt} — ID: ${id}`,
  })

  return NextResponse.json({ success: true })
}
