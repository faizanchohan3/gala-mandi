import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const db = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 12)
  const admin = await db.user.upsert({
    where: { email: "admin@galamandi.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@galamandi.com",
      password: adminPassword,
      role: "SUPER_ADMIN",
    },
  })

  // Sample staff
  const managerPassword = await bcrypt.hash("manager123", 12)
  await db.user.upsert({
    where: { email: "manager@galamandi.com" },
    update: {},
    create: {
      name: "Ahmed Khan",
      email: "manager@galamandi.com",
      password: managerPassword,
      role: "MANAGER",
    },
  })

  const cashierPassword = await bcrypt.hash("cashier123", 12)
  await db.user.upsert({
    where: { email: "cashier@galamandi.com" },
    update: {},
    create: {
      name: "Ali Raza",
      email: "cashier@galamandi.com",
      password: cashierPassword,
      role: "CASHIER",
    },
  })

  // Product categories
  const grains = await db.category.upsert({
    where: { name: "Grains" },
    update: {},
    create: { name: "Grains", description: "Wheat, Rice, Corn etc." },
  })

  const seeds = await db.category.upsert({
    where: { name: "Seeds" },
    update: {},
    create: { name: "Seeds", description: "Agricultural seeds" },
  })

  const fertilizers = await db.category.upsert({
    where: { name: "Fertilizers" },
    update: {},
    create: { name: "Fertilizers", description: "Chemical and organic fertilizers" },
  })

  // Products
  await db.product.createMany({
    skipDuplicates: true,
    data: [
      { name: "Wheat (Gehun)", categoryId: grains.id, unit: "Maund", currentStock: 500, minStock: 50, purchasePrice: 3800, salePrice: 4000 },
      { name: "Rice Basmati", categoryId: grains.id, unit: "KG", currentStock: 300, minStock: 30, purchasePrice: 320, salePrice: 380 },
      { name: "Corn (Makki)", categoryId: grains.id, unit: "Maund", currentStock: 200, minStock: 20, purchasePrice: 2200, salePrice: 2400 },
      { name: "Sunflower Seeds", categoryId: seeds.id, unit: "KG", currentStock: 100, minStock: 10, purchasePrice: 150, salePrice: 200 },
      { name: "Cotton Seeds", categoryId: seeds.id, unit: "KG", currentStock: 80, minStock: 10, purchasePrice: 250, salePrice: 300 },
      { name: "DAP Fertilizer", categoryId: fertilizers.id, unit: "Bag", currentStock: 50, minStock: 10, purchasePrice: 9500, salePrice: 10000 },
      { name: "Urea Fertilizer", categoryId: fertilizers.id, unit: "Bag", currentStock: 60, minStock: 10, purchasePrice: 4200, salePrice: 4500 },
    ],
  })

  // Pesticide categories
  const herbicide = await db.pesticideCategory.upsert({
    where: { name: "Herbicide" },
    update: {},
    create: { name: "Herbicide" },
  })

  const insecticide = await db.pesticideCategory.upsert({
    where: { name: "Insecticide" },
    update: {},
    create: { name: "Insecticide" },
  })

  const fungicide = await db.pesticideCategory.upsert({
    where: { name: "Fungicide" },
    update: {},
    create: { name: "Fungicide" },
  })

  // Pesticides
  await db.pesticide.createMany({
    skipDuplicates: true,
    data: [
      {
        name: "Glyphosate 41%",
        categoryId: herbicide.id,
        manufacturer: "Syngenta",
        batchNumber: "SYN2024A",
        expiryDate: new Date("2026-06-30"),
        quantity: 200,
        unit: "Litre",
        purchasePrice: 1200,
        salePrice: 1500,
        minStock: 20,
      },
      {
        name: "Chlorpyrifos 40%",
        categoryId: insecticide.id,
        manufacturer: "FMC",
        batchNumber: "FMC2024B",
        expiryDate: new Date("2025-12-31"),
        quantity: 150,
        unit: "Litre",
        purchasePrice: 900,
        salePrice: 1100,
        minStock: 15,
      },
      {
        name: "Mancozeb 80%",
        categoryId: fungicide.id,
        manufacturer: "Bayer",
        batchNumber: "BAY2024C",
        expiryDate: new Date("2026-03-31"),
        quantity: 100,
        unit: "KG",
        purchasePrice: 500,
        salePrice: 650,
        minStock: 10,
      },
    ],
  })

  // Customers
  await db.customer.createMany({
    skipDuplicates: true,
    data: [
      { name: "Muhammad Tariq", phone: "0300-1234567", address: "Village Chak 45, District Faisalabad" },
      { name: "Haji Bashir Ahmad", phone: "0333-7654321", address: "Main Bazaar, Sahiwal" },
      { name: "Ghulam Mustafa", phone: "0321-9876543", address: "Near Water Works, Okara" },
    ],
  })

  // Suppliers
  await db.supplier.createMany({
    skipDuplicates: true,
    data: [
      { name: "Punjab Agri Traders", phone: "042-35781234", address: "Hall Road, Lahore" },
      { name: "Syngenta Pakistan Ltd", phone: "021-35683000", address: "Karachi" },
      { name: "Ali Agro Supplies", phone: "041-2628456", address: "Grain Market, Faisalabad" },
    ],
  })

  // Sample task
  const manager = await db.user.findFirst({ where: { email: "manager@galamandi.com" } })
  if (manager) {
    await db.task.create({
      data: {
        title: "Check wheat stock and reorder if needed",
        description: "Monthly stock verification for wheat inventory. Compare physical count with system records.",
        assignedToId: manager.id,
        createdById: admin.id,
        priority: "HIGH",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    })
  }

  console.log("Database seeded successfully!")
  console.log("\nLogin credentials:")
  console.log("  Admin:   admin@galamandi.com   / admin123")
  console.log("  Manager: manager@galamandi.com / manager123")
  console.log("  Cashier: cashier@galamandi.com / cashier123")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
