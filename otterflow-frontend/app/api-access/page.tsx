'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Key, Trash } from 'lucide-react'
import Layout from '@/components/Layout'
import { toast } from 'react-toastify'

interface ApiKey {
  key: string
  api_name: string
  is_active: boolean
  created_at: string
}

export default function APIAccess() {
  const router = useRouter()

  // 1) User authentication states
  const [user, setUser] = useState<any>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  // 2) API key states
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loadingKeys, setLoadingKeys] = useState(false)
  const [newApiName, setNewApiName] = useState('')

  // Fetch user on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/user`, {
          credentials: 'include',
        })
        if (!res.ok) {
          throw new Error('Not authenticated')
        }
        const data = await res.json()
        setUser(data)
      } catch (error) {
        router.replace('/auth')
      } finally {
        setLoadingUser(false)
      }
    }
    fetchUser()
  }, [router])

  // Once we know user is authenticated, load API keys
  useEffect(() => {
    if (!loadingUser && user) {
      loadApiKeys()
    }
  }, [loadingUser, user])

  // 3) Fetch API keys
  const loadApiKeys = async () => {
    try {
      setLoadingKeys(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api-key/list`, {
        credentials: 'include',
      })
      if (response.status === 404) {
        setApiKeys([])
      } else if (response.ok) {
        const data = await response.json()
        setApiKeys(data.api_keys)
      } else {
        const errData = await response.json()
        toast.error(errData.detail || 'Failed to load API keys.')
      }
    } catch (error) {
      console.error('Error loading API keys:', error)
      toast.error('An error occurred while loading API keys.')
    } finally {
      setLoadingKeys(false)
    }
  }

  const handleGenerateNewKey = async () => {
    if (!newApiName.trim()) {
      toast.error('Please enter a name for the API key.')
      return
    }
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api-key/generate_api_key`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_name: newApiName }),
      })
      if (response.ok) {
        toast.success(`API Key "${newApiName}" created successfully!`)
        loadApiKeys()
        setNewApiName('')
      } else {
        const errData = await response.json()
        toast.error(errData.detail || 'Failed to generate new API key.')
      }
    } catch (error) {
      console.error('Error generating API key:', error)
      toast.error('An error occurred while generating API key.')
    }
  }

  const handleDeleteKey = async (apiName: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api-key/${apiName}/delete`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.ok) {
        toast.success(`API Key "${apiName}" deleted.`)
        setApiKeys((prev) => prev.filter((k) => k.api_name !== apiName))
      } else {
        const errData = await response.json()
        toast.error(errData.detail || 'Failed to delete API key.')
      }
    } catch (error) {
      console.error('Error deleting API key:', error)
      toast.error('An error occurred while deleting API key.')
    }
  }

  if (loadingUser) {
    return (
      <Layout>
        <p>Loading user data...</p>
      </Layout>
    )
  }
  if (!user) {
    return (
      <Layout>
        <p>Redirecting to Login...</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">API Access</h1>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingKeys ? (
              <p>Loading API keys...</p>
            ) : apiKeys.length === 0 ? (
              <p>No API keys found.</p>
            ) : (
              apiKeys.map((apiKeyObj) => (
                <div
                  key={apiKeyObj.api_name}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div>
                    <div className="font-mono">{apiKeyObj.key}</div>
                    <div className="text-sm text-gray-500">
                      Name: <strong>{apiKeyObj.api_name}</strong> | Created on{' '}
                      {new Date(apiKeyObj.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigator.clipboard.writeText(apiKeyObj.key)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteKey(apiKeyObj.api_name)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex items-center space-x-2">
            <Input
              placeholder="Enter API name"
              value={newApiName}
              onChange={(e) => setNewApiName(e.target.value)}
            />
            <Button onClick={handleGenerateNewKey}>
              <Key className="mr-2 h-4 w-4" />
              Generate New API Key
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integration Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            To explore our full documentation, please visit{' '}
            <a
              href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/docs`} 
              className="text-blue-500 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              our API Docs
            </a>.
          </p>
          <Tabs defaultValue="python">
            <TabsList>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>
            <TabsContent value="python" className="mt-4">
              <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm text-white">
                {`import requests

api_url = "https://otterflow.in/api/chat/completion"
api_key = "YOUR_API_KEY_HERE"

payload = {
  "api_key": api_key,
  "user_query": "Hello, how is life?",
  "mode": "auto",
  "cost_priority": 5,
  "accuracy_priority": 5,
  "latency_priority": 2,
  "cost_max": 0.3,
  "perf_min": 50,
  "lat_max": 3
}

response = requests.post(api_url, json=payload)
print(response.json())`}
              </pre>
            </TabsContent>
            <TabsContent value="javascript" className="mt-4">
              <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm text-white">
                {`const apiUrl = "https://otterflow.in/api/chat/completion";
const apiKey = "YOUR_API_KEY_HERE";

const payload = {
  api_key: apiKey,
  user_query: "Hello, how is life?",
  mode: "auto",
  cost_priority: 5,
  accuracy_priority: 5,
  latency_priority: 2,
  cost_max: 0.3,
  perf_min: 50,
  lat_max: 3
};

fetch(apiUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error('Error:', err));
`}
              </pre>
            </TabsContent>
            <TabsContent value="curl" className="mt-4">
              <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm text-white">
                {`curl -X POST "https://otterflow.in/api/chat/completion" \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "YOUR_API_KEY_HERE",
    "user_query": "Hello, how is life?",
    "mode": "auto",
    "cost_priority": 5,
    "accuracy_priority": 5,
    "latency_priority": 2,
    "cost_max": 0.3,
    "perf_min": 50,
    "lat_max": 3
  }'
`}
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </Layout>
  )
}
