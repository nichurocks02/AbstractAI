import type React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ChevronDown, ChevronRight } from "lucide-react"
import Image from "next/image"

interface Model {
  id: string
  name: string
  description: string
  temperature: number
  top_p: number
  isIncluded: boolean
}

interface CategorySectionProps {
  category: string
  models: Model[]
  isExpanded: boolean
  onToggle: () => void
  onModelToggle: (modelId: string) => void
  onModelClick: (model: Model) => void
  categoryImage: string
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  models,
  isExpanded,
  onToggle,
  onModelToggle,
  onModelClick,
  categoryImage,
}) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="cursor-pointer flex flex-row items-center" onClick={onToggle}>
        <div className="flex items-center flex-1">
          <Image
            src={categoryImage || "/placeholder.svg"}
            alt={`${category} logo`}
            width={32}
            height={32}
            className="mr-4"
          />
          <CardTitle>{category}</CardTitle>
        </div>
        {isExpanded ? <ChevronDown className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
      </CardHeader>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((model) => (
                <Card
                  key={model.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow duration-300"
                  onClick={() => onModelClick(model)}
                >
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{model.name}</span>
                      <Switch
                        checked={model.isIncluded}
                        onCheckedChange={() => onModelToggle(model.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{model.description}</p>
                    <Label className="flex items-center space-x-2 mt-2">
                      <span>Include in OtterFlow</span>
                    </Label>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export default CategorySection

