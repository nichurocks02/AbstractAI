'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft, X } from 'lucide-react'
import AnimatedBackground from '@/components/AnimatedBackground'

// Updated tutorial steps with emojis and revised text
const tutorialSteps = [
  {
    title: "🚀 Welcome to OtterFlow",
    description:
      "Welcome! OtterFlow streamlines your AI development by intelligently routing your queries and optimizing performance. Let's begin the tour.",
  },
  {
    title: "🤖 Intelligent Model Routing",
    description:
      "Our system uses reinforcement learning to select the best model for your prompt—balancing cost, speed, and quality.",
  },
  {
    title: "🎯 Bandit-Based Optimization",
    description:
      "We employ a multi-armed bandit algorithm that continuously learns from your feedback, refining its choices over time.",
  },
  {
    title: "⏱ Benchmarking & Caching",
    description:
      "By benchmarking performance and caching responses, OtterFlow ensures fast, reliable, and high-quality outputs.",
  },
  {
    title: "✨ Get Started & Explore",
    description:
      "You're all set! Dive into OtterFlow to experience intelligent routing and continuous improvement. Enjoy your journey!",
  },
]

// Framer Motion container variants for staggering children animations
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.2,
    },
  },
}

// Item variants for each flash card (step)
const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
}

export default function OnboardingTutorial() {
  const [currentStep, setCurrentStep] = useState(0)
  const router = useRouter()

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleFinish()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFinish = () => {
    // Navigate to the main dashboard or authentication page after onboarding
    router.push('/auth')
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
                {/* Previous Button */}
                <Button
                  variant="ghost"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="bg-teal-600 hover:bg-teal-700 text-white flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                {/* Skip Button and Next/Finish Button grouped together */}
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    onClick={handleFinish}
                    className="text-teal-300 hover:text-teal-100 hover:bg-teal-800/50"
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="bg-teal-600 hover:bg-teal-700 text-white flex items-center"
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
        onClick={handleFinish}
      >
        <X className="h-6 w-6" />
        <span className="sr-only">Close tutorial</span>
      </Button>
    </div>
  )
}
