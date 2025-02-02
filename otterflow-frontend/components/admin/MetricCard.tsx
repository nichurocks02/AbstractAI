import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Search, DollarSign, UserPlus } from "lucide-react"

const icons = {
  Users,
  Search,
  DollarSign,
  UserPlus,
}

interface MetricCardProps {
  title: string
  value: string
  icon: keyof typeof icons
}

export function MetricCard({ title, value, icon }: MetricCardProps) {
  const Icon = icons[icon]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-teal-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}


