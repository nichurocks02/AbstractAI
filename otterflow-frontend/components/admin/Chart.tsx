// components/admin/Chart.tsx

import React from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface ChartProps {
  type: "line" // You can extend this if you have multiple chart types
  data: {
    name: string
    value: number
  }[]
}

export const Chart: React.FC<ChartProps> = ({ type, data }) => {
  if (type === "line") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#38bdf8" />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  // Handle other chart types if necessary
  return null
}
