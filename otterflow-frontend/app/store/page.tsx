'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import Layout from '@/components/Layout'

export default function StorePage() {
  return (
    <Layout>
      {/* Background with floating particles */}
      <div className="relative min-h-[80vh] p-8">
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Main card with well-defined boundary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-3xl border border-white/20 backdrop-blur-md shadow-2xl"
        >
          {/* Animated gradient background */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-teal-200 via-blue-300 to-purple-300"
            animate={{
              background: [
                'linear-gradient(to bottom right, rgb(153 246 228), rgb(147 197 253), rgb(216 180 254))',
                'linear-gradient(to bottom right, rgb(147 197 253), rgb(216 180 254), rgb(153 246 228))',
                'linear-gradient(to bottom right, rgb(216 180 254), rgb(153 246 228), rgb(147 197 253))',
              ],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />

          {/* Floating circles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/20 backdrop-blur-sm"
              style={{
                width: Math.random() * 100 + 20,
                height: Math.random() * 100 + 20,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: Math.random() * 5 + 3,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          ))}

          {/* Content container */}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
            {/* Logo and Mascot */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
              className="mb-8"
            >
              <div className="relative w-32 h-32 rounded-full bg-white/20 backdrop-blur-md p-2">
                <Image
                  src="/images/otter-character.png"           // <-- Use your local file here
                  alt="OtterFlow mascot"
                  fill
                  className="object-contain p-2"
                />
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl md:text-7xl font-bold mb-6 text-white drop-shadow-lg"
            >
              Otter Store
            </motion.h1>

            {/* Subtitle */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl md:text-4xl font-light text-white/90 mb-8"
            >
              Coming Soon
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-xl text-white/80 max-w-2xl mb-12"
            >
              Your one-stop destination for AI agents, plugins, and tools.
              Revolutionize your workflow with our curated collection of intelligent assistants.
            </motion.p>

            {/* Notification form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto"
            >
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button className="px-8 py-3 rounded-full bg-white text-teal-600 font-semibold hover:bg-white/90 transition-colors">
                Notify Me
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}
