import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const farmer = await db.farmer.findUnique({
    where: { id },
    include: {
      purchases: {
        orderBy: { createdAt: "desc" },
        include: {
          items: { include: { product: { select: { name: true, unit: true } } } },
          payments: { orderBy: { createdAt: "asc" } },
        },
      },
      payments: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!farmer) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Build ledger
  const events: any[] = []
  for (const purchase of farmer.purchases) {
    events.push({
      date: purchase.createdAt,
      type: "PURCHASE",
      description: `Purchase — ${purchase.commodity || purchase.items.map((i) => i.product.name).join(", ")}`,
      debit: purchase.totalAmount,
      credit: 0,
      ref: purchase.id,
    })
    for (const payment of purchase.payments) {
      events.push({
        date: payment.createdAt,
        type: "PAYMENT",
        description: `Payment — ${payment.method}`,
        debit: 0,
        credit: payment.amount,
        ref: payment.id,
      })
    }
  }
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let running = 0
  const ledger = events.map((e) => {
    running += e.debit - e.credit
    return { ...e, balance: running }
  })

  return NextResponse.json({ farmer, ledger })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const farmer = await db.farmer.update({
    where: { id },
    data: {
      name: body.name,
      phone: body.phone || null,
      address: body.address || null,
      village: body.village || null,
      cnic: body.cnic || null,
      creditLimit: body.creditLimit || 0,
    },
  })
  return NextResponse.json({ farmer })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  await db.farmer.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
