// users/[id]/page.tsx

"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataTable } from "@/components/admin/DataTable"

interface UserDetail {
  id: number
  name: string
  email: string
  is_active: boolean
  wallet_balance: number
}

interface UpdateResponse {
  message: string
  user_id: number
  new_balance: string
}

export default function UserDetail() {
  const { id } = useParams()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [walletBalance, setWalletBalance] = useState<string>("")
  const [secretKey, setSecretKey] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserDetail = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
        if (!backendUrl) {
          throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined")
        }

        const res = await fetch(`${backendUrl}/admin/users/${id}`, {
          credentials: "include",
        })
        if (!res.ok) {
          throw new Error(`Failed to fetch user details: ${res.statusText}`)
        }
        const data = await res.json()
        setUser(data.user)
        setWalletBalance(data.user.wallet_balance.toString())
      } catch (err: any) {
        console.error(err)
        setError(err.message || "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchUserDetail()
  }, [id])

  const handleUpdateBalance = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      if (!backendUrl) {
        throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined")
      }

      const res = await fetch(`${backendUrl}/admin/users/${id}/balance`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          secret_key: secretKey,
          new_balance: parseFloat(walletBalance),
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || "Failed to update balance")
      }

      const data: UpdateResponse = await res.json()
      setUpdateMessage(data.message)

      // Optionally, refetch user details to update the UI
      const refetchRes = await fetch(`${backendUrl}/admin/users/${id}`, {
        credentials: "include",
      })
      if (refetchRes.ok) {
        const refetchData = await refetchRes.json()
        setUser(refetchData.user)
        setWalletBalance(refetchData.user.wallet_balance.toString())
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "An error occurred while updating balance")
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  if (!user) {
    return <div>User not found</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-teal-100">User Details - ID: {user.id}</h1>

      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <div>{user.email}</div>
            </div>
            <div>
              <Label>Status</Label>
              <div>{user.is_active ? "Active" : "Inactive"}</div>
            </div>
            <div>
              <Label>Wallet Balance</Label>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
                <Input
                  type="number"
                  value={walletBalance}
                  onChange={(e) => setWalletBalance(e.target.value)}
                  className="w-32"
                  min="0"
                  step="0.01"
                />
                <Input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Secret Key"
                  className="w-64 sm:w-32"
                />
                <Button onClick={handleUpdateBalance}>Update Balance</Button>
              </div>
              {updateMessage && <div className="text-green-500 mt-2">{updateMessage}</div>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Removed Tabs for Recent Usage and Query Logs */}
    </div>
  )
}
