'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Layout from '@/components/Layout'
import { toast } from 'react-toastify'

export default function UserSettings() {
  const [user, setUser] = useState<any>({
    name: '',
    email: '',
    avatar: '',
    auth_method: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [inAppNotifications, setInAppNotifications] = useState(true)
  const [dataRetention, setDataRetention] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/user`, {
          credentials: 'include',
        })

        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        } else {
          toast.error('Failed to fetch user data.')
        }
      } catch (error) {
        toast.error('Error fetching user data.')
        console.error('Fetch User Error:', error)
      }
    }

    fetchUser()
  }, [])

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      toast.error('Please select a file to upload.')
      return
    }

    const formData = new FormData()
    formData.append('file', avatarFile)

    try {
      setIsUploading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/upload-avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser(updatedUser)
        toast.success('Avatar updated successfully!')
      } else {
        toast.error('Failed to upload avatar. Please try again.')
      }
    } catch (error) {
      toast.error('Error uploading avatar.')
      console.error('Avatar Upload Error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/update-profile`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
        }),
      })

      if (response.ok) {
        toast.success('Profile updated successfully!')
      } else {
        toast.error('Failed to update profile. Please try again.')
      }
    } catch (error) {
      toast.error('Error updating profile.')
      console.error('Profile Update Error:', error)
    }
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">User Settings</h1>
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-teal-800/30">
          <TabsTrigger value="profile" className="data-[state=active]:bg-teal-700">Profile</TabsTrigger>
          {user.auth_method !== 'google' && (
            <TabsTrigger value="security" className="data-[state=active]:bg-teal-700">Security</TabsTrigger>
          )}
          <TabsTrigger value="notifications" className="data-[state=active]:bg-teal-700">Notifications</TabsTrigger>
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
                  <AvatarImage
                    src={
                      user.avatar
                        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/${user.avatar}`
                        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/default-avatar?name=${encodeURIComponent(user.name)}`
                    }
                  />
                  <AvatarFallback>{user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files ? e.target.files[0] : null)}
                    disabled={isUploading}
                  />
                  <Button
                    onClick={handleAvatarUpload}
                    disabled={!avatarFile || isUploading}
                    className="mt-2"
                  >
                    {isUploading ? 'Uploading...' : 'Change Avatar'}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                />
              </div>
              <Button
                className="bg-teal-600 hover:bg-teal-700 mt-4"
                onClick={handleSaveProfile}
              >
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {user.auth_method !== 'google' && (
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
                <Button>Update Password</Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

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
    </Layout>
  )
}
