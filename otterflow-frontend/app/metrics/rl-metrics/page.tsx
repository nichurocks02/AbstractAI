"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Layout from "@/components/Layout";
import Link from "next/link";
import { ArrowLeft } from "lucide-react"; // Import the back arrow icon

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface RLMetrics {
  model_name: string;
  domain_label: string;
  cumulative_reward: number;
  count: number;
  average_reward: number;
  updated_at: string;
}

export default function RLMetricsPage() {
  const [rlMetrics, setRLMetrics] = useState<RLMetrics[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  useEffect(() => {
    async function fetchRLMetrics() {
      try {
        const response = await fetch(`${API_URL}/rl-metrics/logs`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch RL metrics");
        }
        const data = await response.json();
        setRLMetrics(data.rl_metrics);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    fetchRLMetrics();
  }, []);

  if (loading) {
    return (
      <Layout>
        <h1 className="text-3xl font-bold mb-6">Loading RL Metrics...</h1>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <h1 className="text-3xl font-bold mb-6">Error: {error.message}</h1>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Back Button with Arrow */}
      <motion.div className="flex items-center space-x-2 mb-4" variants={itemVariants}>
        <motion.button
          onClick={() => (window.location.href = "/metrics")}
          className="hover:opacity-75 flex items-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="h-6 w-6 mr-2" />
          <span className="text-lg font-semibold">Back to Metrics</span>
        </motion.button>
      </motion.div>

      <h1 className="text-3xl font-bold mb-2">Reinforcement Learning Metrics</h1>

      {/* Link to RL Explainer Page */}
      <Link href="/rl-explainer">
        <span className="text-teal-600 hover:text-teal-800 underline mb-6 inline-block">
          Learn how our RL system works
        </span>
      </Link>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>RL Metrics Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Cumulative Reward</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Average Reward</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rlMetrics.map((stat) => (
                <TableRow key={`${stat.model_name}-${stat.domain_label}`}>
                  <TableCell>{stat.model_name}</TableCell>
                  <TableCell>{stat.domain_label}</TableCell>
                  <TableCell>{stat.cumulative_reward}</TableCell>
                  <TableCell>{stat.count}</TableCell>
                  <TableCell>{stat.average_reward.toFixed(2)}</TableCell>
                  <TableCell>{new Date(stat.updated_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  );
}
