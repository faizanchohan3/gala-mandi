import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createAuditLog } from "@/lib/audit"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const pesticides = await db.pesticide.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ pesticides })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, categoryId, manufacturer, batchNumber, expiryDate, quantity, unit, purchasePrice, salePrice, minStock } = body

  const pesticide = await db.pesticide.create({
    data: {
      name, categoryId, manufacturer, batchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      quantity, unit, purchasePrice, salePrice, minStock: minStock || 0,
    },
  })

  await createAuditLog({ userId: session.user.id, action: "CREATE", module: "PESTICIDES", details: `Added pesticide: ${name}` })

  return NextResponse.json({ pesticide }, { status: 201 })
}
