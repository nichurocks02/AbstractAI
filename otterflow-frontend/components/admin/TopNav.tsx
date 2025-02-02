
import { Bell } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function TopNav() {
  return (
    <div className="bg-teal-800/30 backdrop-blur-md p-4 flex justify-between items-center">
      <h1 className="text-xl font-semibold text-teal-100">Admin Portal</h1>
      <div className="flex items-center space-x-4">
        <button className="text-teal-200 hover:text-white transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        <Avatar>
          <AvatarImage src="/placeholder-avatar.jpg" alt="Admin" />
          <AvatarFallback>AD</AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
}


