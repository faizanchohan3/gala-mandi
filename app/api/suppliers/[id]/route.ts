import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [supplier, purchases] = await Promise.all([
    db.supplier.findUnique({ where: { id } }),
    db.purchase.findMany({
      where: { supplierId: id },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: true } }, createdBy: { select: { name: true } } },
    }),
  ])

  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const totalBusiness = purchases.reduce((s, p) => s + p.totalAmount, 0)
  const totalPaid = purchases.reduce((s, p) => s + p.paidAmount, 0)
  const totalBalance = purchases.reduce((s, p) => s + p.balance, 0)

  return NextResponse.json({ supplier, purchases, totalBusiness, totalPaid, totalBalance })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { name, phone, address } = await req.json()

  const supplier = await db.supplier.update({ where: { id }, data: { name, phone, address } })
  await createAuditLog({ userId: session.user.id, action: "UPDATE", module: "SUPPLIERS", details: `Updated supplier: ${name}` })

  return NextResponse.json({ supplier })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.supplier.update({ where: { id }, data: { isActive: false } })
  await createAuditLog({ userId: session.user.id, action: "DELETE", module: "SUPPLIERS", details: `Deactivated supplier ID: ${id}` })

  return NextResponse.json({ success: true })
}
