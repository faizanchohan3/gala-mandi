import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const months = []

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)

    const result = await db.sale.aggregate({
      where: { createdAt: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      _sum: { totalAmount: true },
    })

    months.push({
      month: start.toLocaleDateString("en-PK", { month: "short", year: "2-digit" }),
      sales: result._sum.totalAmount || 0,
    })
  }

  return NextResponse.json({ data: months })
}
