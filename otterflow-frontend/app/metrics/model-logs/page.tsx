"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, LineChart, PieChart } from "@/components/ui/chart"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Layout from "@/components/Layout"

export default function ModelLogsPage() {
  // Mock data for charts
  const modelUsageData = [
    { name: "GPT-3", value: 60, queries: 1200 },
    { name: "GPT-4", value: 30, queries: 600 },
    { name: "DALL-E", value: 10, queries: 200 },
  ]

  const modelPerformanceData = [
    { name: "GPT-3", latency: 100, accuracy: 85, costEfficiency: 0.8 },
    { name: "GPT-4", latency: 150, accuracy: 95, costEfficiency: 0.9 },
    { name: "DALL-E", latency: 200, accuracy: 90, costEfficiency: 0.7 },
  ]

  const modelCostData = [
    { name: "Jun 1", cost: 50 },
    { name: "Jun 2", cost: 65 },
    { name: "Jun 3", cost: 45 },
    { name: "Jun 4", cost: 70 },
    { name: "Jun 5", cost: 55 },
  ]

  const performanceScoresData = [
    { name: "GPT-3", math: 80, coding: 75, generalKnowledge: 85 },
    { name: "GPT-4", math: 90, coding: 85, generalKnowledge: 95 },
    { name: "DALL-E", math: 60, coding: 50, generalKnowledge: 70 },
  ]

  const configurationImpactData = [
    { setting: "Default", avgCost: 0.05, avgLatency: 100 },
    { setting: "High Performance", avgCost: 0.08, avgLatency: 80 },
    { setting: "Low Cost", avgCost: 0.03, avgLatency: 120 },
  ]

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Model Logs</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Model Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={modelUsageData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Model Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={modelPerformanceData} xAxis="name" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily Model Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={modelCostData} xAxis="name" yAxis="cost" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Model Usage Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={modelUsageData} xAxis="name" yAxis="queries" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cost Efficiency per Model</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={modelPerformanceData} xAxis="name" yAxis="costEfficiency" />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Performance Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Math Score</TableHead>
                <TableHead>Coding Score</TableHead>
                <TableHead>General Knowledge Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performanceScoresData.map((score) => (
                <TableRow key={score.name}>
                  <TableCell>{score.name}</TableCell>
                  <TableCell>{score.math}</TableCell>
                  <TableCell>{score.coding}</TableCell>
                  <TableCell>{score.generalKnowledge}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setting</TableHead>
                <TableHead>Average Cost</TableHead>
                <TableHead>Average Latency (ms)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configurationImpactData.map((config) => (
                <TableRow key={config.setting}>
                  <TableCell>{config.setting}</TableCell>
                  <TableCell>${config.avgCost.toFixed(2)}</TableCell>
                  <TableCell>{config.avgLatency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  )
}

