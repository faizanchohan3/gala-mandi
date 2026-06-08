import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    const transaction = await db.transaction.findUnique({ where: { id } })
    if (!transaction) return NextResponse.json({ error: "Transaction not found" }, { status: 404 })

    // Delete the transaction
    await db.transaction.delete({ where: { id } })

    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      module: "FINANCE",
      details: `Deleted transaction: ${transaction.description} - PKR ${transaction.amount}`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete transaction error:", error)
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 })
  }
}
