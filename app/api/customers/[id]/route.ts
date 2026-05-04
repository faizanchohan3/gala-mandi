import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [customer, sales] = await Promise.all([
    db.customer.findUnique({ where: { id } }),
    db.sale.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "asc" },
      include: {
        items: { include: { product: { select: { name: true, unit: true } } } },
        payments: { orderBy: { createdAt: "asc" } },
        createdBy: { select: { name: true } },
      },
    }),
  ])

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const totalBusiness = sales.reduce((s, sale) => s + sale.totalAmount, 0)
  const totalPaid = sales.reduce((s, sale) => s + sale.paidAmount, 0)
  const totalBalance = sales.reduce((s, sale) => s + sale.balance, 0)

  // Build ledger entries (sale debits + payment credits), sorted by date
  const ledgerEvents: {
    date: Date
    type: "SALE" | "PAYMENT"
    description: string
    debit: number
    credit: number
  }[] = []

  for (const sale of sales) {
    ledgerEvents.push({
      date: sale.createdAt,
      type: "SALE",
      description: `Sale #${sale.id.slice(-6).toUpperCase()} — ${sale.items.map((i) => `${i.quantity} ${i.product.unit} ${i.product.name}`).join(", ")}`,
      debit: sale.totalAmount,
      credit: 0,
    })

    if (sale.payments.length > 0) {
      for (const payment of sale.payments) {
        ledgerEvents.push({
          date: payment.createdAt,
          type: "PAYMENT",
          description: `Payment received — ${payment.method}${payment.notes ? ` (${payment.notes})` : ""}`,
          debit: 0,
          credit: payment.amount,
        })
      }
    } else if (sale.paidAmount > 0) {
      // Fallback for sales created before Payment records were introduced
      ledgerEvents.push({
        date: sale.createdAt,
        type: "PAYMENT",
        description: `Payment received — CASH (recorded at sale)`,
        debit: 0,
        credit: sale.paidAmount,
      })
    }
  }

  ledgerEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let running = 0
  const ledger = ledgerEvents.map((e) => {
    running += e.debit - e.credit
    return { ...e, balance: running }
  })

  return NextResponse.json({ customer, sales, totalBusiness, totalPaid, totalBalance, ledger })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { name, phone, address, image, referenceName, referencePhone, creditLimit } = await req.json()

  const customer = await db.customer.update({
    where: { id },
    data: { name, phone, address, image: image || null, referenceName: referenceName || null, referencePhone: referencePhone || null, creditLimit: creditLimit || 0 },
  })
  await createAuditLog({ userId: session.user.id, action: "UPDATE", module: "CUSTOMERS", details: `Updated customer: ${name}` })

  return NextResponse.json({ customer })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.customer.update({ where: { id }, data: { isActive: false } })
  await createAuditLog({ userId: session.user.id, action: "DELETE", module: "CUSTOMERS", details: `Deactivated customer ID: ${id}` })

  return NextResponse.json({ success: true })
}
