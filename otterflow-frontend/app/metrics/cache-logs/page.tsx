"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LineChart, PieChart } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";

export default function CacheLogsPage() {
  // Mock data for charts
  const cacheHitRateData = [
    { name: "Jun 1", hitRate: 75 },
    { name: "Jun 2", hitRate: 80 },
    { name: "Jun 3", hitRate: 78 },
    { name: "Jun 4", hitRate: 82 },
    { name: "Jun 5", hitRate: 85 },
  ];

  const cacheSizeData = [
    { name: "Jun 1", size: 100 },
    { name: "Jun 2", size: 120 },
    { name: "Jun 3", size: 115 },
    { name: "Jun 4", size: 130 },
    { name: "Jun 5", size: 140 },
  ];

  const cacheTypeData = [
    { name: "In-Memory", value: 60 },
    { name: "Redis", value: 30 },
    { name: "File System", value: 10 },
  ];

  const cacheMissesEvictionsData = [
    { name: "Jun 1", misses: 50, evictions: 20 },
    { name: "Jun 2", misses: 45, evictions: 25 },
    { name: "Jun 3", misses: 55, evictions: 18 },
    { name: "Jun 4", misses: 40, evictions: 22 },
    { name: "Jun 5", misses: 48, evictions: 30 },
  ];

  // Mock data for new metrics
  const cacheHitRatio = 82.5;
  const avgCacheResponseTime = 15; // ms

  return (
    <>
      {/* The main page content wrapped in Layout.
          Apply the blur effect with Tailwind’s filter utility.
          We use "filter blur-sm" so the entire content appears slightly blurred. */}
      <Layout>
        <div className="filter blur-sm">
          <h1 className="text-3xl font-bold mb-6">Cache Logs</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Cache Hit Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChart data={cacheHitRateData} xAxis="name" yAxis="hitRate" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cache Size Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart data={cacheSizeData} xAxis="name" yAxis="size" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cache Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart data={cacheTypeData} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Cache Hit Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">{cacheHitRatio}%</div>
                <Progress value={cacheHitRatio} className="w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Average Cache Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgCacheResponseTime} ms</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cache Misses and Evictions</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart data={cacheMissesEvictionsData} xAxis="name" />
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>

      {/* Modal overlay outside of Layout so it sits on top of the page */}
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
        <div className="bg-white rounded-lg p-6 shadow-lg text-center max-w-md mx-4">
          <h2 className="text-2xl font-bold mb-4">🚀 Upgrade to Enterprise! 💎</h2>
          <p className="mb-4">
            Please upgrade to the enterprise version to access the caching mechanism and cache metrics!
          </p>
          
        </div>
      </div>
    </>
  );
}
