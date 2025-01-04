'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import Layout from '@/components/Layout'
import useAuth from '../../hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from "react"

const modelCatalog = [
  { id: 'gpt3', name: 'GPT-3', description: 'Powerful language model for various NLP tasks.' },
  { id: 'gpt4', name: 'GPT-4', description: 'Advanced language model with improved reasoning capabilities.' },
  { id: 'bert', name: 'BERT', description: 'Bidirectional Encoder Representations from Transformers.' },
  { id: 'roberta', name: 'RoBERTa', description: 'Robustly optimized BERT approach.' },
  { id: 't5', name: 'T5', description: 'Text-to-Text Transfer Transformer.' },
  { id: 'xlnet', name: 'XLNet', description: 'Generalized autoregressive pretraining method.' },
]

export default function ModelSettings() {
  const [includedModels, setIncludedModels] = useState(new Set(['gpt3', 'gpt4']))
  const { user, loading } = useAuth()
  const router = useRouter()
  const toggleModel = (modelId: string) => {
    setIncludedModels(prev => {
      const newSet = new Set(prev)
      if (newSet.has(modelId)) {
        newSet.delete(modelId)
      } else {
        newSet.add(modelId)
      }
      return newSet
    })
  }
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login') // Redirect to login if not authenticated
    }
  }, [user, loading, router])

  if (loading) {
    return <p>Loading...</p>
  }
  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Model Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modelCatalog.map(model => (
          <Card key={model.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{model.name}</span>
                <Switch
                  checked={includedModels.has(model.id)}
                  onCheckedChange={() => toggleModel(model.id)}
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
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <Button>Save Model Settings</Button>
      </div>
    </Layout>
  )
}

