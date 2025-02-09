import type React from "react"
import { motion } from "framer-motion"

const BrainThinkingAnimation: React.FC = () => {
  return (
    <motion.div
      className="flex items-center justify-center w-12 h-12 bg-teal-500 rounded-full"
      animate={{
        scale: [1, 1.2, 1],
        rotate: [0, 360],
        borderRadius: ["50%", "30%", "50%"],
      }}
      transition={{
        duration: 2,
        ease: "easeInOut",
        times: [0, 0.5, 1],
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6 text-white"
        animate={{
          scale: [1, 0.8, 1],
          rotate: [0, -180, 0],
        }}
        transition={{
          duration: 2,
          ease: "easeInOut",
          times: [0, 0.5, 1],
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        <path d="M21.5 16.5V8a2 2 0 0 0-2-2h-3.9a5.5 5.5 0 0 0-10.2 0H2a2 2 0 0 0-2 2v8.5" />
        <path d="M5.5 14.5v-6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6" />
        <path d="M5.5 14.5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2" />
        <path d="M8.5 10.5v4" />
        <path d="M15.5 10.5v4" />
        <path d="M12 10.5v4" />
      </motion.svg>
    </motion.div>
  )
}

export default BrainThinkingAnimation

