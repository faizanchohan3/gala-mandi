"use client"

import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
import { Bell, LogOut, User, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getRoleColor } from "@/lib/utils"
import { useEffect, useState } from "react"
import Link from "next/link"

export function Header({ title }: { title: string }) {
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"
  const [pendingShops, setPendingShops] = useState(0)

  useEffect(() => {
    if (!isSuperAdmin) return
    fetch("/api/shops?status=PENDING")
      .then((r) => r.json())
      .then((d) => setPendingShops(d.shops?.length || 0))
      .catch(() => {})
  }, [isSuperAdmin])

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
        {!isSuperAdmin && session?.user?.shopName && (
          <span className="hidden sm:inline text-xs bg-green-100 text-green-800 px-2.5 py-1 rounded-full font-medium border border-green-200">
            <Store className="w-3 h-3 inline mr-1" />
            {session.user.shopName}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Pending shops bell for super admin */}
        {isSuperAdmin ? (
          <Link href="/shops" className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <Bell className="w-5 h-5" />
            {pendingShops > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingShops}
              </span>
            )}
          </Link>
        ) : (
          <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <Bell className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-800">{session?.user?.name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColor(session?.user?.role || "")}`}>
              {session?.user?.role?.replace("_", " ")}
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
        >
          <LogOut className="w-4 h-4 text-gray-500" />
        </Button>
      </div>
    </header>
  )
}
