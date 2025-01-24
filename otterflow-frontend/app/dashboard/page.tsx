'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, PieChart } from '@/components/ui/chart'
import { Bell, ArrowRight } from 'lucide-react'
import Layout from '@/components/Layout'
import useAuth from '../../hooks/useAuth'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [metrics, setMetrics] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Define a palette of colors for the pie chart slices.
  const pieColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"]

  useEffect(() => {
    console.log({ user, loading })
    if (!loading && !user) {
      console.log("User not authenticated. Redirecting to /auth")
      router.push('/auth')
    }
  }, [user, loading, router])

  useEffect(() => {
    async function fetchMetrics() {
      try {
        console.log("Fetching metrics...")
        const backendURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
        const response = await fetch(`${backendURL}/dashboard/metrics`, {
          credentials: 'include'
        })
        console.log("Response status:", response.status)
        if (!response.ok) {
          console.error("Response not OK:", response.statusText)
          throw new Error(`Failed to fetch metrics: ${response.statusText}`)
        }
        const data = await response.json()
        console.log("Metrics data:", data)
        setMetrics(data)
      } catch (error) {
        console.error('Error fetching metrics:', error)
        setError('Failed to load dashboard metrics.')
      }
    }
    if (!loading && user) {
      fetchMetrics()
    }
  }, [loading, user])

  if (loading) return <p>Loading...</p>
  if (error) return <p>{error}</p>
  if (!metrics) return <p>Loading...</p>

  // Assign distinct colors to each model usage data point for the pie chart.
  const modelUsageDataWithColors = metrics.model_usage_distribution.map(
    (item: any, index: number) => ({
      ...item,
      color: pieColors[index % pieColors.length],
    })
  )

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total API Calls Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_api_calls}</div>
            <p className="text-xs text-muted-foreground">Total API calls made.</p>
          </CardContent>
        </Card>

        {/* Total Cost Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.total_cost < 0.01
                ? `$${metrics.total_cost.toFixed(6)}`
                : `$${metrics.total_cost.toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground">Total cost incurred.</p>
          </CardContent>
        </Card>

        {/* Average Latency Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.average_latency.toFixed(2)}ms</div>
            <p className="text-xs text-muted-foreground">Average latency of API responses.</p>
          </CardContent>
        </Card>

        {/* Active Models Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.model_usage_distribution.length}</div>
            <p className="text-xs text-muted-foreground">Number of active models.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
        {/* API Usage Over Time Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>API Usage Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <LineChart data={metrics.api_usage_over_time} xAxis="name" yAxis="value" />
          </CardContent>
        </Card>

        {/* Model Usage Distribution Pie Chart */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Model Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={modelUsageDataWithColors} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
        {/* Recent Activity Card */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {metrics.recent_activity.map((activity: string, idx: number) => (
                <li key={idx}>{activity}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {metrics.notifications.map((note: string, idx: number) => (
                <li key={idx} className="flex items-center">
                  <Bell className="mr-2 h-4 w-4" />
                  {note}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          className="text-black"
          onClick={() => router.push('/api-access')}
        >
          View API Keys
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="text-black"
          onClick={() => router.push('/model-settings')}
        >
          Configure Models
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </Layout>
  )
}
