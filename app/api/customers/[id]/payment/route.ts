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
  // RECEIVE = customer pays us (reduces their balance)
  // PAY     = we pay customer (also reduces their balance / creates credit)
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

    await tx.customer.update({
      where: { id },
      data: { balance: { decrement: amt } },
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
