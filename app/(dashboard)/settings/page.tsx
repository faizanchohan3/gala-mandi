"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Trash2, Tag } from "lucide-react"

export default function SettingsPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [pestCategories, setPestCategories] = useState<any[]>([])
  const [showCatModal, setShowCatModal] = useState(false)
  const [showPestCatModal, setShowPestCatModal] = useState(false)
  const [catName, setCatName] = useState("")
  const [pestCatName, setPestCatName] = useState("")

  async function loadData() {
    const [cr, pcr] = await Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/pesticide-categories").then((r) => r.json()),
    ])
    setCategories(cr.categories || [])
    setPestCategories(pcr.categories || [])
  }

  useEffect(() => { loadData() }, [])

  async function addCategory() {
    if (!catName.trim()) return
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName }),
    })
    setCatName("")
    setShowCatModal(false)
    loadData()
  }

  async function addPestCategory() {
    if (!pestCatName.trim()) return
    await fetch("/api/pesticide-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: pestCatName }),
    })
    setPestCatName("")
    setShowPestCatModal(false)
    loadData()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500 text-sm">Manage categories and shop configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Categories */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4" /> Product Categories
            </CardTitle>
            <Button size="sm" onClick={() => setShowCatModal(true)}>
              <Plus className="w-3 h-3" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{c.name}</span>
                  <span className="text-xs text-gray-400">ID: {c.id.slice(0, 8)}</span>
                </div>
              ))}
              {categories.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No categories yet</p>}
            </div>
          </CardContent>
        </Card>

        {/* Pesticide Categories */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4" /> Pesticide Categories
            </CardTitle>
            <Button size="sm" onClick={() => setShowPestCatModal(true)}>
              <Plus className="w-3 h-3" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pestCategories.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{c.name}</span>
                </div>
              ))}
              {pestCategories.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No categories yet</p>}
            </div>
          </CardContent>
        </Card>

        {/* Shop Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Shop Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Shop Name</Label><Input defaultValue="Gala Mandi Shop" /></div>
              <div><Label>Owner Name</Label><Input placeholder="Owner name" /></div>
              <div><Label>Phone</Label><Input placeholder="+92 300 0000000" /></div>
              <div><Label>Address</Label><Input placeholder="Shop address" /></div>
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-700">
              Shop info is for display purposes. Changes will be reflected in reports and documents.
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCatModal} onOpenChange={setShowCatModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Product Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Category Name</Label><Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Grains, Seeds" /></div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCatModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={addCategory} className="flex-1">Add Category</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPestCatModal} onOpenChange={setShowPestCatModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Pesticide Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Category Name</Label><Input value={pestCatName} onChange={(e) => setPestCatName(e.target.value)} placeholder="e.g. Herbicide, Fungicide" /></div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowPestCatModal(false)} className="flex-1">Cancel</Button>
              <Button onClick={addPestCategory} className="flex-1">Add Category</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
