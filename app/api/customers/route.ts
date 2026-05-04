import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const customers = await db.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
  return NextResponse.json({ customers })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { name, phone, address, image, referenceName, referencePhone, creditLimit } = await req.json()
  const customer = await db.customer.create({
    data: { name, phone, address, image: image || null, referenceName: referenceName || null, referencePhone: referencePhone || null, creditLimit: creditLimit || 0 },
  })
  return NextResponse.json({ customer }, { status: 201 })
}
