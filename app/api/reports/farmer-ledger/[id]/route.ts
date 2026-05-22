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

  const farmer = await db.farmer.findUnique({ where: { id } })
  if (!farmer) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [farmerPurchases, productPurchases, payments, farmerSales, commissions, pesticideSales] = await Promise.all([
    db.farmerPurchase.findMany({
      where: { farmerId: id, ...dateWhere },
      orderBy: { createdAt: "asc" },
      include: {
        items: { include: { product: { select: { name: true, unit: true } } } },
      },
    }),
    db.purchase.findMany({
      where: { farmerId: id, ...dateWhere },
      orderBy: { createdAt: "asc" },
      include: {
        items: { include: { product: { select: { name: true, unit: true } } } },
        payments: { orderBy: { createdAt: "asc" } },
      },
    }),
    db.farmerPayment.findMany({
      where: { farmerId: id, ...dateWhere },
      orderBy: { createdAt: "asc" },
    }),
    db.sale.findMany({
      where: { farmerId: id, ...dateWhere },
      orderBy: { createdAt: "asc" },
      include: {
        items: { include: { product: { select: { name: true, unit: true } } } },
      },
    }),
    db.commission.findMany({
      where: { farmerId: id, ...dateWhere },
      orderBy: { createdAt: "asc" },
    }),
    db.pesticideSale.findMany({
      where: { farmerId: id, ...dateWhere },
      orderBy: { createdAt: "asc" },
      include: { pesticide: { select: { name: true, unit: true } } },
    }),
  ])

  const events: any[] = []

  for (const purchase of farmerPurchases) {
    const parts: string[] = []
    if (purchase.commodity) parts.push(purchase.commodity)
    if (purchase.bags) parts.push(`${purchase.bags} Bags`)
    if (purchase.weight) parts.push(`${purchase.weight} KG`)
    if (!parts.length && purchase.items.length) {
      parts.push(purchase.items.map((i) => `${i.quantity} ${i.product.unit} ${i.product.name}`).join(", "))
    }
    events.push({
      date: purchase.createdAt,
      type: "PURCHASE",
      description: `Purchase #${purchase.id.slice(-6).toUpperCase()}${parts.length ? ` — ${parts.join(", ")}` : ""}`,
      debit: purchase.totalAmount,
      credit: 0,
    })
  }

  for (const purchase of productPurchases) {
    const desc = purchase.items.map((i: any) => `${i.quantity} ${i.product.unit} ${i.product.name}`).join(", ")
    events.push({
      date: purchase.createdAt,
      type: "PURCHASE",
      description: `Purchase #${purchase.id.slice(-6).toUpperCase()}${desc ? ` — ${desc}` : ""}`,
      debit: purchase.totalAmount,
      credit: 0,
    })
    for (const payment of purchase.payments) {
      events.push({
        date: payment.createdAt,
        type: "PAYMENT",
        description: `Payment — ${payment.method}${payment.notes ? ` (${payment.notes})` : ""}`,
        debit: 0,
        credit: payment.amount,
      })
    }
  }

  for (const payment of payments) {
    const isReceive = payment.amount < 0
    const displayAmt = Math.abs(payment.amount)
    events.push({
      date: payment.createdAt,
      type: isReceive ? "INCOME" : "PAYMENT",
      description: `${isReceive ? "Received from Farmer" : "Payment"} — ${payment.method}${payment.notes ? ` (${payment.notes})` : ""}`,
      debit: isReceive ? displayAmt : 0,
      credit: isReceive ? 0 : displayAmt,
    })
  }

  for (const sale of farmerSales) {
    const itemDesc = sale.items.map((i: any) => `${i.quantity} ${i.product.unit} ${i.product.name}`).join(", ")
    events.push({
      date: sale.createdAt,
      type: "SALE",
      description: `Sale #${sale.id.slice(-6).toUpperCase()}${itemDesc ? ` — ${itemDesc}` : ""}`,
      debit: 0,
      credit: sale.totalAmount,
    })
  }

  // Pesticide sales to farmer — farmer owes mandi (credit reduces running balance)
  for (const ps of pesticideSales) {
    events.push({
      date: ps.createdAt,
      type: "PESTICIDE_SALE",
      description: `Pesticide Sale #${ps.id.slice(-6).toUpperCase()} — ${ps.quantity} ${ps.pesticide?.unit || ""} ${ps.pesticide?.name || ""}`,
      debit: 0,
      credit: ps.totalAmount,
    })
    if (ps.paidAmount > 0) {
      events.push({
        date: ps.createdAt,
        type: "PAYMENT",
        description: `Payment received — Pesticide sale`,
        debit: ps.paidAmount,
        credit: 0,
      })
    }
  }

  // Commission transactions where farmer is the seller — mandi owes farmer sellerPayable
  for (const comm of commissions) {
    const parts = [comm.commodity, comm.bags ? `${comm.bags} bags` : null, comm.weight ? `${comm.weight} kg` : null].filter(Boolean).join(", ")
    events.push({
      date: comm.createdAt,
      type: "COMMISSION",
      description: `Commission #${comm.id.slice(-6).toUpperCase()}${parts ? ` — ${parts}` : ""}`,
      debit: comm.sellerPayable,
      credit: 0,
    })
  }

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let running = 0
  const entries = events.map((e) => {
    running += e.debit - e.credit
    return { ...e, balance: running }
  })

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0)
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0)

  return NextResponse.json({ farmer, entries, totalDebit, totalCredit, closingBalance: running })
}
