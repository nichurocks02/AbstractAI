// hooks/useAuth.ts

import { useState, useEffect } from 'react'

interface User {
  id: number
  email: string
  name: string
}

interface AuthState {
  user: User | null
  loading: boolean
}

export default function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${backendUrl}/auth/user`, {
          method: 'GET',
          credentials: 'include', // Include cookies
          mode: 'cors',
        })
        console.log('Cookies sent with request:', document.cookie); 

        if (response.ok) {
          const data: User = await response.json()
          setUser(data)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return { user, loading }
}
