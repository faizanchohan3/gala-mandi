import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const shopFilter = session.user.shopId ? { shopId: session.user.shopId } : {}

    const slips = await db.freightSlip.findMany({
      where: { ...shopFilter, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      include: {
        vehicle: { select: { vehicleNo: true, vehicleType: true, driverName: true } },
        customer: { select: { name: true, phone: true } },
        createdBy: { select: { name: true } },
        deliveryChallan: true,
      },
    })

    return NextResponse.json({ slips })
  } catch (err: any) {
    console.error("Freight GET error:", err)
    return NextResponse.json({ error: err?.message || "Failed to load freight slips" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    if (!body.fromLocation || !body.toLocation) {
      return NextResponse.json({ error: "From and To locations are required" }, { status: 400 })
    }
    const slipNo = `FRT-${Date.now()}`

    const slip = await db.freightSlip.create({
      data: {
        slipNo,
        shopId: session.user.shopId || null,
        vehicleId: body.vehicleId || null,
        customerId: body.customerId || null,
        fromLocation: body.fromLocation || null,
        toLocation: body.toLocation || null,
        commodity: body.commodity || null,
        bags: body.bags || null,
        weight: body.weight || null,
        freight: body.freight || 0,
        notes: body.notes || null,
        createdById: session.user!.id!,
      },
    })

    return NextResponse.json({ slip })
  } catch (err: any) {
    console.error("Freight POST error:", err)
    return NextResponse.json({ error: err?.message || "Failed to create freight slip" }, { status: 500 })
  }
}
