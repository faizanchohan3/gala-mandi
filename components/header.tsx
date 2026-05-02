"use client"

import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
import { Bell, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getRoleColor } from "@/lib/utils"

export function Header({ title }: { title: string }) {
  const { data: session } = useSession()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <Bell className="w-5 h-5" />
        </button>

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
