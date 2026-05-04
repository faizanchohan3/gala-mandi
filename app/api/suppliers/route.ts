import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const shopFilter = session.user.shopId ? { shopId: session.user.shopId } : {}
  const suppliers = await db.supplier.findMany({ where: { ...shopFilter, isActive: true }, orderBy: { name: "asc" } })
  return NextResponse.json({ suppliers })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { name, phone, address } = await req.json()
  const supplier = await db.supplier.create({ data: { shopId: session.user.shopId || null, name, phone, address } })
  return NextResponse.json({ supplier }, { status: 201 })
}
