import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { amount, method, notes, direction } = await req.json()

  if (!amount || parseFloat(amount) <= 0)
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })

  const amt = parseFloat(amount)
  const dir = direction === "PAY" ? "PAY" : "RECEIVE"

  await db.$transaction(async (tx) => {
    await tx.customerPayment.create({
      data: {
        customerId: id,
        amount: amt,
        direction: dir,
        method: method || "CASH",
        notes: notes || null,
      },
    })

    // RECEIVE = customer pays us → balance decreases (they owe us less)
    // PAY     = we pay customer (advance) → balance increases (they owe us more)
    await tx.customer.update({
      where: { id },
      data: { balance: dir === "PAY" ? { increment: amt } : { decrement: amt } },
    })
  })

  await createAuditLog({
    userId: session.user.id,
    action: "CREATE",
    module: "CUSTOMERS",
    details: `${dir === "PAY" ? "Paid to" : "Received from"} customer PKR ${amt} — ID: ${id}`,
  })

  return NextResponse.json({ success: true })
}
