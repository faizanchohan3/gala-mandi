import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { createAuditLog } from "@/lib/audit"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ users })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name, email, password, role } = await req.json()

  const exists = await db.user.findUnique({ where: { email } })
  if (exists) return NextResponse.json({ error: "Email already exists" }, { status: 400 })

  const hashed = await bcrypt.hash(password, 12)
  const user = await db.user.create({
    data: { name, email, password: hashed, role },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })

  await createAuditLog({ userId: session.user.id, action: "CREATE", module: "USERS", details: `Created user: ${email}` })

  return NextResponse.json({ user }, { status: 201 })
}
