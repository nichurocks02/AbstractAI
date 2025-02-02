// app/admin/query-logs/page.tsx

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/admin/DataTable"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export default function QueryLogs() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [userFilter, setUserFilter] = useState("all") // Initialize to "all" to represent "All Users"
  const [modelFilter, setModelFilter] = useState("all") // Initialize to "all" to represent "All Models"

  const [userNames, setUserNames] = useState<string[]>([]) // For user dropdown
  const [allTime, setAllTime] = useState(false) // "All Time" checkbox

  const [logs, setLogs] = useState<Array<{
    timestamp: string
    userName: string
    model: string
    query: string
    output: string
    tokens: number
    cost: string
  }> | []>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch user names for the dropdown on component mount
  useEffect(() => {
    const fetchUserNames = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/query-logs/users/names`, {
          credentials: "include",
        })
        if (!res.ok) {
          throw new Error("Failed to fetch user names")
        }
        const data: string[] = await res.json()
        setUserNames(data)
      } catch (err: any) {
        console.error(err)
        setError(err.message)
      }
    }

    fetchUserNames()
  }, [])

  // Function to handle filter application
  const handleFilter = async () => {
    // Construct query parameters based on selected filters
    const params = new URLSearchParams()
    if (!allTime) { // Only include date filters if "All Time" is not selected
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)
    }
    if (userFilter && userFilter !== "all") params.append("userName", userFilter)
    if (modelFilter && modelFilter !== "all") params.append("model", modelFilter)

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/query-logs/all-logs?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || "Failed to fetch logs")
      }
      const data = await res.json()
      setLogs(data.logs)
    } catch (err: any) {
      console.error(err)
      setError(err.message)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-teal-100">Query Logs</h1>

      {/* Filter Logs Card */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={allTime} // Disable if "All Time" is checked
              />
            </div>
            {/* End Date */}
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={allTime} // Disable if "All Time" is checked
              />
            </div>
            {/* User Filter */}
            <div>
              <Label htmlFor="userFilter">User</Label>
              <Select
                value={userFilter}
                onValueChange={(value) => setUserFilter(value)}
              >
                <SelectTrigger id="userFilter">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem> {/* Non-empty value */}
                  {userNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Model Filter */}
            <div>
              <Label htmlFor="modelFilter">Model</Label>
              <Select
                value={modelFilter}
                onValueChange={setModelFilter}
              >
                <SelectTrigger id="modelFilter">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem> {/* Non-empty value */}
                  <SelectItem value="GPT-3">GPT-3</SelectItem>
                  <SelectItem value="GPT-4">GPT-4</SelectItem>
                  <SelectItem value="BERT">BERT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* "All Time" Checkbox */}
          <div className="mt-4 flex items-center">
            <input
              type="checkbox"
              id="allTime"
              checked={allTime}
              onChange={(e) => setAllTime(e.target.checked)}
              className="mr-2"
            />
            <Label htmlFor="allTime">All Time</Label>
          </div>

          {/* Apply Filters Button */}
          <Button onClick={handleFilter} className="mt-4" disabled={loading}>
            {loading ? "Applying Filters..." : "Apply Filters"}
          </Button>
        </CardContent>
      </Card>

      {/* Query Logs DataTable Card */}
      <Card>
        <CardHeader>
          <CardTitle>Query Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-6 text-white">Loading logs...</div>
          ) : error ? (
            <div className="p-6 text-red-500">Error: {error}</div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-white">No logs found for the selected filters.</div>
          ) : (
            <DataTable
              columns={[
                { header: "Timestamp", accessorKey: "timestamp" },
                { header: "User Name", accessorKey: "userName" },
                { header: "Model", accessorKey: "model" },
                { header: "Query", accessorKey: "query" },
                { header: "Output", accessorKey: "output"},
                { header: "Tokens", accessorKey: "tokens" },
                { header: "Cost", accessorKey: "cost" },
              ]}
              data={logs}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
