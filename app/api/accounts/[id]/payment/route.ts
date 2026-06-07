import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { amount, description } = await req.json()

  if (!amount || parseFloat(amount) <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
  }

  const amt = parseFloat(amount)

  try {
    const account = await db.account.findUnique({ where: { id } })
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 })

    // Record the payment as a CREDIT entry (reduces liability)
    await db.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          accountId: id,
          type: "CREDIT",
          amount: amt,
          description: description || "Payment recorded",
          reference: `Payment on ${new Date().toLocaleDateString()}`,
          createdById: session.user.id,
        },
      })

      // Update account balance (credit reduces liability)
      await tx.account.update({
        where: { id },
        data: { balance: { decrement: amt } },
      })
    })

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      module: "ACCOUNTS",
      details: `Payment of PKR ${amt} recorded against account: ${account.name}`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Payment recording error:", error)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
