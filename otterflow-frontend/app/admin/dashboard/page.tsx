// app/admin/dashboard/page.tsx

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/admin/MetricCard"
import { Chart } from "@/components/admin/Chart"
import { DataTable } from "@/components/admin/DataTable"

interface UsageOverTime {
  date: string
  queries: number
}

interface RecentSignups {
  id: number
  email: string
  signupDate: string
}

interface DashboardMetrics {
  total_users: number
  total_queries: number
  total_cost: number
  new_signups: number
  usage_over_time: UsageOverTime[]
  recent_signups: RecentSignups[]
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/dashboard/metrics`, {
          credentials: "include", // Important to include admin cookie
        })
        if (!res.ok) {
          throw new Error("Failed to fetch metrics")
        }
        const data = await res.json()
        setMetrics(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  if (loading) {
    return <div className="p-6 text-white">Loading dashboard...</div>
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>
  }

  if (!metrics) {
    return <div className="p-6 text-white">No data available.</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-teal-100">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Users" value={metrics.total_users.toString()} icon="Users" />
        <MetricCard title="Total Queries" value={metrics.total_queries.toString()} icon="Search" />
        <MetricCard title="System Cost" value={`$${metrics.total_cost.toFixed(2)}`} icon="DollarSign" />
        <MetricCard title="New Signups" value={metrics.new_signups.toString()} icon="UserPlus" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <Chart
            type="line"
            data={
              metrics.usage_over_time.map(item => ({
                name: item.date,
                value: item.queries
              }))
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent User Signups</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "ID", accessorKey: "id" },
              { header: "Email", accessorKey: "email" },
              { header: "Signup Date", accessorKey: "signupDate" },
            ]}
            data={metrics.recent_signups}
          />
        </CardContent>
      </Card>
    </div>
  )
}
