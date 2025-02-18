"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import {
  BrainCircuitIcon,
  LightbulbIcon,
  RocketIcon,
  Repeat2Icon,
  ArrowLeft,
} from "lucide-react";

const steps = [
  {
    title: "Initialization",
    description:
      "The system identifies available models and domains, creating bandit stats with zero or minimal prior knowledge.",
    icon: BrainCircuitIcon,
  },
  {
    title: "Model Selection",
    description:
      "When a user makes a query, the bandit algorithm chooses which model to use based on cumulative reward and exploration strategy.",
    icon: LightbulbIcon,
  },
  {
    title: "User Feedback",
    description:
      "The system captures user feedback implicitly (e.g., tokens used, cost).",
    icon: RocketIcon,
  },
  {
    title: "Update Bandit Stats",
    description:
      "Reinforcement learning updates each model's cumulative reward and count, refining future choices.",
    icon: Repeat2Icon,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { when: "beforeChildren", staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function RLExplainerPage() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <Layout>
      <motion.div
        className="space-y-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header with Back Arrow and Title */}
        <motion.div className="flex items-center space-x-2" variants={itemVariants}>
          <motion.button
            onClick={() => (window.location.href = "/metrics/rl-metrics")}
            className="hover:opacity-75"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="h-6 w-6" />
          </motion.button>
          <h1 className="text-3xl font-bold">
            How Reinforcement Learning Works Here
          </h1>
        </motion.div>

        {/* Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                variants={itemVariants}
                whileHover={{ scale: 1.03, boxShadow: "0px 5px 15px rgba(0,0,0,0.1)" }}
                whileTap={{ scale: 0.98 }}
                className={`cursor-pointer ${
                  activeStep === index ? "ring-2 ring-teal-500" : ""
                }`}
                onClick={() => setActiveStep(index)}
              >
                <Card className="h-full">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <Icon className="h-8 w-8 text-teal-500 mr-3" />
                    <CardTitle>{`${index + 1}. ${step.title}`}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Detailed Explanation Card */}
        <motion.div variants={itemVariants} className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Explanation</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Container with fixed minHeight to avoid collapse during animation */}
              <div style={{ minHeight: "150px" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-xl font-semibold mb-2">
                      {steps[activeStep].title}
                    </h3>
                    <p className="text-muted-foreground">
                      {steps[activeStep].description}
                    </p>
                    {activeStep === 0 && (
                      <ul className="list-disc list-inside mt-4">
                        <li>
                          System scans available AI models and their capabilities
                        </li>
                        <li>
                          Creates initial statistics for each model with minimal assumptions
                        </li>
                        <li>Prepares the exploration-exploitation strategy</li>
                      </ul>
                    )}
                    {activeStep === 1 && (
                      <ul className="list-disc list-inside mt-4">
                        <li>Analyzes user query and required capabilities</li>
                        <li>
                          Balances between exploring new models and exploiting known performers
                        </li>
                        <li>
                          Selects the most promising model based on current knowledge
                        </li>
                      </ul>
                    )}
                    {activeStep === 2 && (
                      <ul className="list-disc list-inside mt-4">
                        <li>
                          Monitors implicit feedback: response time, token usage, etc.
                        </li>
                        <li>Collects explicit feedback if available (e.g., user ratings)</li>
                        <li>Prepares feedback data for the learning algorithm</li>
                      </ul>
                    )}
                    {activeStep === 3 && (
                      <ul className="list-disc list-inside mt-4">
                        <li>Processes feedback to calculate rewards</li>
                        <li>
                          Updates the selected model's statistics (e.g., average reward, usage count)
                        </li>
                        <li>
                          Adjusts the exploration-exploitation balance based on new information
                        </li>
                      </ul>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
