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

  const [purchases, total] = await Promise.all([
    db.purchase.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: true,
        createdBy: { select: { name: true } },
        items: { include: { product: true } },
      },
    }),
    db.purchase.count(),
  ])

  return NextResponse.json({ purchases, total })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { supplierId, items, paidAmount, notes } = body

  const totalAmount = items.reduce((s: number, i: any) => s + i.quantity * i.price, 0)
  const balance = totalAmount - (paidAmount || 0)
  const status = balance <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "PENDING"

  const purchase = await db.$transaction(async (tx) => {
    const p = await tx.purchase.create({
      data: {
        supplierId: supplierId || null,
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
    })

    // Add stock
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { increment: item.quantity } },
      })
      await tx.stockMovement.create({
        data: { productId: item.productId, type: "IN", quantity: item.quantity, reference: `Purchase #${p.id}` },
      })
    }

    return p
  })

  await createAuditLog({ userId: session.user.id, action: "CREATE", module: "PURCHASES", details: `Created purchase worth PKR ${totalAmount}` })

  return NextResponse.json({ purchase }, { status: 201 })
}
