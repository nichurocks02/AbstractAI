"use client"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, PieChart, Activity, BrainCircuitIcon } from "lucide-react"
import Link from "next/link"
import Layout from "@/components/Layout"

const metrics = [
  {
    title: "Query Logs",
    icon: BarChart,
    description: "View detailed logs of all queries",
    link: "/metrics/query-logs",
  },
  {
    title: "Model Logs",
    icon: PieChart,
    description: "Analyze model usage and performance",
    link: "/metrics/model-logs",
  },
  {
    title: "Cache Logs",
    icon: Activity,
    description: "Monitor cache performance and hits",
    link: "/metrics/cache-logs",
  },
  {
    title: "RL Metrics",
    icon: BrainCircuitIcon,
    description: "Monitor reinforcement learning performance",
    link: "/metrics/rl-metrics",
  }
]

export default function MetricsPage() {
  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Metrics Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Link href={metric.link}>
              <Card
                // Conditionally add "blur-sm" and "hover:blur-none" for Cache Logs
                className={`hover:shadow-lg transition-shadow duration-300 cursor-pointer ${
                  metric.title === "Cache Logs" ? "blur-sm hover:blur-none" : ""
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-2xl font-bold">{metric.title}</CardTitle>
                  <metric.icon className="h-8 w-8 text-teal-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{metric.description}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </Layout>
  )
}
