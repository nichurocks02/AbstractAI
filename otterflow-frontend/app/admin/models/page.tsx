"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/admin/DataTable"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function ModelsManagement() {
  // ----------------------
  // State for models & usage statistics
  // ----------------------
  const [models, setModels] = useState<Array<{
    id: number
    name: string
    license: string
    window: string
    cost: number
    latency: number
    performance: number
    top_p: number
    temperature: number
    io_ratio: number
  }>>([])

  const [usageStats, setUsageStats] = useState<Array<{
    model: string
    totalQueries: number
    totalTokens: number
    totalCost: string
  }>>([])

  // ----------------------
  // Editing and Creating States
  // ----------------------
  const [editingModel, setEditingModel] = useState<any | null>(null)
  const [creatingModel, setCreatingModel] = useState<any | null>(null)

  // ----------------------
  // Fetch models and usage stats on mount
  // ----------------------
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
        if (!backendUrl) {
          throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined")
        }

        const res = await fetch(`${backendUrl}/admin/models/list`, {
          credentials: "include",
        })
        if (!res.ok) {
          throw new Error(`Failed to fetch models: ${res.statusText}`)
        }
        const data = await res.json()
        console.log("Fetched models:", data)
        setModels(
          data.map((m: any) => ({
            id: m.id,
            name: m.model_name,
            license: m.license ?? "",
            window: m.window ?? "",
            cost: m.cost ?? 0,
            latency: m.latency ?? 0,
            performance: m.performance ?? 0,
            top_p: m.top_p ?? 0,
            temperature: m.temperature ?? 0,
            io_ratio: m.io_ratio ?? 0,
          }))
        )
      } catch (error) {
        console.error(error)
      }
    }

    const fetchUsageStats = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
        if (!backendUrl) {
          throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined")
        }

        const res = await fetch(`${backendUrl}/admin/models/usage-stats`, {
          credentials: "include",
        })
        if (!res.ok) {
          throw new Error(`Failed to fetch usage stats: ${res.statusText}`)
        }
        const data = await res.json()
        console.log("Fetched usage stats:", data)
        setUsageStats(data.usage || [])
      } catch (error) {
        console.error(error)
      }
    }

    fetchModels()
    fetchUsageStats()
  }, [])

  // ----------------------
  // Handle Editing a Model
  // ----------------------
  const handleEditModel = (model: any) => {
    setEditingModel({ ...model })
  }

  const handleSaveModel = async () => {
    if (!editingModel) return
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      if (!backendUrl) {
        throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined")
      }

      const { id, name, license, window, cost, latency, performance, top_p, temperature, io_ratio } = editingModel
      const res = await fetch(`${backendUrl}/admin/models/update/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_name: name,
          license,
          window,
          cost: parseFloat(cost),
          latency: parseInt(latency),
          performance: parseFloat(performance),
          top_p: parseFloat(top_p),
          temperature: parseFloat(temperature),
          io_ratio: parseFloat(io_ratio),
        }),
      })
      if (!res.ok) {
        throw new Error(`Failed to update model: ${res.statusText}`)
      }
      const updated = await res.json()
      console.log("Updated model:", updated)

      // Update local state
      setModels((prev) =>
        prev.map((m) =>
          m.id === updated.id
            ? {
                id: updated.id,
                name: updated.model_name,
                license: updated.license ?? "",
                window: updated.window ?? "",
                cost: updated.cost ?? 0,
                latency: updated.latency ?? 0,
                performance: updated.performance ?? 0,
                top_p: updated.top_p ?? 0,
                temperature: updated.temperature ?? 0,
                io_ratio: updated.io_ratio ?? 0,
              }
            : m
        )
      )
      setEditingModel(null)
    } catch (error) {
      console.error(error)
    }
  }

  // ----------------------
  // Handle Creating a New Model
  // ----------------------
  const handleCreateNewModel = () => {
    setCreatingModel({
      name: "",
      license: "",
      window: "",
      cost: 0,
      latency: 0,
      performance: 0,
      top_p: 1.0,
      temperature: 0.7,
      io_ratio: 1.0,
    })
  }

  const handleSaveNewModel = async () => {
    if (!creatingModel) return
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      if (!backendUrl) {
        throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined")
      }

      const { name, license, window, cost, latency, performance, top_p, temperature, io_ratio } = creatingModel
      const res = await fetch(`${backendUrl}/admin/models/create`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_name: name,
          license,
          window,
          cost: parseFloat(cost),
          latency: parseInt(latency),
          performance: parseFloat(performance),
          top_p: parseFloat(top_p),
          temperature: parseFloat(temperature),
          io_ratio: parseFloat(io_ratio),
        }),
      })
      if (!res.ok) {
        throw new Error(`Failed to create model: ${res.statusText}`)
      }
      const created = await res.json()
      console.log("Created model:", created)

      // Add to local state
      setModels((prev) => [
        ...prev,
        {
          id: created.id,
          name: created.model_name,
          license: created.license ?? "",
          window: created.window ?? "",
          cost: created.cost ?? 0,
          latency: created.latency ?? 0,
          performance: created.performance ?? 0,
          top_p: created.top_p ?? 0,
          temperature: created.temperature ?? 0,
          io_ratio: created.io_ratio ?? 0,
        },
      ])
      setCreatingModel(null)
    } catch (error) {
      console.error(error)
    }
  }

  // ----------------------
  // Handle Deleting a Model
  // ----------------------
  const handleDeleteModel = async (modelId: number) => {
    if (!confirm("Are you sure you want to delete this model?")) return
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      if (!backendUrl) {
        throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined")
      }

      const res = await fetch(`${backendUrl}/admin/models/delete/${modelId}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) {
        throw new Error(`Failed to delete model: ${res.statusText}`)
      }

      // Remove from local state
      setModels((prev) => prev.filter((m) => m.id !== modelId))
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-teal-100">Models Management</h1>

      {/* Add Model Dialog */}
      <Dialog open={!!creatingModel} onOpenChange={(open) => !open && setCreatingModel(null)}>
        <DialogTrigger asChild>
          <Button onClick={handleCreateNewModel}>
            Add Model
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Model</DialogTitle>
          </DialogHeader>
          {creatingModel && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={creatingModel.name}
                  onChange={(e) => setCreatingModel({ ...creatingModel, name: e.target.value })}
                />
              </div>
              <div>
                <Label>License</Label>
                <Input
                  value={creatingModel.license}
                  onChange={(e) => setCreatingModel({ ...creatingModel, license: e.target.value })}
                />
              </div>
              <div>
                <Label>Window</Label>
                <Input
                  value={creatingModel.window}
                  onChange={(e) => setCreatingModel({ ...creatingModel, window: e.target.value })}
                />
              </div>
              <div>
                <Label>Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={creatingModel.cost}
                  onChange={(e) =>
                    setCreatingModel({ ...creatingModel, cost: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Latency (ms)</Label>
                <Input
                  type="number"
                  value={creatingModel.latency}
                  onChange={(e) =>
                    setCreatingModel({ ...creatingModel, latency: parseInt(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Performance (0..1)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={creatingModel.performance}
                  onChange={(e) =>
                    setCreatingModel({ ...creatingModel, performance: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Top P</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={creatingModel.top_p}
                  onChange={(e) =>
                    setCreatingModel({ ...creatingModel, top_p: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Temperature</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={creatingModel.temperature}
                  onChange={(e) =>
                    setCreatingModel({ ...creatingModel, temperature: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>IO Ratio</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={creatingModel.io_ratio}
                  onChange={(e) =>
                    setCreatingModel({ ...creatingModel, io_ratio: parseFloat(e.target.value) })
                  }
                />
              </div>
              <Button onClick={handleSaveNewModel}>Create</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Model Dialog */}
      <Dialog open={!!editingModel} onOpenChange={(open) => !open && setEditingModel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Model: {editingModel?.name}</DialogTitle>
          </DialogHeader>
          {editingModel && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editingModel.name}
                  onChange={(e) =>
                    setEditingModel({ ...editingModel, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>License</Label>
                <Input
                  value={editingModel.license}
                  onChange={(e) =>
                    setEditingModel({ ...editingModel, license: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Window</Label>
                <Input
                  value={editingModel.window}
                  onChange={(e) =>
                    setEditingModel({ ...editingModel, window: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingModel.cost}
                  onChange={(e) =>
                    setEditingModel({
                      ...editingModel,
                      cost: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Latency (ms)</Label>
                <Input
                  type="number"
                  value={editingModel.latency}
                  onChange={(e) =>
                    setEditingModel({
                      ...editingModel,
                      latency: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Performance (0..1)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={editingModel.performance}
                  onChange={(e) =>
                    setEditingModel({
                      ...editingModel,
                      performance: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Top P</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editingModel.top_p}
                  onChange={(e) =>
                    setEditingModel({ ...editingModel, top_p: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Temperature</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editingModel.temperature}
                  onChange={(e) =>
                    setEditingModel({
                      ...editingModel,
                      temperature: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>IO Ratio</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editingModel.io_ratio}
                  onChange={(e) =>
                    setEditingModel({
                      ...editingModel,
                      io_ratio: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <Button onClick={handleSaveModel}>Save Changes</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Models Table */}
      <Card>
        <CardHeader>
          <CardTitle>AI Models</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Name", accessorKey: "name" },
              { header: "License", accessorKey: "license" },
              { header: "Window", accessorKey: "window" },
              { header: "Cost", accessorKey: "cost" },
              { header: "Latency", accessorKey: "latency" },
              { header: "Performance", accessorKey: "performance" },
              { header: "Actions", accessorKey: "actions" },
            ]}
            data={models.map((model) => ({
              ...model,
              cost: `$${model.cost.toFixed(2)}`,
              latency: `${model.latency}ms`,
              performance: `${(model.performance).toFixed(1)}%`,
              actions: (
                <div className="flex space-x-2">
                  <Dialog
                    open={editingModel?.id === model.id}
                    onOpenChange={(open) => !open && setEditingModel(null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditModel(model)}
                      >
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Model: {editingModel?.name}</DialogTitle>
                      </DialogHeader>
                      {editingModel && editingModel.id === model.id && (
                        <div className="space-y-4">
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={editingModel.name}
                              onChange={(e) =>
                                setEditingModel({ ...editingModel, name: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>License</Label>
                            <Input
                              value={editingModel.license}
                              onChange={(e) =>
                                setEditingModel({ ...editingModel, license: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>Window</Label>
                            <Input
                              value={editingModel.window}
                              onChange={(e) =>
                                setEditingModel({ ...editingModel, window: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>Cost</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={editingModel.cost}
                              onChange={(e) =>
                                setEditingModel({
                                  ...editingModel,
                                  cost: parseFloat(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Latency (ms)</Label>
                            <Input
                              type="number"
                              value={editingModel.latency}
                              onChange={(e) =>
                                setEditingModel({
                                  ...editingModel,
                                  latency: parseInt(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Performance (0..1)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="1"
                              value={editingModel.performance}
                              onChange={(e) =>
                                setEditingModel({
                                  ...editingModel,
                                  performance: parseFloat(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>Top P</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={editingModel.top_p}
                              onChange={(e) =>
                                setEditingModel({ ...editingModel, top_p: parseFloat(e.target.value) })
                              }
                            />
                          </div>
                          <div>
                            <Label>Temperature</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={editingModel.temperature}
                              onChange={(e) =>
                                setEditingModel({
                                  ...editingModel,
                                  temperature: parseFloat(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>IO Ratio</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={editingModel.io_ratio}
                              onChange={(e) =>
                                setEditingModel({
                                  ...editingModel,
                                  io_ratio: parseFloat(e.target.value),
                                })
                              }
                            />
                          </div>
                          <Button onClick={handleSaveModel}>Save Changes</Button>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteModel(model.id)}
                  >
                    Delete
                  </Button>
                </div>
              ),
            }))}
          />
        </CardContent>
      </Card>

      {/* Model Usage Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Model Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Model", accessorKey: "model" },
              { header: "Total Queries", accessorKey: "totalQueries" },
              { header: "Total Tokens", accessorKey: "totalTokens" },
              { header: "Total Cost", accessorKey: "totalCost" },
            ]}
            data={usageStats}
          />
        </CardContent>
      </Card>
    </div>
  )
}
