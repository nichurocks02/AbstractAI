"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Users, FileText, Mail, BarChart, LogOut } from "lucide-react"

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: FileText, label: "Query Logs", href: "/admin/query-logs" },
  { icon: Mail, label: "Email", href: "/admin/email" },
  { icon: BarChart, label: "Models", href: "/admin/models" },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/logout`, {
        method: "POST",
        credentials: "include",
        mode: 'cors'
      })
      if (res.ok) {
        // Clear any local states if needed
        router.push("/admin/login")
      } else {
        console.error("Logout failed")
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="w-64 bg-teal-800/50 backdrop-blur-md p-4 space-y-4">
      <div className="text-2xl font-bold text-teal-300">OtterFlow Admin</div>
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
              pathname === item.href ? "bg-teal-700/50 text-white" : "text-teal-200 hover:bg-teal-700/30"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="pt-4 mt-4 border-t border-teal-700">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 text-teal-200 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}


