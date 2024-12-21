'use client'

import React, { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { CreditCard, FileText, SettingsIcon, Sliders, Info, PlusCircle, XCircle } from 'lucide-react'
import Layout from '@/components/Layout'

export default function Wallet() {
  const [balance, setBalance] = useState(20.68)
  const [autoRecharge, setAutoRecharge] = useState(true)
  const [rechargeAmount, setRechargeAmount] = useState('')

  const handleRecharge = () => {
    const amount = parseFloat(rechargeAmount)
    if (!isNaN(amount) && amount > 0) {
      setBalance(balance + amount)
      setRechargeAmount('')
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing settings</h1>
          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="bg-teal-800/30">
              <TabsTrigger value="overview" className="data-[state=active]:bg-teal-700">Overview</TabsTrigger>
              <TabsTrigger value="payment-methods" className="data-[state=active]:bg-teal-700">Payment methods</TabsTrigger>
              <TabsTrigger value="billing-history" className="data-[state=active]:bg-teal-700">Billing history</TabsTrigger>
              <TabsTrigger value="preferences" className="data-[state=active]:bg-teal-700">Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pay as you go</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">Credit balance</h3>
                      <Info className="h-4 w-4 text-teal-400" />
                    </div>
                    <p className="text-4xl font-bold mt-2">${balance.toFixed(2)}</p>
                  </div>

                  <Card className="bg-teal-800/10">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-teal-500/20 flex items-center justify-center">
                              <div className="h-3 w-3 rounded-full bg-teal-500" />
                            </div>
                            <h4 className="font-semibold">Auto recharge is on</h4>
                          </div>
                          <p className="text-sm text-teal-200">
                            When your credit balance reaches $10.00, your payment method will be charged to bring the balance up to $50.00.
                          </p>
                        </div>
                        <Button variant="link" className="text-teal-400 hover:text-teal-300">
                          Modify
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-4">
                    <Button onClick={handleRecharge} className="bg-teal-600 hover:bg-teal-700">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add to credit balance
                    </Button>
                    <Button variant="outline" className="border-teal-600 text-teal-300 hover:bg-teal-800/50">
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel plan
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-6">
                <Card className="bg-teal-800/10">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-teal-600 flex items-center justify-center">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Payment methods</h3>
                        <p className="text-sm text-teal-200">Add or change payment method</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-teal-800/10">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-purple-600 flex items-center justify-center">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Billing history</h3>
                        <p className="text-sm text-teal-200">View past and current invoices</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-teal-800/10">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-pink-600 flex items-center justify-center">
                        <SettingsIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Preferences</h3>
                        <p className="text-sm text-teal-200">Manage billing information</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-teal-800/10">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-red-600 flex items-center justify-center">
                        <Sliders className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Usage limits</h3>
                        <p className="text-sm text-teal-200">Set monthly spend limits</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="payment-methods" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Manage your payment methods and auto-recharge settings.</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Payment methods content */}
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
                  {/* Billing history content */}
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
                  {/* Preferences content */}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  )
}

