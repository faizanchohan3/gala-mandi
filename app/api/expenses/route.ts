import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const where: any = { type: "DEBIT" }
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) {
      const toDate = new Date(to)
      toDate.setHours(23, 59, 59, 999)
      where.createdAt.lte = toDate
    }
  }

  const [expenses, summary] = await Promise.all([
    db.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    }),
    db.transaction.groupBy({
      by: ["category"],
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ])

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  return NextResponse.json({ expenses, total, summary })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { amount, description, category, reference } = await req.json()
  if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
  if (!description?.trim()) return NextResponse.json({ error: "Description required" }, { status: 400 })

  const expense = await db.transaction.create({
    data: {
      type: "DEBIT",
      amount: parseFloat(amount),
      description,
      category: category || "General",
      reference: reference || null,
      createdById: session.user.id,
    },
  })

  await createAuditLog({
    userId: session.user.id,
    action: "CREATE",
    module: "EXPENSES",
    details: `Expense: PKR ${amount} — ${description}`,
  })

  return NextResponse.json({ expense }, { status: 201 })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  await db.transaction.delete({ where: { id } })

  await createAuditLog({
    userId: session.user.id,
    action: "DELETE",
    module: "EXPENSES",
    details: `Deleted expense ID: ${id}`,
  })

  return NextResponse.json({ success: true })
}
