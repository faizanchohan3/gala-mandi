import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, categoryId, unit, minStock, purchasePrice, salePrice, currentStock } = body

  const data: any = { name, categoryId, unit, minStock, purchasePrice, salePrice }
  if (currentStock !== undefined && currentStock !== null && !Number.isNaN(Number(currentStock))) {
    data.currentStock = Number(currentStock)
  }

  const product = await db.product.update({ where: { id }, data })

  await createAuditLog({ userId: session.user.id, action: "UPDATE", module: "INVENTORY", details: `Updated product: ${name}` })

  return NextResponse.json({ product })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  await db.product.update({ where: { id }, data: { isActive: false } })
  await createAuditLog({ userId: session.user.id, action: "DELETE", module: "INVENTORY", details: `Deleted product ID: ${id}` })

  return NextResponse.json({ success: true })
}
