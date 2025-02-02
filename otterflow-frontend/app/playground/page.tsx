"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import Layout from "@/components/Layout"
import { motion, AnimatePresence } from "framer-motion"

export default function Playground() {
  const [messages, setMessages] = useState([
    { role: "system", content: "Welcome to the OtterFlow Playground. How can I assist you today?", model: null },
  ])
  const [input, setInput] = useState("")
  const [modelUsed, setModelUsed] = useState<string | null>(null)
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)
  const [catalogData, setCatalogData] = useState<
    { id: string; name: string; cost: number; latency: number; performance: number }[]
  >([])

  const [preferences, setPreferences] = useState({
    latencyPriority: 5,
    costPriority: 5,
    accuracyPriority: 5,
  })

  const [constraints, setConstraints] = useState<{
    cost_max: number | null
    perf_min: number | null
    lat_max: number | null
  }>({
    cost_max: null,
    perf_min: null,
    lat_max: null,
  })

  const [ranges, setRanges] = useState({
    cost_min: 0,
    cost_max: 100,
    performance_min: 0,
    performance_max: 100,
    latency_min: 0,
    latency_max: 1000,
  })

  const [error, setError] = useState<string | null>(null)

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || ""

  const fetchModelCatalog = async () => {
    try {
      const res = await fetch(`${baseUrl}/models/model_catalog`, { credentials: "include" })
      if (!res.ok) {
        throw new Error(`Failed to fetch model catalog: ${res.statusText}`)
      }
      const data = await res.json()
      setCatalogData(data.models)
    } catch (error) {
      console.error("Error fetching model catalog:", error)
    }
  }

  const openCatalog = async () => {
    await fetchModelCatalog()
    setIsCatalogOpen(true)
  }

  const closeCatalog = () => {
    setIsCatalogOpen(false)
  }

  useEffect(() => {
    const fetchRanges = async () => {
      try {
        const res = await fetch(`${baseUrl}/query/get_ranges`, { credentials: "include" })
        if (!res.ok) {
          throw new Error(`Failed to fetch ranges: ${res.statusText}`)
        }
        const data = await res.json()

        const roundedRanges = {
          cost_min: Math.round(data.cost_min),
          cost_max: Math.round(data.cost_max),
          performance_min: Math.round(data.performance_min),
          performance_max: Math.round(data.performance_max),
          latency_min: Math.round(data.latency_min),
          latency_max: Math.round(data.latency_max),
        }

        // Scale down cost values for display (simulate 1 million tokens)
        setRanges({
          ...roundedRanges,
          cost_min: roundedRanges.cost_min / 3,
          cost_max: roundedRanges.cost_max / 3,
        })

        setConstraints({
          cost_max: roundedRanges.cost_max / 3,
          perf_min: roundedRanges.performance_min,
          lat_max: roundedRanges.latency_max,
        })
      } catch (error) {
        console.error("Error fetching ranges:", error)
      }
    }
    fetchRanges()
  }, [baseUrl])

  const handleSend = async () => {
    // Validate inputs against display ranges
    if (
      constraints.cost_max === null ||
      constraints.perf_min === null ||
      constraints.lat_max === null ||
      constraints.cost_max < ranges.cost_min ||
      constraints.cost_max > ranges.cost_max ||
      constraints.perf_min < ranges.performance_min ||
      constraints.perf_min > ranges.performance_max ||
      constraints.lat_max < ranges.latency_min ||
      constraints.lat_max > ranges.latency_max
    ) {
      setError("Please stick to the allowed ranges for constraints.")
      return
    }

    if (!input.trim()) return

    setMessages((prev) => [...prev, { role: "user", content: input, model: null }])
    setError(null) // reset error on valid send

    try {
      const url = `${baseUrl}/query/handle_user_query?user_query=${encodeURIComponent(input)}`

      // Rescale cost_max back to original before sending
      const adjustedConstraints = {
        ...constraints,
        cost_max: constraints.cost_max !== null ? constraints.cost_max * 3 : null,
      }

      const user_input = {
        cost_priority: preferences.costPriority,
        accuracy_priority: preferences.accuracyPriority,
        latency_priority: preferences.latencyPriority,
        cost_max: adjustedConstraints.cost_max,
        perf_min: adjustedConstraints.perf_min,
        lat_max: adjustedConstraints.lat_max,
      }

      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Display specific error message if available
      const errorMessage = errorData.detail || "No models available for your selected parameters. Please retry with new ones."
      setMessages((prev) => [
        ...prev,
        { role: "system", content: errorMessage, model: null },
      ])
      return
      }
      const data = await response.json()

      setMessages((prev) => [...prev, { role: "system", content: data.response, model: data.model_used }])
      setModelUsed(data.model_used)
    } catch (error) {
      console.error("Error processing query:", error)
      setMessages((prev) => [
        ...prev,
        { role: "system", content: "No models available for your selected parameters. Please retry with new ones.", model: null },
      ])
    }

    setInput("")
  }

  const handleReset = () => {
    setPreferences({
      latencyPriority: 5,
      costPriority: 5,
      accuracyPriority: 5,
    })
    setConstraints({
      cost_max: ranges.cost_max,
      perf_min: ranges.performance_min,
      lat_max: ranges.latency_max,
    })
    setModelUsed(null)
    setError(null)
  }

  return (
    <Layout>
      {/* Header Section with Model Catalog Button */}
      <div className="flex items-center justify-between w-full px-4 pb-4 sticky">
        <h1 className="text-3xl font-bold">OtterFlow Playground</h1>
        <Button
          onClick={openCatalog}
          className="bg-teal-500 hover:bg-teal-600 text-white rounded-full px-4 py-2 text-sm font-medium"
        >
          Model Catalog
        </Button>
      </div>

      <div className="flex h-[calc(95vh-4rem)] relative">
        {/* Left side: Chat area */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardContent className="flex-1 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <div key={index} className={`mb-4 ${message.role === "user" ? "text-right" : "text-left"}`}>
                  <span
                    className={`inline-block p-2 rounded-lg ${
                      message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {message.content}
                  </span>
                  {message.model && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="text-xs text-gray-500 mt-1 text-right pr-2"
                    >
                      Model: {message.model}
                    </motion.div>
                  )}
                </div>
              ))}
            </CardContent>
            <div className="p-4 border-t">
              <div className="flex">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message here..."
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                />
                <Button onClick={handleSend} className="ml-2">
                  Send
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right side: Preferences Panel */}
        <Card className="w-80 ml-6">
          <CardContent className="p-4 space-y-4">
            <h2 className="text-lg font-semibold mb-2">Model Preferences</h2>

            {/* Latency Priority Slider */}
            <div>
              <Label>Latency Priority</Label>
              <Slider
                value={[preferences.latencyPriority]}
                min={0}
                max={10}
                step={1}
                onValueChange={(value) =>
                  setPreferences((prev) => ({
                    ...prev,
                    latencyPriority: value[0],
                  }))
                }
              />
              <div className="text-sm text-gray-600">Current: {preferences.latencyPriority}</div>
            </div>

            {/* Cost Priority Slider */}
            <div>
              <Label>Cost Priority</Label>
              <Slider
                value={[preferences.costPriority]}
                min={0}
                max={10}
                step={1}
                onValueChange={(value) =>
                  setPreferences((prev) => ({
                    ...prev,
                    costPriority: value[0],
                  }))
                }
              />
              <div className="text-sm text-gray-600">Current: {preferences.costPriority}</div>
            </div>

            {/* Performance Priority Slider */}
            <div>
              <Label>Performance Priority</Label>
              <Slider
                value={[preferences.accuracyPriority]}
                min={0}
                max={10}
                step={1}
                onValueChange={(value) =>
                  setPreferences((prev) => ({
                    ...prev,
                    accuracyPriority: value[0],
                  }))
                }
              />
              <div className="text-sm text-gray-600">Current: {preferences.accuracyPriority}</div>
            </div>

            {/* Additional Constraints */}
            <div className="mt-4">
              <Label className="font-semibold">Constraints</Label>
              <div className="mt-2 space-y-3">
                {/* Max Cost */}
                <div>
                  <Label htmlFor="costMax">Max Cost (for 1M tokens)</Label>
                  <Input
                    id="costMax"
                    type="number"
                    value={constraints.cost_max !== null ? constraints.cost_max : ""}
                    min={ranges.cost_min}
                    max={ranges.cost_max}
                    step={1}
                    onChange={(e) =>
                      setConstraints((prev) => ({
                        ...prev,
                        cost_max: Number.parseFloat(e.target.value),
                      }))
                    }
                  />
                  <small className="text-gray-500">
                    Valid range: [{ranges.cost_min}, {ranges.cost_max}]
                  </small>
                </div>

                {/* Min Performance */}
                <div>
                  <Label htmlFor="perfMin">Min Performance</Label>
                  <Input
                    id="perfMin"
                    type="number"
                    value={constraints.perf_min !== null ? constraints.perf_min : ""}
                    min={ranges.performance_min}
                    max={ranges.performance_max}
                    step={1}
                    onChange={(e) =>
                      setConstraints((prev) => ({
                        ...prev,
                        perf_min: Number.parseFloat(e.target.value),
                      }))
                    }
                  />
                  <small className="text-gray-500">
                    Valid range: [{ranges.performance_min}, {ranges.performance_max}]
                  </small>
                </div>

                {/* Max Latency */}
                <div>
                  <Label htmlFor="latMax">Max Latency</Label>
                  <Input
                    id="latMax"
                    type="number"
                    value={constraints.lat_max !== null ? constraints.lat_max : ""}
                    min={ranges.latency_min}
                    max={ranges.latency_max}
                    step={1}
                    onChange={(e) =>
                      setConstraints((prev) => ({
                        ...prev,
                        lat_max: Number.parseFloat(e.target.value),
                      }))
                    }
                  />
                  <small className="text-gray-500">
                    Valid range: [{ranges.latency_min}, {ranges.latency_max}]
                  </small>
                </div>
              </div>
            </div>

            {/* Display animated error if exists */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-2 bg-red-200 text-red-800 rounded mt-2"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={handleReset}>
                Reset to Defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simple Modal for Model Catalog */}
      <AnimatePresence>
        {isCatalogOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-6 rounded shadow-lg w-full max-w-4xl mx-4 relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <h2 className="text-xl font-bold mb-4">Model Catalog</h2>
              <div className="overflow-x-auto max-h-[70vh]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Latency</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {catalogData.map((model) => (
                      <tr key={model.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{model.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{model.cost}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{model.latency}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{model.performance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                onClick={closeCatalog}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full px-4 py-2 text-sm font-medium mt-4 absolute top-4 right-4"
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  )
}
