'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LayoutDashboard, Key, Gamepad2, Settings, Wallet, LogOut, Cog } from 'lucide-react'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, link: '/dashboard' },
  { id: 'api', label: 'API Access', icon: Key, link: '/api-access' },
  { id: 'playground', label: 'Playground', icon: Gamepad2, link: '/playground' },
  { id: 'model-settings', label: 'Model Settings', icon: Cog, link: '/model-settings' },
  { id: 'settings', label: 'User Settings', icon: Settings, link: '/user-settings' },
  { id: 'wallet', label: 'Wallet', icon: Wallet, link: '/wallet' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-gradient-to-br from-teal-900 to-blue-900 text-white">
      <motion.div
        className="bg-teal-800/50 backdrop-blur-md"
        initial={{ width: isOpen ? 240 : 80 }}
        animate={{ width: isOpen ? 240 : 80 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4">
            <motion.div
              initial={{ opacity: isOpen ? 1 : 0 }}
              animate={{ opacity: isOpen ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-2"
            >
              <Avatar>
                <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                <AvatarFallback>UN</AvatarFallback>
              </Avatar>
              {isOpen && <span className="text-sm font-medium">User Name</span>}
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
          <nav className="flex-1">
            {menuItems.map((item) => (
              <Link key={item.id} href={item.link}>
                <span
                  className={`flex items-center py-2 px-4 my-1 rounded-lg transition-colors ${
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
          <div className="p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-teal-200 hover:bg-teal-700/30"
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
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}

