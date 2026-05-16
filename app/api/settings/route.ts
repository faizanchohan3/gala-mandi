import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!session.user.shopId) return NextResponse.json({ shop: null })

  try {
    const shop = await db.shop.findUnique({
      where: { id: session.user.shopId },
      select: { id: true, name: true, ownerName: true, phone: true, address: true, logo: true },
    })
    return NextResponse.json({ shop })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load settings" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!session.user.shopId) return NextResponse.json({ error: "No shop associated" }, { status: 400 })

  try {
    const body = await req.json()
    const data: any = {}
    if ("logo" in body) data.logo = body.logo   // base64 or null to remove
    if (body.name) data.name = body.name.trim()
    if ("ownerName" in body) data.ownerName = body.ownerName || ""
    if ("phone" in body) data.phone = body.phone || null
    if ("address" in body) data.address = body.address || null

    const shop = await db.shop.update({ where: { id: session.user.shopId }, data })
    return NextResponse.json({ shop })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update settings" }, { status: 500 })
  }
}
