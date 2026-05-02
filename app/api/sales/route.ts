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

  const [sales, total] = await Promise.all([
    db.sale.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        createdBy: { select: { name: true } },
        items: { include: { product: true } },
      },
    }),
    db.sale.count(),
  ])

  return NextResponse.json({ sales, total, page, limit })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { customerId, items, paidAmount, notes } = body

  const totalAmount = items.reduce((s: number, i: any) => s + i.quantity * i.price, 0)
  const balance = totalAmount - (paidAmount || 0)
  const status = balance <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "PENDING"

  const sale = await db.$transaction(async (tx) => {
    const s = await tx.sale.create({
      data: {
        customerId: customerId || null,
        totalAmount,
        paidAmount: paidAmount || 0,
        balance,
        status,
        notes,
        createdById: session.user.id,
        items: {
          create: items.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            total: i.quantity * i.price,
          })),
        },
      },
      include: { items: true },
    })

    // Deduct stock
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      })
      await tx.stockMovement.create({
        data: { productId: item.productId, type: "OUT", quantity: item.quantity, reference: `Sale #${s.id}` },
      })
    }

    return s
  })

  await createAuditLog({ userId: session.user.id, action: "CREATE", module: "SALES", details: `Created sale: ${formatCurrency(totalAmount)}` })

  return NextResponse.json({ sale }, { status: 201 })
}

function formatCurrency(amount: number) {
  return `PKR ${amount.toLocaleString()}`
}
