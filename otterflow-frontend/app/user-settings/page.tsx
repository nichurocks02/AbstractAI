"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { toast } from "react-toastify";

interface User {
  name: string;
  email: string;
  avatar: string;
  auth_method: string;
}

export default function UserSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/user`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user data.");
        }

        const userData: User = await response.json();
        setUser(userData);
      } catch (error) {
        toast.error("Error fetching user data.");
        console.error("Fetch User Error:", error instanceof Error ? error.message : error);
      }
    };

    fetchUser();
  }, []);

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      toast.error("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", avatarFile);

    try {
      setIsUploading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/upload-avatar`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload avatar.");
      }

      const updatedUser: User = await response.json();

      // ✅ Fixed: Explicitly typed `prev` as `User | null`
      setUser((prev: User | null) => (prev ? { ...prev, ...updatedUser } : updatedUser));

      toast.success("Avatar updated successfully!");
    } catch (error) {
      toast.error("Error uploading avatar.");
      console.error("Avatar Upload Error:", error instanceof Error ? error.message : error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/update-profile`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile.");
      }

      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Error updating profile.");
      console.error("Profile Update Error:", error instanceof Error ? error.message : error);
    }
  };

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">User Settings</h1>
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-teal-800/30">
          <TabsTrigger value="profile" className="data-[state=active]:bg-teal-700">
            Profile
          </TabsTrigger>
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
                      user?.avatar
                        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/${user.avatar}?t=${new Date().getTime()}`
                        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/default-avatar?name=${encodeURIComponent(
                            user?.name || "User"
                          )}&t=${new Date().getTime()}`
                    }
                  />
                  <AvatarFallback>
                    {user?.name
                      ? user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files ? e.target.files[0] : null)}
                    disabled={isUploading}
                  />
                  <Button onClick={handleAvatarUpload} disabled={!avatarFile || isUploading} className="mt-2">
                    {isUploading ? "Uploading..." : "Change Avatar"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={user?.name || ""}
                  onChange={(e) => setUser((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email || ""} readOnly={true} />
              </div>
              <Button className="bg-teal-600 hover:bg-teal-700 mt-4" onClick={handleSaveProfile}>
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
