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
          // If /auth/user is not found (404) or unauthorized (401),
          // the user is not authenticated
          throw new Error('Not authenticated')
        }
        const data = await res.json()
        setUser(data)
      } catch (error) {
        // Redirect to /auth or show a message if you prefer
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
        // No API keys found; treat as empty
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
        const data = await response.json()
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

  // Delete the key permanently
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

  // 4) Handle loading or unauthenticated states
  if (loadingUser) {
    return <Layout><p>Loading user data...</p></Layout>
  }
  // If user is null, we likely are already redirecting in the fetchUser catch block
  // but let's handle if user is forcibly set to null for any reason
  if (!user) {
    return <Layout><p>Redirecting to Login...</p></Layout>
  }

  // 5) If we got here, user is authenticated
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

      <Card>
        <CardHeader>
          <CardTitle>Integration Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="python">
            <TabsList>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>
            <TabsContent value="python" className="mt-4">
              <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                <code className="text-sm text-white">
                  {`import requests

api_key = "YOUR_API_KEY"
url = "https://api.otterflow.com/v1/process"

payload = {
    "prompt": "Translate the following English text to French: 'Hello, world!'",
    "max_tokens": 60
}

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`}
                </code>
              </pre>
            </TabsContent>
            <TabsContent value="javascript" className="mt-4">
              <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                <code className="text-sm text-white">
                  {`const apiKey = 'YOUR_API_KEY';
const url = 'https://api.otterflow.com/v1/process';

const payload = {
  prompt: "Translate the following English text to French: 'Hello, world!'",
  max_tokens: 60
};

fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${apiKey}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`}
                </code>
              </pre>
            </TabsContent>
            <TabsContent value="curl" className="mt-4">
              <pre className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                <code className="text-sm text-white">
                  {`curl -X POST https://api.otterflow.com/v1/process \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Translate the following English text to French: \\'Hello, world!\\'",
    "max_tokens": 60
  }'`}
                </code>
              </pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </Layout>
  )
}
