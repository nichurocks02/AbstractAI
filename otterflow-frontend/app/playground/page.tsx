'use client'

import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Layout from '@/components/Layout'

export default function Playground() {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Welcome to the OtterFlow Playground. How can I assist you today?' },
  ])
  const [input, setInput] = useState('')
  const [algorithmicEnhancement, setAlgorithmicEnhancement] = useState('none')

  const handleSend = () => {
    if (input.trim()) {
      setMessages([...messages, { role: 'user', content: input }])
      // Here you would typically send the message to your backend and get a response
      // For this example, we'll just echo the user's message
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'system', content: `You said: ${input}` }])
      }, 500)
      setInput('')
    }
  }

  return (
    <Layout>
      <div className="flex h-full">
        <div className="flex-1 flex flex-col">
          <h1 className="text-3xl font-bold mb-6">OtterFlow Playground</h1>
          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardContent className="flex-1 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <div key={index} className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <span className={`inline-block p-2 rounded-lg ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                    {message.content}
                  </span>
                </div>
              ))}
            </CardContent>
            <div className="p-4 border-t">
              <div className="flex">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message here..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button onClick={handleSend} className="ml-2">Send</Button>
              </div>
            </div>
          </Card>
        </div>
        <Card className="w-64 ml-6">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-4">Model Preferences</h2>
            <div className="space-y-4">
              <div>
                <Label>Speed Priority</Label>
                <Slider defaultValue={[50]} max={100} step={1} />
              </div>
              <div>
                <Label>Cost Priority</Label>
                <Slider defaultValue={[50]} max={100} step={1} />
              </div>
              <div>
                <Label>Quality Priority</Label>
                <Slider defaultValue={[50]} max={100} step={1} />
              </div>
              <div>
                <Label>Algorithmic Enhancement</Label>
                <Select value={algorithmicEnhancement} onValueChange={setAlgorithmicEnhancement}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select enhancement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="chain-of-thought">Chain of Thought</SelectItem>
                    <SelectItem value="mixture-of-agents">Mixture of Agents</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full">Save Preferences</Button>
              <Button variant="outline" className="w-full">Reset to Defaults</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

