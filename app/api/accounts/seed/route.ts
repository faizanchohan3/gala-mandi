import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"

const DEFAULT_ACCOUNTS = [
  // ASSET
  { code: "1001", name: "Cash in Hand", type: "ASSET", description: "Physical cash available" },
  { code: "1002", name: "Bank Accounts", type: "ASSET", description: "Money in bank accounts" },
  { code: "1003", name: "Stock / Inventory", type: "ASSET", description: "Value of goods in store" },
  { code: "1004", name: "Accounts Receivable", type: "ASSET", description: "Money owed by customers/traders" },
  { code: "1005", name: "Pesticide Incentive Receivable", type: "ASSET", description: "Incentive promised by company but not yet received" },
  { code: "1006", name: "Advance to Farmers", type: "ASSET", description: "Peshgi / advance given to farmers" },
  // LIABILITY
  { code: "2001", name: "Accounts Payable", type: "LIABILITY", description: "Money owed to suppliers" },
  { code: "2002", name: "Loans Payable", type: "LIABILITY", description: "Outstanding loans" },
  { code: "2003", name: "Advance from Traders", type: "LIABILITY", description: "Advance received from buyers/traders" },
  // EQUITY
  { code: "3001", name: "Owner Capital", type: "EQUITY", description: "Owner investment in business" },
  { code: "3002", name: "Owner Drawings", type: "EQUITY", description: "Owner withdrawals" },
  // INCOME
  { code: "4001", name: "Sales Income", type: "INCOME", description: "Revenue from product sales" },
  { code: "4002", name: "Commission Income", type: "INCOME", description: "Aadat / mandi commission earnings" },
  { code: "4003", name: "Pesticide Sales", type: "INCOME", description: "Revenue from pesticide sales" },
  { code: "4004", name: "Freight Income", type: "INCOME", description: "Revenue from transport/freight" },
  { code: "4005", name: "Other Income", type: "INCOME", description: "Miscellaneous income" },
  { code: "4006", name: "Pesticide Incentive", type: "INCOME", description: "Incentive received from pesticide companies" },
  // EXPENSE
  { code: "5001", name: "Purchases", type: "EXPENSE", description: "Cost of goods purchased" },
  { code: "5002", name: "Transport / Freight", type: "EXPENSE", description: "Transport and freight costs" },
  { code: "5003", name: "Labour", type: "EXPENSE", description: "Daily wage and labour costs" },
  { code: "5004", name: "Salaries", type: "EXPENSE", description: "Monthly staff salaries" },
  { code: "5005", name: "Rent", type: "EXPENSE", description: "Shop / office / godown rent" },
  { code: "5006", name: "Electricity & Utilities", type: "EXPENSE", description: "Electricity, gas, water bills" },
  { code: "5007", name: "Pesticide Purchases", type: "EXPENSE", description: "Cost of pesticide stock" },
  { code: "5008", name: "Commission Paid", type: "EXPENSE", description: "Commission paid to agents" },
  { code: "5009", name: "Bank Charges", type: "EXPENSE", description: "Bank fees and charges" },
  { code: "5010", name: "Office Expenses", type: "EXPENSE", description: "Stationery, printing, misc office" },
  { code: "5011", name: "Miscellaneous", type: "EXPENSE", description: "Other expenses" },
  { code: "5012", name: "Weighbridge / Gate Charges", type: "EXPENSE", description: "Gate and weighing scale operational costs" },
  { code: "5013", name: "Repairs & Maintenance", type: "EXPENSE", description: "Equipment, vehicle and building repairs" },
  { code: "5014", name: "Telephone & Internet", type: "EXPENSE", description: "Mobile, landline and internet bills" },
  { code: "5015", name: "Taxes & Government Fees", type: "EXPENSE", description: "FBR, local taxes, trade license fees" },
] as const

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const shopFilter = session.user.shopId ? { shopId: session.user.shopId } : {}
  const existing = await db.account.count({ where: shopFilter })

  if (existing > 0) {
    return NextResponse.json({ message: "Accounts already seeded", skipped: true })
  }

  const accounts = await db.account.createMany({
    data: DEFAULT_ACCOUNTS.map((a) => ({
      ...a,
      shopId: session.user.shopId || null,
    })),
  })

  return NextResponse.json({ success: true, created: accounts.count })
}
