import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

interface ModelCatalogModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ModelInfo {
  id: string
  name: string
  cost: number
  latency: number
  performance: number
}

const ModelCatalogModal: React.FC<ModelCatalogModalProps> = ({ isOpen, onClose }) => {
  const [models, setModels] = useState<ModelInfo[]>([])

  useEffect(() => {
    const fetchModelCatalog = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || ""
        const response = await fetch(`${baseUrl}/model_catalog`, {
          credentials: "include",
        })
        if (!response.ok) {
          throw new Error("Failed to fetch model catalog")
        }
        const data = await response.json()
        setModels(data.models)
      } catch (error) {
        console.error("Error fetching model catalog:", error)
      }
    }

    if (isOpen) {
      fetchModelCatalog()
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Model Catalog</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((model) => (
              <TableRow key={model.id}>
                <TableCell>{model.name}</TableCell>
                <TableCell>${model.cost.toFixed(4)}</TableCell>
                <TableCell>{model.latency.toFixed(2)} ms</TableCell>
                <TableCell>{model.performance.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DialogClose asChild>
          <Button className="mt-4">Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

export default ModelCatalogModal

