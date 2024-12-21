'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { ArrowRight, X } from 'lucide-react'
import AnimatedBackground from '@/components/AnimatedBackground'

const tutorialSteps = [
  {
    title: "Welcome to OtterFlow",
    description: "Let's take a quick tour of the key features that will help you optimize your AI development process.",
  },
  {
    title: "Intelligent Model Routing",
    description: "OtterFlow automatically selects the best LLM for each prompt, optimizing for cost, speed, and quality.",
  },
  {
    title: "Algorithmic Enhancements",
    description: "We incorporate advanced techniques like Chain of Thought and Mixture of Agents to improve performance.",
  },
  {
    title: "Local Model Utilization",
    description: "Deploy small, efficient models locally for fast and secure handling of prompts.",
  },
  {
    title: "Benchmarking & Caching",
    description: "We ensure consistent, high-quality responses and reduce latency by reusing previous outputs.",
  },
]

export default function OnboardingTutorial() {
  const [currentStep, setCurrentStep] = useState(0)
  const router = useRouter()

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSkip()
    }
  }

  const handleSkip = () => {
    // Navigate to the main dashboard or wherever you want users to go after onboarding
    router.push('/dashboard')
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-teal-900 to-blue-900 text-white relative overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white/10 backdrop-blur-md rounded-lg p-6 shadow-xl"
            >
              <h2 className="text-2xl font-bold mb-4 text-teal-300">
                {tutorialSteps[currentStep].title}
              </h2>
              <p className="text-teal-100 mb-6">
                {tutorialSteps[currentStep].description}
              </p>
              <div className="flex justify-between items-center">
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-teal-300 hover:text-teal-100 hover:bg-teal-800/50"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {currentStep < tutorialSteps.length - 1 ? (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    "Finish"
                  )}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="mt-4 flex justify-center">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full mx-1 ${
                  index === currentStep ? 'bg-teal-400' : 'bg-teal-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-teal-300 hover:text-teal-100 hover:bg-teal-800/50"
        onClick={handleSkip}
      >
        <X className="h-6 w-6" />
        <span className="sr-only">Close tutorial</span>
      </Button>
    </div>
  )
}

