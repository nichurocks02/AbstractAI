"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LineChart, PieChart } from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Layout from "@/components/Layout";

// Define interfaces for the metrics
interface ConfigurationImpact {
  setting: string;
  avgCost: number;
  avgLatency: number;
}

// Define interfaces for the overall metrics if needed
interface Metrics {
  model_usage_distribution: any[]; // Adjust types as needed
  daily_model_cost: any[];
  model_performance: any[];
  performance_scores: any[];
  configuration_impact: ConfigurationImpact[];
}

// You can define the API URL here or load it from an environment variable:

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
export default function ModelLogsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch metrics from the backend API on component mount.
  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch(`${API_URL}/metrics/model_logs`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.statusText}`);
        }
        const data: Metrics = await response.json();
        setMetrics(data);
      } catch (err: any) {
        console.error("Error fetching metrics:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <Layout>
        <h1 className="text-3xl font-bold mb-6">Loading Metrics...</h1>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <h1 className="text-3xl font-bold mb-6">
          Error loading metrics: {error.message}
        </h1>
      </Layout>
    );
  }

  // Destructure the metrics returned from the backend API.
  const {
    model_usage_distribution,
    daily_model_cost,
    model_performance,
    performance_scores,
    configuration_impact,
  } = metrics!;

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Model Logs</h1>

      {/* Top row of charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Model Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={model_usage_distribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Performance (Accuracy)</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={model_performance} xAxis="name" yAxis="accuracy" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Model Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={daily_model_cost} xAxis="name" yAxis="cost" />
          </CardContent>
        </Card>
      </div>

      {/* Second row of charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Model Usage Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={model_usage_distribution} xAxis="name" yAxis="queries" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost Efficiency per Model</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={model_performance} xAxis="name" yAxis="costEfficiency" />
          </CardContent>
        </Card>
      </div>

      {/* Performance Scores Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Performance Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Math Score</TableHead>
                <TableHead>Coding Score</TableHead>
                <TableHead>General Knowledge Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performance_scores.map((score: any) => (
                <TableRow key={score.name}>
                  <TableCell>{score.name}</TableCell>
                  <TableCell>{score.math}</TableCell>
                  <TableCell>{score.coding}</TableCell>
                  <TableCell>{score.generalKnowledge}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Configuration Impact Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setting</TableHead>
                <TableHead>Average Cost</TableHead>
                <TableHead>Average Latency (ms)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configuration_impact.map((config: ConfigurationImpact) => (
                <TableRow key={config.setting}>
                  <TableCell>{config.setting}</TableCell>
                  <TableCell>${config.avgCost.toFixed(7)}</TableCell>
                  <TableCell>{config.avgLatency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  );
}
