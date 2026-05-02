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
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: true } }, createdBy: { select: { name: true } } },
    }),
  ])

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const totalBusiness = sales.reduce((s, sale) => s + sale.totalAmount, 0)
  const totalPaid = sales.reduce((s, sale) => s + sale.paidAmount, 0)
  const totalBalance = sales.reduce((s, sale) => s + sale.balance, 0)

  return NextResponse.json({ customer, sales, totalBusiness, totalPaid, totalBalance })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { name, phone, address } = await req.json()

  const customer = await db.customer.update({ where: { id }, data: { name, phone, address } })
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
