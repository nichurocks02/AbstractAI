import type React from "react"
import { motion, AnimatePresence } from "framer-motion"

interface AnimatedModelNameProps {
  modelName: string | null
}

const AnimatedModelName: React.FC<AnimatedModelNameProps> = ({ modelName }) => {
  return (
    <AnimatePresence mode="wait">
      {modelName && (
        <motion.div
          key={modelName}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="absolute top-4 right-4 bg-gradient-to-r from-teal-500 to-blue-500 text-white px-4 py-2 rounded-full shadow-lg"
        >
          <motion.span
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 120 }}
          >
            Model: {modelName}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AnimatedModelName

