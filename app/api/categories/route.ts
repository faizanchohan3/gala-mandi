import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const categories = await db.category.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json({ categories })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description } = await req.json()
  const category = await db.category.create({ data: { name, description } })
  return NextResponse.json({ category }, { status: 201 })
}
