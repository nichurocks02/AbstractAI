"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, Cloud, Users, Cog, BarChart3, Database, Workflow, Send, Lock, Shield } from "lucide-react"
import Link from "next/link"
import Slider from "react-slick"
import "slick-carousel/slick/slick.css"
import "slick-carousel/slick/slick-theme.css"

const CloudIcon = ({ src, alt }: { src: string; alt: string }) => (
  <img src={src || "/placeholder.svg"} alt={alt} className="h-12 w-12 mx-4" />
)

export default function EnterprisePage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [submissionMessage, setSubmissionMessage] = useState("")

  const features = [
    {
      title: "Flexible Deployment",
      description: "Deploy on-premises or on any major cloud platform for ultimate privacy and control.",
      icon: Cloud,
      details: [
        "On-premises deployment for maximum data sovereignty",
        "Cloud deployment on AWS, Google Cloud, or Azure",
        "Hybrid cloud options for flexible scaling",
        "End-to-end encryption for data in transit and at rest",
      ],
    },
    {
      title: "Advanced Admin Portal",
      description: "Powerful tools for user management, usage control, and customization.",
      icon: Users,
      details: [
        "Cluster users into dynamic groups based on roles or departments",
        "Implement granular access controls for models and features",
        "Set and manage usage quotas at user, group, or organization level",
        "Real-time monitoring and alerting for usage patterns and anomalies",
      ],
    },
    {
      title: "Custom Rules & KPIs",
      description: "Tailor model routing and reinforcement learning algorithms to your specific needs.",
      icon: Cog,
      details: [
        "Create custom routing rules based on content, user, or context",
        "Define organization-specific KPIs for model performance",
        "Implement A/B testing for model selection strategies",
        "Automated optimization of model selection based on custom KPIs",
      ],
    },
    {
      title: "State-of-the-Art Caching",
      description: "Optimize performance with advanced caching mechanisms and comprehensive analytics.",
      icon: Database,
      details: [
        "Intelligent caching with automatic invalidation",
        "Per-user and shared caching options",
        "Domain-based categorization for context-aware caching",
        "Partial cache retrieval for efficient context building",
      ],
    },
    {
      title: "Custom Metrics Logging",
      description: "Gain deep insights with customizable logging and advanced analytics.",
      icon: BarChart3,
      details: [
        "Define custom metrics for tracking and optimization",
        "Real-time dashboards for monitoring key performance indicators",
        "Exportable reports for compliance and auditing",
        "Integration with popular data visualization tools",
      ],
    },
    {
      title: "AI App & Workflow Integration",
      description: "Seamlessly integrate Otterflow into your existing AI infrastructure.",
      icon: Workflow,
      details: [
        "RESTful API for easy integration with existing systems",
        "Webhook support for event-driven architectures",
        "SDK support for popular programming languages",
        "Custom workflow designer for complex AI pipelines",
      ],
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  }

  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 3000,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 0,
    cssEase: "linear",
    centerMode: true,
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    try {
      const res = await fetch(`${apiUrl}/frontendemail/request_demo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmissionMessage("Thanks for reaching out to us, our team will shortly contact you back.");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setSubmissionMessage("There was an error sending your request. Please try again later.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setSubmissionMessage("There was an error sending your request. Please try again later.");
    }
  };

  // Scroll to "Get in Touch" section
  const scrollToContact = () => {
    const contactSection = document.getElementById("get-in-touch")
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 to-blue-900 text-white">
      <header className="px-4 lg:px-6 h-14 flex items-center backdrop-blur-md bg-teal-900/30 sticky top-0 z-50">
        <Link className="flex items-center justify-center" href="/">
          <span className="text-xl font-bold">OtterFlow</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/#features">
            Features
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/enterprise">
            Enterprise
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/auth">
            Login
          </Link>
        </nav>
      </header>
      <main className="container mx-auto px-4 py-16">
        <motion.section className="text-center mb-16" initial="hidden" animate="visible" variants={containerVariants}>
          <motion.h1 className="text-5xl font-bold mb-4" variants={itemVariants}>
            Enterprise-Grade AI Workflow Management
          </motion.h1>
          <motion.p className="text-xl mb-8" variants={itemVariants}>
            Empower your organization with Otterflow&apos;s cutting-edge AI capabilities, designed for scalability,
            security, and unparalleled performance.
          </motion.p>
          <motion.div variants={itemVariants}>
            <Button size="lg" className="bg-teal-600 hover:bg-teal-700" onClick={scrollToContact}>
              Schedule a Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </motion.section>

        <motion.section className="mb-16" initial="hidden" animate="visible" variants={containerVariants}>
          <motion.h2 className="text-3xl font-bold mb-8 text-center" variants={itemVariants}>
            Deploy Anywhere, Maintain Full Control
          </motion.h2>
          <motion.div className="bg-white/10 backdrop-blur-md rounded-lg p-8" variants={itemVariants}>
            <Slider {...sliderSettings}>
              <CloudIcon src="/images/aws.png" alt="AWS" />
              <CloudIcon src="/images/google-cloud.png" alt="Google Cloud" />
              <CloudIcon src="/images/azure.png" alt="Microsoft Azure" />
            </Slider>
          </motion.div>
        </motion.section>

        <motion.section
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="bg-white/10 backdrop-blur-md border-teal-500 h-full">
                <CardHeader>
                  <feature.icon className="h-10 w-10 mb-4 text-teal-400" />
                  <CardTitle className="text-2xl">{feature.title}</CardTitle>
                  <CardDescription className="text-teal-100">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2">
                    {feature.details.map((detail, i) => (
                      <li key={i} className="text-sm text-teal-200">
                        {detail}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.section>

        <motion.section className="mb-16" initial="hidden" animate="visible" variants={containerVariants}>
          <motion.h2 className="text-3xl font-bold mb-8 text-center" variants={itemVariants}>
            Advanced Admin Portal
          </motion.h2>
          <motion.div variants={itemVariants}>
            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-teal-800/50">
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="usage">Usage Control</TabsTrigger>
                <TabsTrigger value="models">Model Customization</TabsTrigger>
              </TabsList>
              <TabsContent value="users" className="bg-white/10 backdrop-blur-md rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Dynamic User Clustering</h3>
                <p className="mb-4">Efficiently manage large user bases with intelligent grouping:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Automatically cluster users based on behavior and needs</li>
                  <li>Apply group-wide policies and permissions</li>
                  <li>Easily manage thousands of users with role-based access control</li>
                </ul>
              </TabsContent>
              <TabsContent value="usage" className="bg-white/10 backdrop-blur-md rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Granular Usage Controls</h3>
                <p className="mb-4">Set and enforce usage limits at multiple levels:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Implement token/cost caps on model usage</li>
                  <li>Set daily, weekly, or monthly quotas</li>
                  <li>Real-time usage tracking and automated alerts</li>
                </ul>
              </TabsContent>
              <TabsContent value="models" className="bg-white/10 backdrop-blur-md rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Flexible Model Management</h3>
                <p className="mb-4">Customize your AI model ecosystem:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Add and configure new models (open source and proprietary)</li>
                  <li>Set model-specific parameters and usage policies</li>
                  <li>Monitor and optimize model performance in real-time</li>
                </ul>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.section>

        <motion.section id="get-in-touch" className="max-w-4xl mx-auto" initial="hidden" animate="visible" variants={containerVariants}>
          <Card className="bg-white/10 backdrop-blur-md border-teal-500">
            <CardHeader>
              <CardTitle className="text-2xl">Get in Touch</CardTitle>
              <CardDescription className="text-teal-100">
                Interested in leveraging Otterflow for your enterprise? Our team of experts is ready to help you get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-teal-300 mb-1">
                      Name
                    </label>
                    <Input
                      id="name"
                      placeholder="Your Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-white/20 border-teal-500 placeholder-teal-300"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-teal-300 mb-1">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Your Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/20 border-teal-500 placeholder-teal-300"
                    />
                  </div>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <label htmlFor="message" className="block text-sm font-medium text-teal-300 mb-1">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    placeholder="Your Message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="bg-white/20 border-teal-500 placeholder-teal-300"
                    rows={4}
                  />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
                    Request a Demo
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </form>
              {submissionMessage && (
                <p className="mt-4 text-center text-lg text-green-300">{submissionMessage}</p>
              )}
            </CardContent>
          </Card>
        </motion.section>
      </main>
    </div>
  )
}
