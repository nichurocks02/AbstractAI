// app/admin/layout.tsx

"use client"

import { useEffect, useState } from "react"
import type React from "react"
import { usePathname, useRouter } from "next/navigation"
import { Sidebar } from "@/components/admin/Sidebar"
import { TopNav } from "@/components/admin/TopNav"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true) // for a loading spinner or text
  const [isAuth, setIsAuth] = useState(false)

  useEffect(() => {
    console.log("AdminLayout mounted. Checking route:", pathname)

    // If on login page, skip auth check
    if (pathname === "/admin/login") {
      setIsLoading(false)
      setIsAuth(false)
      return
    }

    // Make a call to verify session
    const verifySession = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/verify`, {
          method: "GET",
          credentials: "include", // Important to send cookies
          headers: {
            "Content-Type": "application/json",
          },
          mode: 'cors',
        })

        if (res.ok) {
          setIsAuth(true)
        } else {
          router.replace("/admin/login")
        }
      } catch (err) {
        console.error(err)
        router.replace("/admin/login")
      } finally {
        setIsLoading(false)
      }
    }

    verifySession()
  }, [pathname, router])

  // Show the raw login page if on /admin/login
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  // If we are still loading, show a spinner or some "Verifying..." text
  if (isLoading) {
    return <div className="p-6 text-white">Verifying admin session...</div>
  }

  // If not authenticated but we're done checking, show nothing or fallback
  if (!isAuth) {
    return null
  }

  // Otherwise, user is authenticated => show the layout
  return (
    <div className="flex h-screen bg-gradient-to-br from-teal-900 to-blue-900 text-white">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
