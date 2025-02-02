// app/admin/email/page.tsx

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/admin/DataTable"

export default function EmailNotifications() {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [recipients, setRecipients] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom")
  const [recentEmails, setRecentEmails] = useState<Array<{
    id: number
    sent_at: string
    recipients: string[]
    subject: string
    template: string
  }>>([])
  const [userEmails, setUserEmails] = useState<string[]>([])

  // Fetch user emails and recent emails on mount
  useEffect(() => {
    const fetchUserEmails = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
        if (!backendUrl) {
          throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined")
        }

        const res = await fetch(`${backendUrl}/admin/emails/users`, {
          credentials: "include",
        })
        if (!res.ok) {
          throw new Error(`Failed to fetch user emails: ${res.statusText}`)
        }
        const data: string[] = await res.json()
        setUserEmails(data)
      } catch (error) {
        console.error(error)
      }
    }

    const fetchRecentEmails = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
        if (!backendUrl) {
          throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined")
        }

        const res = await fetch(`${backendUrl}/admin/emails/list`, {
          credentials: "include",
        })
        if (!res.ok) {
          throw new Error(`Failed to fetch recent emails: ${res.statusText}`)
        }
        const data = await res.json()
        setRecentEmails(data)
      } catch (error) {
        console.error(error)
      }
    }

    fetchUserEmails()
    fetchRecentEmails()
  }, [])

  const handleSendEmail = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      if (!backendUrl) {
        throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined")
      }

      const res = await fetch(`${backendUrl}/admin/emails/send`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: selectedTemplate === "custom" ? subject : undefined,  // Use undefined instead of null
          body: selectedTemplate === "custom" ? body : undefined,        // Use undefined instead of null
          template: selectedTemplate,
          recipients: recipients,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || "Failed to send email")
      }

      const sentEmail = await res.json()
      console.log("Sent email:", sentEmail)

      // Refresh recent emails
      const refreshRes = await fetch(`${backendUrl}/admin/emails/list`, {
        credentials: "include",
      })
      const refreshData = await refreshRes.json()
      setRecentEmails(refreshData)
      
      // Reset form
      setSubject("")
      setBody("")
      setRecipients([])
      setSelectedTemplate("custom")
    } catch (error: any) {
      console.error(error)
      alert(error.message)
    }
  }

  const handleSelectRecipients = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value)
    setRecipients(selectedOptions)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-teal-100">Email Notifications</h1>

      <Card>
        <CardHeader>
          <CardTitle>Send Email</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendEmail()
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="recipients">Recipients</Label>
              <select
                id="recipients"
                multiple
                value={recipients}
                onChange={handleSelectRecipients}
                className="w-full border border-gray-300 rounded p-2"
              >
                {userEmails.map(email => (
                  <option key={email} value={email}>{email}</option>
                ))}
              </select>
              <small className="text-gray-500">Hold down the Ctrl (Windows) or Command (Mac) button to select multiple options.</small>
            </div>
            <div>
              <Label htmlFor="template">Email Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Email</SelectItem>
                  <SelectItem value="welcome">Welcome Email</SelectItem>
                  <SelectItem value="increase_limit">Increase Limit Offer</SelectItem>
                  <SelectItem value="payment_due">Payment Due Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedTemplate === "custom" && (
              <>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input 
                    id="subject" 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)} 
                    required={selectedTemplate === "custom"} 
                  />
                </div>
                <div>
                  <Label htmlFor="body">Email Body</Label>
                  <Textarea 
                    id="body" 
                    rows={10} 
                    value={body} 
                    onChange={(e) => setBody(e.target.value)} 
                    required={selectedTemplate === "custom"} 
                  />
                </div>
              </>
            )}
            <Button type="submit">Send Email</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Emails</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: "Date", accessorKey: "sent_at" },
              { header: "Recipients", accessorKey: "recipients" },
              { header: "Subject", accessorKey: "subject" },
              { header: "Template", accessorKey: "template" },
            ]}
            data={recentEmails.map((email) => ({
              sent_at: new Date(email.sent_at).toLocaleString(),
              recipients: email.recipients.join(", "),
              subject: email.subject,
              template: email.template.charAt(0).toUpperCase() + email.template.slice(1).replace("_", " "),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
