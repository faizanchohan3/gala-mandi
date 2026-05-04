import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const transfers = await db.stockTransfer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      fromWarehouse: { select: { name: true } },
      toWarehouse: { select: { name: true } },
      product: { select: { name: true, unit: true } },
      createdBy: { select: { name: true } },
    },
  })

  return NextResponse.json({ transfers })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const transferNo = `TRF-${Date.now()}`

  const transfer = await db.$transaction(async (tx) => {
    const t = await tx.stockTransfer.create({
      data: {
        transferNo,
        fromWarehouseId: body.fromWarehouseId,
        toWarehouseId: body.toWarehouseId,
        productId: body.productId,
        quantity: body.quantity,
        batchNumber: body.batchNumber || null,
        status: "COMPLETED",
        notes: body.notes || null,
        createdById: session.user!.id!,
      },
    })

    // Deduct from source warehouse stock
    const fromStock = await tx.warehouseStock.findFirst({
      where: { warehouseId: body.fromWarehouseId, productId: body.productId },
    })
    if (fromStock) {
      await tx.warehouseStock.update({
        where: { id: fromStock.id },
        data: { quantity: { decrement: body.quantity } },
      })
    }

    // Add to destination warehouse stock
    const toStock = await tx.warehouseStock.findFirst({
      where: { warehouseId: body.toWarehouseId, productId: body.productId },
    })
    if (toStock) {
      await tx.warehouseStock.update({
        where: { id: toStock.id },
        data: { quantity: { increment: body.quantity } },
      })
    } else {
      await tx.warehouseStock.create({
        data: {
          warehouseId: body.toWarehouseId,
          productId: body.productId,
          quantity: body.quantity,
          batchNumber: body.batchNumber || null,
        },
      })
    }

    return t
  })

  return NextResponse.json({ transfer })
}
