// users/page.tsx

"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/admin/DataTable"
import { Button } from "@/components/ui/button"

interface User {
  id: number
  name: string
  email: string
  isActive: string
  walletBalance: string
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
        if (!backendUrl) {
          throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined")
        }

        const res = await fetch(`${backendUrl}/admin/users/`, {
          credentials: "include",
        })
        if (!res.ok) {
          throw new Error(`Failed to fetch users: ${res.statusText}`)
        }
        const data = await res.json()
        setUsers(data.users)
      } catch (err: any) {
        console.error(err)
        setError(err.message || "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-teal-100">User Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-500">Error: {error}</div>
          ) : (
            <DataTable
              columns={[
                { header: "ID", accessorKey: "id" },
                { header: "Name", accessorKey: "name" }, // Added Name column
                { header: "Email", accessorKey: "email" },
                { header: "Active", accessorKey: "isActive" },
                { header: "Wallet Balance", accessorKey: "walletBalance" },
                { header: "Actions", accessorKey: "actions" },
              ]}
              data={users.map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                isActive: user.isActive,
                walletBalance: user.walletBalance,
                actions: (
                  <Link href={`/admin/users/${user.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                ),
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
