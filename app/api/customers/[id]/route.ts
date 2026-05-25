import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [customer, sales, commissions, pesticideSales, customerPayments] = await Promise.all([
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
    db.commission.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "asc" },
      include: { payments: { orderBy: { createdAt: "asc" } } },
    }),
    db.pesticideSale.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "asc" },
      include: { pesticide: { select: { name: true, unit: true } } },
    }),
    db.customerPayment.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "asc" },
    }),
  ])

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const totalBusiness =
    sales.reduce((s, sale) => s + sale.totalAmount, 0) +
    commissions.reduce((s, c) => s + c.totalValue, 0) +
    pesticideSales.reduce((s, ps) => s + ps.totalAmount, 0)

  // Initial paid at sale/commission creation + standalone CustomerPayment records
  const initialPaid =
    sales.reduce((s, sale) => s + sale.paidAmount, 0) +
    commissions.reduce((s, c) => s + c.paidAmount, 0) +
    pesticideSales.reduce((s, ps) => s + ps.paidAmount, 0)
  const cpTotal = customerPayments.reduce((s, p) => s + p.amount, 0)
  const totalPaid = initialPaid + cpTotal

  const totalBalance = totalBusiness - totalPaid

  // Build ledger entries from all sources, sorted by date
  const ledgerEvents: {
    date: Date
    type: "SALE" | "COMMISSION" | "PESTICIDE" | "PAYMENT"
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
          description: `Payment — ${payment.method}${payment.notes ? ` (${payment.notes})` : ""}`,
          debit: 0,
          credit: payment.amount,
        })
      }
    } else if (sale.paidAmount > 0) {
      ledgerEvents.push({
        date: sale.createdAt,
        type: "PAYMENT",
        description: `Payment — CASH (at sale)`,
        debit: 0,
        credit: sale.paidAmount,
      })
    }
  }

  for (const c of commissions) {
    ledgerEvents.push({
      date: c.createdAt,
      type: "COMMISSION",
      description: `Commission — ${c.commodity || "goods"}${c.bags ? ` (${c.bags} bags)` : ""}`,
      debit: c.totalValue,
      credit: 0,
    })
    if (c.payments.length > 0) {
      for (const payment of c.payments) {
        ledgerEvents.push({
          date: payment.createdAt,
          type: "PAYMENT",
          description: `Payment — ${payment.method}${payment.notes ? ` (${payment.notes})` : ""}`,
          debit: 0,
          credit: payment.amount,
        })
      }
    } else if (c.paidAmount > 0) {
      ledgerEvents.push({
        date: c.createdAt,
        type: "PAYMENT",
        description: `Payment — CASH (at commission)`,
        debit: 0,
        credit: c.paidAmount,
      })
    }
  }

  for (const ps of pesticideSales) {
    ledgerEvents.push({
      date: ps.createdAt,
      type: "PESTICIDE",
      description: `Pesticide — ${ps.pesticide?.name || "Item"} ×${ps.quantity}`,
      debit: ps.totalAmount,
      credit: 0,
    })
    if (ps.paidAmount > 0) {
      ledgerEvents.push({
        date: ps.createdAt,
        type: "PAYMENT",
        description: `Payment — CASH (at sale)`,
        debit: 0,
        credit: ps.paidAmount,
      })
    }
  }

  for (const cp of customerPayments) {
    ledgerEvents.push({
      date: cp.createdAt,
      type: "PAYMENT",
      description: cp.direction === "PAY"
        ? `Paid to Customer — ${cp.method}${cp.notes ? ` (${cp.notes})` : ""}`
        : `Received from Customer — ${cp.method}${cp.notes ? ` (${cp.notes})` : ""}`,
      debit: 0,
      credit: cp.amount,
    })
  }

  ledgerEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let running = 0
  const ledger = ledgerEvents.map((e) => {
    running += e.debit - e.credit
    return { ...e, balance: running }
  })

  return NextResponse.json({ customer, sales, commissions, pesticideSales, totalBusiness, totalPaid, totalBalance, ledger })
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { isActive } = await req.json()
  const customer = await db.customer.update({ where: { id }, data: { isActive } })
  await createAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    module: "CUSTOMERS",
    details: `${isActive ? "Activated" : "Deactivated"} customer ID: ${id}`,
  })
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
