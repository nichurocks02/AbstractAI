// Layout.tsx

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LayoutDashboard, Key, Gamepad2, Settings, Wallet, LogOut, Cog, Store } from 'lucide-react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, link: '/dashboard' },
  { id: 'api', label: 'API Access', icon: Key, link: '/api-access' },
  { id: 'playground', label: 'Playground', icon: Gamepad2, link: '/playground' },
  { id: 'model-settings', label: 'Model Settings', icon: Cog, link: '/model-settings' },
  { id: 'settings', label: 'User Settings', icon: Settings, link: '/user-settings' },
  { id: 'wallet', label: 'Wallet', icon: Wallet, link: '/wallet' },
  { id: 'store', label: 'Otter Store', icon: Store, link: '/store' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [avatarCacheBuster] = useState(() => Date.now())
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Fetch user data on component mount
    const fetchUser = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/user`, {
          credentials: 'include',
          mode: 'cors',
        })
        console.log('Cookies sent with request:', document.cookie); 

        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        } else {
          toast.error('Failed to fetch user data')
          console.error('Failed to fetch user data:', response.statusText)
        }
      } catch (error) {
        toast.error('Error fetching user data')
        console.error('Error fetching user data:', error)
      }
    }

    fetchUser()
  }, [])

  const handleLogout = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/logout`, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        setUser(null) // Clear user state
        toast.success('Successfully logged out!')
        router.push('/')
      } else {
        toast.error('Failed to logout. Please try again.')
        console.error('Logout failed:', response.statusText)
      }
    } catch (error) {
      toast.error('An error occurred during logout.')
      console.error('Error during logout:', error)
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-teal-900 to-blue-900 text-white">
      <motion.div
        className="bg-teal-800/50 backdrop-blur-md"
        initial={{ width: isOpen ? 240 : 80 }}
        animate={{ width: isOpen ? 240 : 80 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <motion.div
              initial={{ opacity: isOpen ? 1 : 0 }}
              animate={{ opacity: isOpen ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-2"
            >
              {user ? (
                <Avatar>
                  <AvatarImage
                    src={
                      user.avatar
                        // 2) Use the stable cacheBuster
                        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/${user.avatar}?t=${avatarCacheBuster}`
                        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/default-avatar?name=${encodeURIComponent(user.name || "")}&t=${avatarCacheBuster}`
                    }
                    alt={user.name || "User"}
                  />
                  <AvatarFallback>
                    {user.name
                      ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                      : 'U'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar>
                  <AvatarFallback>UN</AvatarFallback>
                </Avatar>
              )}
              {isOpen && <span className="text-sm font-medium">{user?.name || 'Loading...'}</span>}
            </motion.div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              className="text-white hover:bg-teal-700/50"
            >
              {isOpen ? <Key className="h-4 w-4" /> : <Key className="h-4 w-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1">
            {menuItems.map((item) => (
              <Link key={item.id} href={item.link}>
                <span
                  className={`flex items-center py-2 px-4 my-1 rounded-lg transition-colors cursor-pointer ${
                    pathname === item.link
                      ? 'bg-teal-700/50 text-white'
                      : 'text-teal-200 hover:bg-teal-700/30'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-2" />
                  <motion.span
                    initial={{ opacity: isOpen ? 1 : 0 }}
                    animate={{ opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.label}
                  </motion.span>
                </span>
              </Link>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="p-4">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-teal-200 hover:bg-teal-700/30 flex items-center"
            >
              <LogOut className="h-5 w-5 mr-2" />
              <motion.span
                initial={{ opacity: isOpen ? 1 : 0 }}
                animate={{ opacity: isOpen ? 1 : 0 }}
                transition={{ duration: 0.2 }}
              >
                Logout
              </motion.span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        {children}
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      </main>
    </div>
  )
}
