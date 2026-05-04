import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const dateWhere: any = {}
  if (from || to) {
    dateWhere.createdAt = {}
    if (from) dateWhere.createdAt.gte = new Date(from)
    if (to) {
      const toDate = new Date(to)
      toDate.setHours(23, 59, 59, 999)
      dateWhere.createdAt.lte = toDate
    }
  }

  const supplier = await db.supplier.findUnique({ where: { id } })
  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const purchases = await db.purchase.findMany({
    where: { supplierId: id, ...dateWhere },
    orderBy: { createdAt: "asc" },
    include: {
      items: { include: { product: { select: { name: true, unit: true } } } },
      payments: { orderBy: { createdAt: "asc" } },
    },
  })

  const events: any[] = []

  for (const purchase of purchases) {
    events.push({
      date: purchase.createdAt,
      type: "PURCHASE",
      description: `Purchase #${purchase.id.slice(-6).toUpperCase()} — ${purchase.items.map((i) => `${i.quantity} ${i.product.unit} ${i.product.name}`).join(", ")}`,
      debit: purchase.totalAmount,
      credit: 0,
    })

    if (purchase.payments.length > 0) {
      // Use actual payment records
      for (const payment of purchase.payments) {
        events.push({
          date: payment.createdAt,
          type: "PAYMENT",
          description: `Payment made — ${payment.method}${payment.notes ? ` (${payment.notes})` : ""}`,
          debit: 0,
          credit: payment.amount,
        })
      }
    } else if (purchase.paidAmount > 0) {
      // Fallback: purchase was created with paidAmount but no Payment record exists (legacy data)
      events.push({
        date: purchase.createdAt,
        type: "PAYMENT",
        description: `Payment made — CASH (recorded at purchase)`,
        debit: 0,
        credit: purchase.paidAmount,
      })
    }
  }

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let running = 0
  const entries = events.map((e) => {
    running += e.debit - e.credit
    return { ...e, balance: running }
  })

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0)
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0)

  return NextResponse.json({ supplier, entries, totalDebit, totalCredit, closingBalance: running })
}
