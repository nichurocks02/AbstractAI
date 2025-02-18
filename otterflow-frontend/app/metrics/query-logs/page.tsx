"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, PieChart } from "@/components/ui/chart";
import Layout from "@/components/Layout";

// Change API_URL if needed (or load it from an environment variable)
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
export default function QueryLogsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      let url = `${API_URL}/query_log/logs`;
      const params = [];
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      if (params.length > 0) url += "?" + params.join("&");

      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Failed to fetch query logs: ${response.statusText}`);
      }
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when the component mounts
  useEffect(() => {
    fetchData();
  }, []);

  const applyFilter = () => {
    setLoading(true);
    fetchData();
  };

  if (loading) {
    return (
      <Layout>
        <h1 className="text-3xl font-bold mb-6">Loading Query Logs...</h1>
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

  // Destructure the data from the backend response.
  const { logs, daily_query_data, model_usage_data } = data;

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">Query Logs</h1>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Logs</CardTitle>
        </CardHeader>
        <CardContent className="flex space-x-4">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
          />
          <Button onClick={applyFilter}>Apply Filter</Button>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={daily_query_data} xAxis="name" yAxis="queries" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Model Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart data={model_usage_data} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Query Log Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Query</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.timestamp}</TableCell>
                  <TableCell>{log.user}</TableCell>
                  <TableCell>{log.query}</TableCell>
                  <TableCell>{log.llm_response}</TableCell>
                  <TableCell>{log.model}</TableCell>
                  <TableCell>{log.tokens}</TableCell>
                  <TableCell>${log.cost.toFixed(7)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  );
}
