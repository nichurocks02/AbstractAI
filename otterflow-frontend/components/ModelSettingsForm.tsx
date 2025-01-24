import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface Model {
  id: string
  name: string
  temperature: number
  top_p: number
}

interface ModelSettingsFormProps {
  model: Model
  onClose: () => void
  onUpdate: (modelId: string, temperature: number, top_p: number) => void
}

const ModelSettingsForm: React.FC<ModelSettingsFormProps> = ({ model, onClose, onUpdate }) => {
  const [temperature, setTemperature] = useState(model.temperature)
  const [topP, setTopP] = useState(model.top_p)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(model.id, temperature, topP)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">{model.name} Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(Number.parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-center">{temperature.toFixed(1)}</div>
          </div>
          <div>
            <Label htmlFor="top_p">Top P</Label>
            <Input
              id="top_p"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={topP}
              onChange={(e) => setTopP(Number.parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-center">{topP.toFixed(1)}</div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export default ModelSettingsForm

