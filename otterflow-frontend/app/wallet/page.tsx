'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Info, PlusCircle, XCircle } from 'lucide-react'
import Layout from '@/components/Layout'
import { toast } from 'react-toastify'

export default function Wallet() {
  const [balance, setBalance] = useState(0)
  const [rechargeAmount, setRechargeAmount] = useState('')
  const [isRecharging, setIsRecharging] = useState(false)

  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/wallet/balance`, {
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          // Assuming wallet_balance is returned in cents
          setBalance(data.wallet_balance / 100)
        } else {
          toast.error('Failed to fetch wallet balance.')
        }
      } catch (error) {
        console.error('Error fetching wallet balance:', error)
        toast.error('An error occurred while fetching wallet balance.')
      }
    }

    fetchWalletBalance()
  }, [])

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount.')
      return
    }

    try {
      setIsRecharging(true)

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/wallet/recharge`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          token: 'dummy-token'  // Replace with actual payment token if integrated
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setBalance(data.wallet_balance / 100)
        toast.success('Wallet recharge successful!')
        setRechargeAmount('')
      } else {
        const errorData = await response.json()
        toast.error(`Recharge failed: ${errorData.detail}`)
      }
    } catch (error) {
      console.error('Error during recharge:', error)
      toast.error('An error occurred during recharge.')
    } finally {
      setIsRecharging(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-teal-500">Billing Settings</h1>
          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="bg-teal-800/30">
              <TabsTrigger value="overview" className="data-[state=active]:bg-teal-700">Overview</TabsTrigger>
              <TabsTrigger value="payment-methods" className="data-[state=active]:bg-teal-700">Payment Methods</TabsTrigger>
              <TabsTrigger value="billing-history" className="data-[state=active]:bg-teal-700">Billing History</TabsTrigger>
              <TabsTrigger value="preferences" className="data-[state=active]:bg-teal-700">Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <Card className="bg-gradient-to-br from-teal-700 to-teal-900 text-white">
                <CardHeader>
                  <CardTitle className="text-white">Credit Balance</CardTitle>
                  <CardDescription className="text-teal-200">
                    Manage your wallet balance and auto-recharge settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">Your Current Balance</h3>
                    <p className="text-4xl font-bold mt-2">${balance.toFixed(2)}</p>
                  </div>
    
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment-methods" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Manage your payment methods and auto-recharge settings.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-teal-400">Feature coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing-history" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>View your past transactions and invoices.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-teal-400">Feature coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Billing Preferences</CardTitle>
                  <CardDescription>Customize your billing settings and notifications.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-teal-400">Feature coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  )
}
