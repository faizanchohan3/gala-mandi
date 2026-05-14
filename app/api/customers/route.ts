import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const shopFilter = session.user.shopId ? { shopId: session.user.shopId } : {}
  const { searchParams } = new URL(req.url)
  const all = searchParams.get("all") === "true"
  const activeFilter = all ? {} : { isActive: true }
  const customers = await db.customer.findMany({ where: { ...shopFilter, ...activeFilter }, orderBy: { name: "asc" } })
  return NextResponse.json({ customers })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { name, phone, address, image, referenceName, referencePhone, creditLimit } = await req.json()
  const customer = await db.customer.create({
    data: {
      shopId: session.user.shopId || null,
      name, phone, address,
      image: image || null,
      referenceName: referenceName || null,
      referencePhone: referencePhone || null,
      creditLimit: creditLimit || 0,
    },
  })
  return NextResponse.json({ customer }, { status: 201 })
}
