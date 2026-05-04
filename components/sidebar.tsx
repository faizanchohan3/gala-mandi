"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Package, ShoppingCart, ShoppingBag, Sprout,
  Wallet, BarChart3, ClipboardList, Users, Settings,
  ChevronLeft, ChevronRight, Store, CheckSquare, UserCheck,
  Truck, ChevronDown, Receipt, Tractor, UserCog, Warehouse,
  Scale, UserCircle,
} from "lucide-react"
import { useState, useEffect } from "react"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  hasChildren?: true
}

const reportSubItems = [
  { href: "/reports", label: "Overview" },
  { href: "/reports/sales", label: "Sales Report" },
  { href: "/reports/customers", label: "Customer Report" },
  { href: "/reports/products", label: "Product Report" },
  { href: "/reports/profit-loss", label: "Profit & Loss" },
  { href: "/reports/customer-ledger", label: "Customer Ledger" },
  { href: "/reports/supplier-ledger", label: "Supplier Ledger" },
]

const shopNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/purchases", label: "Purchases", icon: ShoppingBag },
  { href: "/customers", label: "Customers", icon: UserCheck },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/pesticides", label: "Pesticides", icon: Sprout },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/farmers", label: "Farmers", icon: Tractor },
  { href: "/agents", label: "Aadat Agents", icon: UserCog },
  { href: "/warehouse", label: "Godowns", icon: Warehouse },
  { href: "/transport", label: "Transport", icon: Truck },
  { href: "/gate", label: "Gate / Weighbridge", icon: Scale },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/reports", label: "Reports", icon: BarChart3, hasChildren: true },
  { href: "/audit", label: "Audit Log", icon: ClipboardList },
  { href: "/users", label: "Users", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
]

// Super admin only sees shops management + their profile
const superAdminNavItems: NavItem[] = [
  { href: "/shops", label: "All Shops", icon: Store },
  { href: "/profile", label: "My Profile", icon: UserCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"
  const shopName = session?.user?.shopName
  const navItems = isSuperAdmin ? superAdminNavItems : shopNavItems

  useEffect(() => {
    if (pathname.startsWith("/reports")) setReportsOpen(true)
  }, [pathname])

  return (
    <aside
      className={cn(
        "relative flex flex-col bg-green-800 text-white transition-all duration-300 h-screen overflow-hidden",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-green-700 flex-shrink-0">
        <div className="flex-shrink-0 w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
          <Store className="w-5 h-5 text-green-900" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm leading-tight truncate">
              {isSuperAdmin ? "Gala Mandi" : (shopName || "Gala Mandi")}
            </p>
            <p className="text-green-300 text-xs">
              {isSuperAdmin ? "Platform Head" : "Shop Management"}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const { href, label, icon: Icon, hasChildren } = item
          const active =
            pathname === href ||
            (href !== "/dashboard" && href !== "/" && pathname.startsWith(href))

          if (hasChildren) {
            return (
              <div key={href}>
                <div
                  className={cn(
                    "flex items-center rounded-lg transition-colors",
                    active ? "bg-green-600" : "hover:bg-green-700"
                  )}
                >
                  <Link
                    href={href}
                    className="flex items-center gap-3 px-3 py-2.5 flex-1 text-sm font-medium"
                  >
                    <Icon className="w-5 h-5 flex-shrink-0 text-white" />
                    {!collapsed && <span className="text-white">{label}</span>}
                  </Link>
                  {!collapsed && (
                    <button
                      onClick={() => setReportsOpen((o) => !o)}
                      className="pr-3 py-2.5 text-green-200 hover:text-white transition-colors"
                      aria-label="Toggle reports menu"
                    >
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform duration-300",
                          reportsOpen ? "rotate-180" : "rotate-0"
                        )}
                      />
                    </button>
                  )}
                </div>

                {!collapsed && (
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      reportsOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <div className="ml-4 mt-1 border-l-2 border-green-600 pl-3 pb-1 space-y-0.5">
                      {reportSubItems.map((sub) => {
                        const subActive = pathname === sub.href
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={cn(
                              "flex items-center py-1.5 px-2 rounded text-xs font-medium transition-colors",
                              subActive
                                ? "bg-green-700 text-yellow-300"
                                : "text-green-300 hover:bg-green-700 hover:text-white"
                            )}
                          >
                            {sub.label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active ? "bg-green-600 text-white" : "text-green-100 hover:bg-green-700 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-green-700 border border-green-600 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-white" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-white" />
        )}
      </button>
    </aside>
  )
}
