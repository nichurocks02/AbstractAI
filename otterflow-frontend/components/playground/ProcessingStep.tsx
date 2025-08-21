import type React from "react"
import { motion } from "framer-motion"

interface ProcessingStepProps {
  step: string
  metrics?: any
}

const ProcessingStep: React.FC<ProcessingStepProps> = ({ step, metrics }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -20, height: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="bg-teal-500/20 border border-teal-500 rounded-lg p-3 text-teal-300 overflow-hidden"
    >
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="font-semibold mb-2"
      >
        {step}
      </motion.h3>
      {metrics && (
        <motion.pre
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xs whitespace-pre-wrap break-all bg-black/20 p-2 rounded"
        >
          {JSON.stringify(metrics, null, 2)}
        </motion.pre>
      )}
    </motion.div>
  )
}

export default ProcessingStep

