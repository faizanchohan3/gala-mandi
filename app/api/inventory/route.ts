import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const products = await db.product.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ products })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, categoryId, unit, currentStock, minStock, purchasePrice, salePrice } = body

  const product = await db.product.create({
    data: { name, categoryId, unit, currentStock, minStock, purchasePrice, salePrice },
  })

  if (currentStock > 0) {
    await db.stockMovement.create({
      data: { productId: product.id, type: "IN", quantity: currentStock, reference: "Opening Stock" },
    })
  }

  await createAuditLog({ userId: session.user.id, action: "CREATE", module: "INVENTORY", details: `Created product: ${name}` })

  return NextResponse.json({ product }, { status: 201 })
}
