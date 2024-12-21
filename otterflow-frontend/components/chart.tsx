import React from 'react'
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts'

interface ChartProps {
  data: any[]
  xAxis?: string
  yAxis?: string
}

export const LineChart: React.FC<ChartProps> = ({ data, xAxis, yAxis }) => (
  <ResponsiveContainer width="100%" height={300}>
    <RechartsLineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={xAxis} />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey={yAxis} stroke="#8884d8" />
    </RechartsLineChart>
  </ResponsiveContainer>
)

export const BarChart: React.FC<ChartProps> = ({ data, xAxis, yAxis }) => (
  <ResponsiveContainer width="100%" height={300}>
    <RechartsBarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={xAxis} />
      <YAxis />
      <Tooltip />
      <Bar dataKey={yAxis} fill="#8884d8" />
    </RechartsBarChart>
  </ResponsiveContainer>
)

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export const PieChart: React.FC<ChartProps> = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <RechartsPieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        outerRadius={80}
        fill="#8884d8"
        dataKey="value"
        label
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
    </RechartsPieChart>
  </ResponsiveContainer>
)

