import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const skip = (page - 1) * limit

  const shopFilter = session.user.shopId ? { shopId: session.user.shopId } : {}
  const [transactions, total, summary] = await Promise.all([
    db.transaction.findMany({
      skip,
      take: limit,
      where: shopFilter,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    }),
    db.transaction.count({ where: shopFilter }),
    db.transaction.groupBy({
      by: ["type"],
      where: shopFilter,
      _sum: { amount: true },
    }),
  ])

  const income = summary.find((s) => s.type === "CREDIT")?._sum.amount || 0
  const expense = summary.find((s) => s.type === "DEBIT")?._sum.amount || 0

  return NextResponse.json({ transactions, total, income, expense, balance: income - expense })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { type, amount, description, reference, category } = await req.json()

  const transaction = await db.transaction.create({
    data: { shopId: session.user.shopId || null, type, amount, description, reference, category, createdById: session.user.id },
  })

  await createAuditLog({ userId: session.user.id, action: "CREATE", module: "FINANCE", details: `${type}: PKR ${amount} - ${description}` })

  return NextResponse.json({ transaction }, { status: 201 })
}
