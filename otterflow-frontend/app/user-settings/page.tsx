'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Layout from '@/components/Layout'

export default function UserSettings() {
  const [name, setName] = useState('User Name')
  const [email, setEmail] = useState('user@example.com')
  const [avatarUrl, setAvatarUrl] = useState('/placeholder-avatar.jpg')
  const [twoFactor, setTwoFactor] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [inAppNotifications, setInAppNotifications] = useState(true)
  const [apiUsageLimit, setApiUsageLimit] = useState(1000)
  const [dataRetention, setDataRetention] = useState(true)

  const handleSave = () => {
    console.log('Saving user settings:', { name, email, avatarUrl, twoFactor, emailNotifications, inAppNotifications, apiUsageLimit, dataRetention })
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">User Settings</h1>
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-teal-800/30">
          <TabsTrigger value="profile" className="data-[state=active]:bg-teal-700">Profile</TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-teal-700">Security</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-teal-700">Notifications</TabsTrigger>
          <TabsTrigger value="api" className="data-[state=active]:bg-teal-700">API Usage</TabsTrigger>
          <TabsTrigger value="privacy" className="data-[state=active]:bg-teal-700">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl} alt={name} />
                  <AvatarFallback>{name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                </Avatar>
                <Button variant="outline">Change Avatar</Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Password Management</CardTitle>
              <CardDescription>Update your password and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="two-factor"
                  checked={twoFactor}
                  onCheckedChange={setTwoFactor}
                />
                <Label htmlFor="two-factor">Enable Two-Factor Authentication</Label>
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage your notification settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
                <Label htmlFor="email-notifications">Receive Email Notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="in-app-notifications"
                  checked={inAppNotifications}
                  onCheckedChange={setInAppNotifications}
                />
                <Label htmlFor="in-app-notifications">Receive In-App Notifications</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Usage Limits</CardTitle>
              <CardDescription>Set custom limits to prevent unexpected overages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-limit">API Call Limit (per day)</Label>
                <div className="flex items-center space-x-4">
                  <Slider
                    id="api-limit"
                    min={100}
                    max={10000}
                    step={100}
                    value={[apiUsageLimit]}
                    onValueChange={(value) => setApiUsageLimit(value[0])}
                    className="flex-grow"
                  />
                  <span className="font-bold">{apiUsageLimit}</span>
                </div>
              </div>
              <Button>Update API Limit</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Data Privacy Settings</CardTitle>
              <CardDescription>Manage your data handling preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="data-retention"
                  checked={dataRetention}
                  onCheckedChange={setDataRetention}
                />
                <Label htmlFor="data-retention">Allow data retention for improving services</Label>
              </div>
              <p className="text-sm text-teal-300">
                We comply with GDPR, CCPA, and other applicable data protection regulations.
              </p>
              <Button variant="outline">Request Data Export</Button>
              <Button variant="destructive">Delete Account</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="mt-6">
        <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">Save All Changes</Button>
      </div>
    </Layout>
  )
}

