'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Key, Trash } from 'lucide-react'
import Layout from '@/components/Layout'

export default function APIAccess() {
  const [apiKeys, setApiKeys] = useState([
    { id: 1, key: 'sk-1234567890abcdef', createdAt: '2023-06-01' },
    { id: 2, key: 'sk-0987654321fedcba', createdAt: '2023-06-15' },
  ])

  const generateNewKey = () => {
    const newKey = {
      id: apiKeys.length + 1,
      key: `sk-${Math.random().toString(36).substr(2, 16)}`,
      createdAt: new Date().toISOString().split('T')[0],
    }
    setApiKeys([...apiKeys, newKey])
  }

  const revokeKey = (id: number) => {
    setApiKeys(apiKeys.filter((key) => key.id !== id))
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
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div>
                  <div className="font-mono">{key.key}</div>
                  <div className="text-sm text-gray-500">
                    Created on {key.createdAt}
                  </div>
                </div>
                <div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigator.clipboard.writeText(key.key)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => revokeKey(key.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button onClick={generateNewKey} className="mt-4">
            <Key className="mr-2 h-4 w-4" />
            Generate New API Key
          </Button>
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
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ip-whitelist">IP Whitelist</Label>
              <Input
                id="ip-whitelist"
                placeholder="Enter IP addresses (comma-separated)"
              />
            </div>
            <div>
              <Label htmlFor="usage-limit">Usage Limit (per day)</Label>
              <Input
                id="usage-limit"
                type="number"
                placeholder="Enter limit"
              />
            </div>
            <Button>Save Security Settings</Button>
          </div>
        </CardContent>
      </Card>
    </Layout>
  )
}
