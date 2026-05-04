import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const vehicles = await db.vehicle.findMany({
    where: { isActive: true },
    orderBy: { vehicleNo: "asc" },
    include: { _count: { select: { freightSlips: true } } },
  })

  return NextResponse.json({ vehicles })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const vehicle = await db.vehicle.create({
    data: {
      vehicleNo: body.vehicleNo.toUpperCase(),
      vehicleType: body.vehicleType || "Truck",
      driverName: body.driverName || null,
      driverPhone: body.driverPhone || null,
    },
  })
  return NextResponse.json({ vehicle })
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const vehicle = await db.vehicle.update({
    where: { id: body.id },
    data: {
      vehicleType: body.vehicleType,
      driverName: body.driverName || null,
      driverPhone: body.driverPhone || null,
    },
  })
  return NextResponse.json({ vehicle })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  await db.vehicle.update({ where: { id: body.id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
