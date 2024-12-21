'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, BarChart, PieChart } from '@/components/ui/chart'
import { Bell, ArrowRight } from 'lucide-react'
import Layout from '@/components/Layout'


// Add console logs to verify imports
console.log({
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  LineChart,
  BarChart,
  PieChart,
  Layout,
})

export default function Dashboard() {
  const apiUsageData = [
    { name: 'Jan', value: 5000 },
    { name: 'Feb', value: 8000 },
    { name: 'Mar', value: 12000 },
    { name: 'Apr', value: 15000 },
    { name: 'May', value: 20000 },
    { name: 'Jun', value: 24685 },
  ]

  const modelUsageData = [
    { name: 'GPT-3', value: 40 },
    { name: 'GPT-4', value: 30 },
    { name: 'BERT', value: 20 },
    { name: 'Others', value: 10 },
  ]

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24,685</div>
            <p className="text-xs text-muted-foreground">+15% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,245.89</div>
            <p className="text-xs text-muted-foreground">+20% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">236ms</div>
            <p className="text-xs text-muted-foreground">-5% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>API Usage Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <LineChart data={apiUsageData} xAxis="name" yAxis="value" />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Model Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={modelUsageData} />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-6">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>Processed 100 prompts using GPT-4</li>
              <li>Updated model configuration for BERT</li>
              <li>Generated new API key</li>
              <li>Enabled Chain of Thought for all models</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center text-yellow-500">
                <Bell className="mr-2 h-4 w-4" />
                Approaching 90% of usage limit
              </li>
              <li className="flex items-center text-green-500">
                <Bell className="mr-2 h-4 w-4" />
                New model available: GPT-4-32k
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 flex justify-between">
        <Button variant="outline">
          View API Keys
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button variant="outline">
          Configure Models
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </Layout>
  )
}

