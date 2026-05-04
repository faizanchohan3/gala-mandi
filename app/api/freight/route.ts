import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  const slips = await db.freightSlip.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      vehicle: { select: { vehicleNo: true, vehicleType: true, driverName: true } },
      customer: { select: { name: true, phone: true } },
      createdBy: { select: { name: true } },
      deliveryChallan: true,
    },
  })

  return NextResponse.json({ slips })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const slipNo = `FRT-${Date.now()}`

  const slip = await db.freightSlip.create({
    data: {
      slipNo,
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
}
