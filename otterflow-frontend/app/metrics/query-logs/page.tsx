"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart } from "@/components/ui/chart"
import { PieChart } from "@/components/ui/chart" // Import PieChart
import Layout from "@/components/Layout"

// Mock data for demonstration
const mockQueryLogs = [
  {
    id: 1,
    timestamp: "2023-06-01 10:00:00",
    user: "user1@example.com",
    query: "What is the weather like?",
    model: "GPT-3",
    tokens: 50,
    cost: 0.05,
  },
  {
    id: 2,
    timestamp: "2023-06-01 11:30:00",
    user: "user2@example.com",
    query: "Translate 'hello' to French",
    model: "GPT-4",
    tokens: 30,
    cost: 0.03,
  },
  {
    id: 3,
    timestamp: "2023-06-02 09:15:00",
    user: "user1@example.com",
    query: "Write a poem about spring",
    model: "GPT-3",
    tokens: 100,
    cost: 0.1,
  },
  // Add more mock data as needed
]

export default function QueryLogsPage() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Mock data for charts
  const dailyQueryData = [
    { name: "Jun 1", queries: 50 },
    { name: "Jun 2", queries: 65 },
    { name: "Jun 3", queries: 45 },
    { name: "Jun 4", queries: 70 },
    { name: "Jun 5", queries: 55 },
  ]

  const modelUsageData = [
    { name: "GPT-3", value: 60 },
    { name: "GPT-4", value: 30 },
    { name: "DALL-E", value: 10 },
  ]

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Query Logs</h1>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Logs</CardTitle>
        </CardHeader>
        <CardContent className="flex space-x-4">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
          />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="End Date" />
          <Button>Apply Filter</Button>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={dailyQueryData} xAxis="name" yAxis="queries" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Model Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={modelUsageData} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Query Log Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Query</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockQueryLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.timestamp}</TableCell>
                  <TableCell>{log.user}</TableCell>
                  <TableCell>{log.query}</TableCell>
                  <TableCell>{log.model}</TableCell>
                  <TableCell>{log.tokens}</TableCell>
                  <TableCell>${log.cost.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  )
}

