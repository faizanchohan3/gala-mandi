"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Tag, ImageIcon, Trash2, Upload } from "lucide-react"

export default function SettingsPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [pestCategories, setPestCategories] = useState<any[]>([])
  const [showCatModal, setShowCatModal] = useState(false)
  const [showPestCatModal, setShowPestCatModal] = useState(false)
  const [catName, setCatName] = useState("")
  const [pestCatName, setPestCatName] = useState("")

  // Logo states
  const [currentLogo, setCurrentLogo] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [savingLogo, setSavingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function loadData() {
    const [cr, pcr, sr] = await Promise.allSettled([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/pesticide-categories").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
    if (cr.status === "fulfilled") setCategories(cr.value.categories || [])
    if (pcr.status === "fulfilled") setPestCategories(pcr.value.categories || [])
    if (sr.status === "fulfilled" && sr.value.shop?.logo) setCurrentLogo(sr.value.shop.logo)
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) return alert("Please select an image file.")
    if (file.size > 2 * 1024 * 1024) return alert("Image must be under 2 MB.")

    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      // Resize to max 300×300 using canvas
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const MAX = 300
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
        setLogoPreview(canvas.toDataURL("image/jpeg", 0.85))
      }
      img.src = base64
    }
    reader.readAsDataURL(file)
    // Reset input so same file can be re-selected
    e.target.value = ""
  }

  async function saveLogo() {
    if (!logoPreview) return
    setSavingLogo(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo: logoPreview }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        return alert(d?.error || "Failed to save logo")
      }
      setCurrentLogo(logoPreview)
      setLogoPreview(null)
      alert("Logo saved! Refresh the page to see it in the sidebar.")
    } catch {
      alert("Network error. Please try again.")
    } finally {
      setSavingLogo(false)
    }
  }

  async function removeLogo() {
    if (!confirm("Remove the shop logo?")) return
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo: null }),
      })
      setCurrentLogo(null)
      setLogoPreview(null)
    } catch {
      alert("Network error. Please try again.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500 text-sm">Manage shop logo, categories and configuration</p>
      </div>

      {/* Shop Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Shop Logo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            {/* Preview area */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                {logoPreview ? (
                  <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : currentLogo ? (
                  <img src={currentLogo} alt="Shop Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2">
                    <ImageIcon className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="text-xs text-gray-400 mt-1">No logo</p>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Upload your shop logo. It will appear in the sidebar navigation.<br />
                <span className="text-xs text-gray-400">Accepted: JPG, PNG, WEBP — max 2 MB. Auto-resized to 300×300.</span>
              </p>
              <div className="flex gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" /> Choose Image
                </Button>
                {logoPreview && (
                  <Button size="sm" className="gap-2 bg-teal-700 hover:bg-teal-800" onClick={saveLogo} disabled={savingLogo}>
                    {savingLogo ? "Saving..." : "Save Logo"}
                  </Button>
                )}
                {logoPreview && (
                  <Button variant="ghost" size="sm" onClick={() => setLogoPreview(null)}>
                    Discard
                  </Button>
                )}
                {currentLogo && !logoPreview && (
                  <Button variant="ghost" size="sm" className="text-red-500 gap-2" onClick={removeLogo}>
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
      </div>

      <Dialog open={showCatModal} onOpenChange={setShowCatModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Product Category</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Category Name</Label><Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Grains, Seeds" autoFocus /></div>
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
            <div><Label>Category Name</Label><Input value={pestCatName} onChange={(e) => setPestCatName(e.target.value)} placeholder="e.g. Herbicide, Fungicide" autoFocus /></div>
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
