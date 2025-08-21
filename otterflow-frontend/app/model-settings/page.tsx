'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'react-feather'

// UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import Layout from '@/components/Layout'
import useAuth from '@/hooks/useAuth'

// Model interface
interface Model {
  id: string
  name: string
  description: string
  temperature: number
  top_p: number
  isIncluded: boolean
}

// Modal form component with slider inputs and a graphic background
const ModelSettingsForm = ({
  model,
  onClose,
  onUpdate,
}: {
  model: Model
  onClose: () => void
  onUpdate: (modelId: string, temperature: number, top_p: number) => void
}) => {
  // Guard clause (should never be hit if used correctly)
  if (!model) return null

  const [temperature, setTemperature] = useState(model.temperature)
  const [topP, setTopP] = useState(model.top_p)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(model.id, temperature, topP)
  }

  // Animation variants for backdrop and modal
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  }

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8, y: -50 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.8, y: -50 },
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        <motion.div
          className="relative rounded-lg shadow-2xl w-full max-w-md p-6 overflow-hidden"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3 }}
        >
          {/* Graphic background overlay using an external placeholder image */}
          <div className="absolute inset-0 bg-[url('https://picsum.photos/800/600?grayscale')] bg-cover bg-center opacity-30" />
          <div className="relative z-10">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              aria-label="Close settings"
            >
              <X size={20} />
            </button>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800">{model.name} Settings</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Temperature Slider */}
                <div>
                  <Label htmlFor="temperature" className="block text-sm font-medium text-black-700">
                    Temperature: <span className="font-bold">{temperature.toFixed(1)}</span>
                  </Label>
                  <input
                    id="temperature"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                {/* Top K Slider */}
                <div>
                  <Label htmlFor="topP" className="block text-sm font-medium text-black-700">
                    Top K: <span className="font-bold">{topP.toFixed(1)}</span>
                  </Label>
                  <input
                    id="topP"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={topP}
                    onChange={(e) => setTopP(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600">
                  Cancel
                </Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
                  Save
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Main Model Settings component
export default function ModelSettings() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [models, setModels] = useState<Model[]>([])
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || ''

  useEffect(() => {
    if (!loading && user) {
      fetchModels()
    }
  }, [loading, user])

  if (loading) {
    return (
      <Layout>
        <p>Loading user data...</p>
      </Layout>
    )
  }

  if (!user) {
    router.push('/auth')
    return (
      <Layout>
        <p>Redirecting to /auth...</p>
      </Layout>
    )
  }

  const fetchModels = async () => {
    try {
      const response = await fetch(`${baseUrl}/models/get_models`, {
        method: 'GET',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(`Error fetching models: ${response.statusText}`)
      }
      const data = await response.json()
      setModels(data.models)
    } catch (error) {
      console.error('Error fetching models:', error)
    }
  }

  const toggleModel = (modelId: string) => {
    setModels(prevModels =>
      prevModels.map(model =>
        model.id === modelId ? { ...model, isIncluded: !model.isIncluded } : model
      )
    )
    setHasChanges(true)
  }

  const openModelSettings = (model: Model) => {
    setSelectedModel(model)
  }

  const closeModelSettings = () => {
    setSelectedModel(null)
  }

  const updateModelSettings = (modelId: string, temperature: number, top_p: number) => {
    setModels(prevModels =>
      prevModels.map(model =>
        model.id === modelId ? { ...model, temperature, top_p } : model
      )
    )
    setHasChanges(true)
    closeModelSettings()
  }

  const saveAllChanges = async () => {
    try {
      const response = await fetch(`${baseUrl}/models/update-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models }),
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(`Error saving model settings: ${response.statusText}`)
      }
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving model settings:', error)
    }
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Model Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map(model => (
          <motion.div
            key={model.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card
              className="flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-300"
              onClick={() => openModelSettings(model)}
            >
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{model.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p>{model.description}</p>
              </CardContent>
              <CardContent className="pt-0">
                <Label className="flex items-center space-x-2">
                  {/* Uncomment the Switch below if you want inline toggling */}
                  {/* <Switch checked={model.isIncluded} onChange={() => toggleModel(model.id)} /> */}
                </Label>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedModel && (
          <ModelSettingsForm
            model={selectedModel}
            onClose={closeModelSettings}
            onUpdate={updateModelSettings}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mt-8 flex justify-end"
      >
        <Button
          onClick={saveAllChanges}
          disabled={!hasChanges}
          className="bg-teal-600 hover:bg-teal-700 !text-white font-bold py-2 px-4 rounded"
        >
          Save All Changes
        </Button>
      </motion.div>
    </Layout>
  )
}
