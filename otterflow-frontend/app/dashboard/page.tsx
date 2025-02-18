'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { LineChart, PieChart } from '@/components/ui/chart'
import { Bell, ArrowRight, Gamepad2, BarChart } from 'lucide-react'
import Layout from '@/components/Layout'
import useAuth from '../../hooks/useAuth'
import { motion } from "framer-motion"
import { toast } from 'react-toastify'

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [metrics, setMetrics] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // A palette of colors for the pie chart slices
  const pieColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"]

  // Redirect if user is not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth')
    }
  }, [loading, user, router])

  // Fetch metrics once user is authenticated
  useEffect(() => {
    async function fetchMetrics() {
      try {
        const backendURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
        const response = await fetch(`${backendURL}/dashboard/metrics`, {
          credentials: 'include'
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.statusText}`)
        }
        const data = await response.json()
        setMetrics(data)
      } catch (err) {
        console.error('Error fetching metrics:', err)
        setError('Failed to load dashboard metrics.')
      }
    }

    if (!loading && user) {
      fetchMetrics()
    }
  }, [loading, user])

  // If still loading user state, show a message
  if (loading) {
    return (
      <Layout>
        <p>Loading user data...</p>
      </Layout>
    )
  }

  // If user is null, show a message (user is likely being redirected)
  if (!user) {
    return (
      <Layout>
        <p>Redirecting to /auth...</p>
      </Layout>
    )
  }

  // If there's an error, show it
  if (error) {
    return (
      <Layout>
        <p>{error}</p>
      </Layout>
    )
  }

  // If metrics are not yet fetched, show a loading message
  if (!metrics) {
    return (
      <Layout>
        <p>Loading dashboard metrics...</p>
      </Layout>
    )
  }

  // Map model usage distribution with colors for the pie chart
  const modelUsageDataWithColors = metrics.model_usage_distribution.map(
    (item: any, index: number) => ({
      ...item,
      color: pieColors[index % pieColors.length],
    })
  )

  // Placeholder component for empty chart data
  const ChartPlaceholder = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center h-48 text-gray-500">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="text-4xl mb-2">📊</div>
        <div>{message}</div>
      </motion.div>
    </div>
  )

  return (
    <Layout>
      {/* Header with Dashboard title and navigation icons */}
      <div className="flex items-center justify-between mb-6 relative">
        {/* Left group: Dashboard title with animated arrow */}
        <div className="relative flex items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          {/* Animated arrow: starts at the end of the title, travels toward the Gamepad2 */}
          <motion.div
            className="absolute text-2xl"
            style={{ left: 'calc(100% - 0.5rem)', top: '50%', transform: 'translateY(-50%)' }}
            // Feel free to adjust the x offset below so the arrow lands exactly on the Gamepad2 icon
            initial={{ x: 0 }}
            animate={{ x: [0, 950, 950] }}
            transition={{
              duration: 2,
              times: [0, 0.4, 1],
              repeat: Infinity,
              repeatDelay: 2,
              ease: "easeInOut",
            }}
          >
            → 
          </motion.div>
        </div>

        {/* Right group: small navigation icons */}
        <div className="flex space-x-4">
          <button
            onClick={() => router.push('/playground')}
            className="hover:opacity-75 mt-4"
            title="Playground"
          >
            <Gamepad2 className="h-9 w-9 text-teal-600" />
          </button>
          <button
            onClick={() => router.push('/metrics')}
            className="hover:opacity-75 mt-4"
            title="Metrics"
          >
            <BarChart className="h-9 w-9 text-indigo-600" />
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
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
          <CardHeader className="flex flex-row items-center justify-between space-y=0 pb-2">
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

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
        {/* API Usage Over Time Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>API Usage Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {metrics.api_usage_over_time && metrics.api_usage_over_time.length > 0 ? (
              <LineChart data={metrics.api_usage_over_time} xAxis="name" yAxis="value" />
            ) : (
              <ChartPlaceholder message="No API usage data available yet." />
            )}
          </CardContent>
        </Card>

        {/* Model Usage Distribution Pie Chart */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Model Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {modelUsageDataWithColors && modelUsageDataWithColors.length > 0 ? (
              <PieChart data={modelUsageDataWithColors} />
            ) : (
              <ChartPlaceholder message="No model usage data available yet." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity & Notifications Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
        {/* Recent Activity Card */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.recent_activity && metrics.recent_activity.length > 0 ? (
              <ul className="space-y-2">
                {metrics.recent_activity.map((activity: string, idx: number) => (
                  <li key={idx}>{activity}</li>
                ))}
              </ul>
            ) : (
              <ChartPlaceholder message="No recent activity." />
            )}
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.notifications && metrics.notifications.length > 0 ? (
              <ul className="space-y-2">
                {metrics.notifications.map((note: string, idx: number) => (
                  <li key={idx} className="flex items-center">
                    <Bell className="mr-2 h-4 w-4" />
                    {note}
                  </li>
                ))}
              </ul>
            ) : (
              <ChartPlaceholder message="No notifications." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation Buttons */}
      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          className="text-black"
          onClick={() => router.push('/api-access')}
        >
          View API Keys
          <ArrowRight className="ml-2 h-9 w-9" />
        </Button>
        <Button
          variant="outline"
          className="text-black"
          onClick={() => router.push('/model-settings')}
        >
          Configure Models
          <ArrowRight className="ml-2 h-9 w-9" />
        </Button>
      </div>
    </Layout>
  )
}
