import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const shopFilter = session.user.shopId ? { shopId: session.user.shopId } : {}
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const skip = (page - 1) * limit

  const [commissions, total] = await Promise.all([
    db.commission.findMany({
      skip,
      take: limit,
      where: shopFilter,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        farmer: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    }),
    db.commission.count({ where: shopFilter }),
  ])

  return NextResponse.json({ commissions, total, page, limit })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const {
    customerId,
    farmerId,
    supplierId,
    commodity,
    bags,
    weight,
    rate,
    totalValue,
    commissionRate,
    notes,
    paidAmount: initialPaid,
  } = body

  if (!customerId) return NextResponse.json({ error: "Customer is required" }, { status: 400 })
  if (!totalValue || totalValue <= 0) return NextResponse.json({ error: "Total value must be greater than 0" }, { status: 400 })

  const commRate = parseFloat(commissionRate) || 2.5
  const total = parseFloat(totalValue)
  const commAmount = parseFloat(((total * commRate) / 100).toFixed(2))
  const paid = parseFloat(initialPaid || "0")
  const balance = total - paid
  const status = balance <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING"

  const commission = await db.$transaction(async (tx) => {
    const c = await tx.commission.create({
      data: {
        shopId: session.user.shopId || null,
        customerId,
        farmerId: farmerId || null,
        supplierId: supplierId || null,
        commodity: commodity || null,
        bags: bags ? parseInt(bags) : null,
        weight: weight ? parseFloat(weight) : null,
        rate: parseFloat(rate || "0"),
        totalValue: total,
        commissionRate: commRate,
        commissionAmount: commAmount,
        paidAmount: paid,
        balance,
        status,
        notes: notes || null,
        createdById: session.user.id,
      },
    })

    // Debit customer for full transaction value
    await tx.customer.update({
      where: { id: customerId },
      data: { balance: { increment: total } },
    })

    // Record initial payment if any
    if (paid > 0) {
      await tx.commissionPayment.create({
        data: { commissionId: c.id, amount: paid, method: body.paymentMethod || "CASH", notes: "Initial payment" },
      })
      await tx.customer.update({
        where: { id: customerId },
        data: { balance: { decrement: paid } },
      })
    }

    return c
  })

  return NextResponse.json({ commission }, { status: 201 })
}
