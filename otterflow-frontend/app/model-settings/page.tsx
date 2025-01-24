'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AnimatePresence, motion } from "framer-motion"
import Layout from '@/components/Layout'
import ModelSettingsForm from '@/components/ModelSettingsForm'

interface Model {
  id: string
  name: string
  description: string
  temperature: number
  top_p: number
  isIncluded: boolean
}

export default function ModelSettings() {
  const [models, setModels] = useState<Model[]>([])
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Get base URL from env
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || ''

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      const response = await fetch(`${baseUrl}/models/get_models`, {
        method: 'GET',
        credentials: 'include', // Ensure cookies are sent
      });
      if (!response.ok) {
        throw new Error(`Error fetching models: ${response.statusText}`);
      }
      const data = await response.json();
      setModels(data.models);
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };
  

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
                  <Switch
                    checked={model.isIncluded}
                    onCheckedChange={() => toggleModel(model.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p>{model.description}</p>
              </CardContent>
              <CardContent className="pt-0">
                <Label className="flex items-center space-x-2">
                  <span>Include in OtterFlow</span>
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
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded"
        >
          Save All Changes
        </Button>
      </motion.div>
    </Layout>
  )
}
