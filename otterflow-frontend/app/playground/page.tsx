"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import ReactMarkdown from "react-markdown";

// --------------------- Types ---------------------
type RoleType = "user" | "system" | "intermediate";

interface StepItem {
  label: string;
  metrics?: any;
}

interface Message {
  id: string;
  role: RoleType;
  content: string;
  model?: string | null;
  steps?: StepItem[];
  isOpen?: boolean;
  done?: boolean;
}

// --------------------- Helper Components ---------------------
function BrainIcon() {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      className="inline-block text-teal-500 mr-1"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2C8 2 5 4 5 8v1c0 4 3 7 7 7s7-3 7-7V8c0-4-3-6-7-6zm-2 6h4m-2-2v4"
      />
    </svg>
  );
}

function NeuronAnimation() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      className="w-6 h-6"
    >
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" stroke="#0ff" strokeWidth="5" fill="none" />
        <line x1="50" y1="10" x2="50" y2="30" stroke="#f0f" strokeWidth="3" />
        <line x1="50" y1="70" x2="50" y2="90" stroke="#f0f" strokeWidth="3" />
        <line x1="10" y1="50" x2="30" y2="50" stroke="#f0f" strokeWidth="3" />
        <line x1="70" y1="50" x2="90" y2="50" stroke="#f0f" strokeWidth="3" />
      </svg>
    </motion.div>
  );
}

function NeuralProcessingHeader({ done }: { done: boolean }) {
  return (
    <div className="flex items-center">
      {done ? (
        <>
          <BrainIcon />
          <span className="ml-2 font-semibold text-teal-600">Processing Complete</span>
        </>
      ) : (
        <>
          <NeuronAnimation />
          <span className="ml-2 font-semibold text-teal-600">Neural Processing...</span>
        </>
      )}
    </div>
  );
}

export default function Playground() {
  // Chat messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "system",
      content: "Welcome to the OtterFlow Playground. How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isQueryRunning, setIsQueryRunning] = useState(false);
  const [modelUsed, setModelUsed] = useState<string | null>(null);

  // --------------------- NEW: Balance State + Modal Toggle ---------------------
  const [walletBalance, setWalletBalance] = useState<number>(0);      // store the user’s balance in cents
  const [showBalanceModal, setShowBalanceModal] = useState(false);    // controls if we show “insufficient balance” modal
  const [balanceRequestReason, setBalanceRequestReason] = useState(""); // holds user's reason for requesting more balance

  // Preferences & constraints
  const [preferences, setPreferences] = useState({
    latencyPriority: 5,
    costPriority: 5,
    accuracyPriority: 5,
  });
  const [constraints, setConstraints] = useState<{
    cost_max: number | null;
    perf_min: number | null;
    lat_max: number | null;
  }>({
    cost_max: null,
    perf_min: null,
    lat_max: null,
  });
  const [ranges, setRanges] = useState({
    cost_min: 0,
    cost_max: 100,
    performance_min: 0,
    performance_max: 100,
    latency_min: 0,
    latency_max: 1000,
  });

  // We keep this for demonstration, but it's disabled/blurred
  const [withCache, setWithCache] = useState(true);

  // Model selection
  const [modelChoiceMode, setModelChoiceMode] = useState<"auto" | "manual">("auto");
  const [selectedManualModel, setSelectedManualModel] = useState("");
  const [catalogData, setCatalogData] = useState<
    { id: string; name: string; cost: number; latency: number; performance: number }[]
  >([]);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  // --------------------- Fetch Balance (NEW) ---------------------
  useEffect(() => {
    async function fetchBalance() {
      try {
        const res = await fetch(`${baseUrl}/wallet/balance`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch wallet balance");
        const data = await res.json();
        setWalletBalance(data.wallet_balance);
        // If balance < 100, show the insufficient balance modal
        console.log(data.wallet_balance)
        if (data.wallet_balance < 5) {
          setShowBalanceModal(true);
        }
      } catch (err) {
        console.error("Balance fetch error:", err);
      }
    }
    fetchBalance();
  }, [baseUrl]);

  // --------------------- Fetch Initial Ranges and Catalog ---------------------
  useEffect(() => {
    async function fetchRanges() {
      try {
        const res = await fetch(`${baseUrl}/query/get_ranges`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch ranges");
        const data = await res.json();
        setRanges({
          cost_min: data.cost_min,
          cost_max: data.cost_max,
          performance_min: data.performance_min,
          performance_max: data.performance_max,
          latency_min: data.latency_min,
          latency_max: data.latency_max,
        });
        setConstraints({
          cost_max: data.cost_max,
          perf_min: data.performance_min,
          lat_max: data.latency_max,
        });
      } catch (err) {
        console.error("Range fetch error:", err);
      }
    }
    fetchRanges();

    async function fetchCatalog() {
      try {
        const res = await fetch(`${baseUrl}/models/model_catalog`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch model catalog");
        const data = await res.json();
        setCatalogData(data.models);
      } catch (err) {
        console.error("Catalog fetch error:", err);
      }
    }
    fetchCatalog();
  }, [baseUrl]);

  // --------------------- SSE handleSend + Check Balance ---------------------
  const handleSend = async () => {
    // If the user’s balance is below 100, block sending
    if (walletBalance < 5) {
      setShowBalanceModal(true);
      return;
    }

    if (!input.trim()) return;

    // Validate constraints (auto) or manual selection
    if (modelChoiceMode === "auto") {
      if (
        constraints.cost_max === null ||
        constraints.perf_min === null ||
        constraints.lat_max === null ||
        constraints.cost_max < ranges.cost_min ||
        constraints.cost_max > ranges.cost_max ||
        constraints.perf_min < ranges.performance_min ||
        constraints.perf_min > ranges.performance_max ||
        constraints.lat_max < ranges.latency_min ||
        constraints.lat_max > ranges.latency_max
      ) {
        setError("Please stick to the allowed ranges for constraints.");
        return;
      }
    } else {
      if (!selectedManualModel) {
        setError("Please select a model before sending your query.");
        return;
      }
    }

    setError(null);
    setIsQueryRunning(true);

    // 1) Add user message
    const userId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userId, role: "user", content: input }]);

    // 2) Insert intermediate bubble
    const intermediateId = `intermediate-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: intermediateId,
        role: "intermediate",
        content: "Neural Processing...",
        steps: [] as StepItem[],
        isOpen: false,
        done: false,
      },
    ]);

    // Build SSE request data
    let user_input: any = {};
    if (modelChoiceMode === "auto") {
      const adjustedConstraints = {
        ...constraints,
        cost_max: constraints.cost_max !== null ? constraints.cost_max : null,
      };
      user_input = {
        cost_priority: preferences.costPriority,
        accuracy_priority: preferences.accuracyPriority,
        latency_priority: preferences.latencyPriority,
        cost_max: adjustedConstraints.cost_max,
        perf_min: adjustedConstraints.perf_min,
        lat_max: adjustedConstraints.lat_max,
        with_cache: withCache,
      };
    } else {
      user_input = { chosen_model: selectedManualModel, with_cache: withCache };
    }

    const userInputStr = encodeURIComponent(JSON.stringify(user_input));
    const sseUrl = `${baseUrl}/query/handle_user_query_stream?user_query=${encodeURIComponent(
      input
    )}&user_input=${userInputStr}`;

    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        setError(data.error);
        setIsQueryRunning(false);
        eventSource.close();
        return;
      }
      // Check if the event contains RL status and domain info.
      if (data.rl_status && data.domain) {
        // Append an intermediate step indicating RL status and detected domain.
        const newStep: StepItem = {
          label: `RL Status: ${data.rl_status} | Domain: ${data.domain}`,
        };
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.role === "intermediate") {
              const oldSteps = msg.steps || [];
              return { ...msg, steps: [...oldSteps, newStep] };
            }
            return msg;
          })
        );
        // We don't need to add a new message here; just update intermediate steps.
        return;
      }
      
      if (data.step) {
        const newStep: StepItem = {
          label: data.step,
          metrics: data.metrics ?? data.models ?? data.details,
        };
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.role === "intermediate") {
              const oldSteps = msg.steps || [];
              const newSteps = [...oldSteps, newStep];
              return { ...msg, steps: newSteps };
            }
            return msg;
          })
        );
      }

      if (data.final_response) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.role === "intermediate" ? { ...msg, done: true } : msg
          )
        );
        const systemId = `system-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: systemId,
            role: "system",
            content: data.final_response,
            model: data.model_used || null,
          },
        ]);
        setModelUsed(data.model_used || null);
        setIsQueryRunning(false);
        eventSource.close();

        // Optional: After usage, you might want to re-check the user's balance
        // to see if it dropped below 5. But that depends on your logic and cost calculations.
        // For example:
        // fetchBalanceAgainIfNeeded();
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      setError("Connection error. Please retry.");
      setIsQueryRunning(false);
      eventSource.close();
    };

    setInput("");
  };

  // Toggle expand/collapse for intermediate bubble
  const toggleIntermediate = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === id && msg.role === "intermediate") {
          return { ...msg, isOpen: !msg.isOpen };
        }
        return msg;
      })
    );
  };

  // Here we just keep the toggle state, but we DISABLE it in the UI
  const handleCacheToggle = () => {
    console.log("Caching is available only for enterprise users.");
  };

  // Reset function
  const handleReset = () => {
    setPreferences({
      latencyPriority: 5,
      costPriority: 5,
      accuracyPriority: 5,
    });
    setConstraints({
      cost_max: ranges.cost_max,
      perf_min: ranges.performance_min,
      lat_max: ranges.latency_max,
    });
    setModelUsed(null);
    setError(null);
    setModelChoiceMode("auto");
    setSelectedManualModel("");
    setIsQueryRunning(false);
  };

  // --------------------- NEW: Handle sending admin request for more balance ---------------------
  const handleBalanceRequestSubmit = async () => {
    if (!balanceRequestReason.trim()) return;

    try {
      const response = await fetch(`${baseUrl}/email/request_balance`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: balanceRequestReason }),
      });
      if (!response.ok) {
        throw new Error("Failed to send request to admin");
      }
      alert("Request sent to admin successfully!");
      setShowBalanceModal(false);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error"; // ✅ Fixed: Explicitly cast error
    alert("Error sending request: " + errMsg);
  }
};

  // --------------------- Render Chat Messages ---------------------
  function renderMessage(msg: Message) {
    if (msg.role === "user") {
      return (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-2 max-w-xl ml-auto text-right"
        >
          <div className="inline-block px-3 py-2 rounded-lg bg-blue-400 text-white">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        </motion.div>
      );
    } else if (msg.role === "system") {
      return (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-2 max-w-xl mr-auto text-left"
        >
          <div className="inline-block px-3 py-2 rounded-lg bg-gray-200 text-gray-800">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
          {msg.model && (
            <div className="text-xs text-gray-400 mt-1">Model: {msg.model}</div>
          )}
        </motion.div>
      );
    } else {
      const steps = msg.steps || [];
      return (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-2 max-w-xl mr-auto text-left"
        >
          <div
            className="inline-block w-full px-3 py-2 rounded-lg bg-green-40 text-gray-700 cursor-pointer"
            onClick={() => toggleIntermediate(msg.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {msg.done ? (
                  <NeuralProcessingHeader done={true} />
                ) : (
                  <NeuralProcessingHeader done={false} />
                )}
              </div>
              <span className="font-bold text-teal-600 ml-2">
                {msg.isOpen ? "–" : "+"}
              </span>
            </div>
            {!msg.isOpen ? (
              <div className="mt-2 space-y-1 text-sm text-gray-400">
                {steps.length > 0 ? (
                  steps.map((sItem, idx) => (
                    <div key={idx}>• {sItem.label}</div>
                  ))
                ) : (
                  <div className="italic">Awaiting intermediate updates...</div>
                )}
              </div>
            ) : (
              <div className="mt-2 space-y-3 text-sm">
                {steps.length > 0 ? (
                  steps.map((sItem, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-300 p-2 rounded bg-white text-gray-800"
                    >
                      <div className="font-semibold text-teal-600 mb-1">
                        {sItem.label}
                      </div>
                      {sItem.metrics && (
                        <pre className="text-xs whitespace-pre-wrap break-all">
                          <ReactMarkdown>{JSON.stringify(sItem.metrics, null, 2)}</ReactMarkdown>
                        </pre>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 italic">No intermediate steps received.</div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      );
    }
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between w-full px-6 py-4 bg-gradient-to-r from-gray-800 to-black shadow-lg">
        <h1 className="text-3xl font-bold text-teal-400">OtterFlow Playground</h1>
        <Button
          onClick={() => setIsCatalogOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white rounded-full px-4 py-2 text-sm font-medium"
        >
          Model Catalog
        </Button>
      </div>

      {/* Main Container: If insufficient balance, blur the background */}
      <div
        className={`flex h-[calc(95vh-4rem)] relative p-6 bg-gray-900 text-white transition ${
          showBalanceModal ? "filter blur-sm pointer-events-none" : ""
        }`}
      >
        {/* Left: Chat */}
        <div className="flex-1 flex flex-col mr-4">
          <Card className="flex-1 overflow-hidden flex flex-col bg-gray-800 bg-opacity-90 shadow-2xl rounded-lg">
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => renderMessage(msg))}
              {error && (
                <div className="p-2 bg-red-200 text-red-800 rounded">{error}</div>
              )}
            </CardContent>
            {/* Chat Input */}
            <div className="p-4 border-t bg-gray-800">
              <div className="flex">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  className="bg-gray-900 text-white border-gray-600 focus:ring-teal-500"
                />
                <Button onClick={handleSend} className="ml-2 bg-teal-600 hover:bg-teal-700">
                  Send
                </Button>
              </div>

              {/* Disabled Toggle for caching - "Enterprise Only" */}
              <div className="flex items-center mt-2 relative">
                <input
                  type="checkbox"
                  checked={withCache}
                  onChange={handleCacheToggle}
                  disabled
                  className="mr-2 cursor-not-allowed"
                  style={{ opacity: 0.5 }}
                />
                <span className="text-gray-300 select-none" style={{ opacity: 0.5 }}>
                  Use Cache (Enterprise Only)
                </span>
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="ml-2 text-xs text-yellow-300"
                >
                  Upgrade for Access
                </motion.span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Preferences */}
        <Card className="w-64 bg-gray-800 bg-opacity-90 rounded-lg shadow-2xl">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-teal-300">Model Preferences</h2>
            <div>
              <Label className="text-gray-200 mb-1">Model Selection Mode</Label>
              <div className="space-y-2">
                <label className="inline-flex items-center space-x-1">
                  <input
                    type="radio"
                    value="auto"
                    checked={modelChoiceMode === "auto"}
                    onChange={() => setModelChoiceMode("auto")}
                  />
                  <span className="text-gray-100">Auto Model</span>
                </label>
                <label className="inline-flex items-center space-x-1">
                  <input
                    type="radio"
                    value="manual"
                    checked={modelChoiceMode === "manual"}
                    onChange={() => setModelChoiceMode("manual")}
                  />
                  <span className="text-gray-100">Manual Model</span>
                </label>
              </div>
            </div>

            {modelChoiceMode === "manual" && (
              <div className="my-2">
                <Label className="text-gray-200 mb-1">Select a Model</Label>
                <select
                  value={selectedManualModel}
                  onChange={(e) => setSelectedManualModel(e.target.value)}
                  className="w-full p-2 rounded border border-gray-600 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Choose a model --</option>
                  {catalogData.map((mdl) => (
                    <option key={mdl.id} value={mdl.name}>
                      {mdl.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {modelChoiceMode === "auto" && (
              <>
                <div>
                  <Label className="text-gray-200">Latency Priority</Label>
                  <Slider
                    value={[preferences.latencyPriority]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={(val) =>
                      setPreferences({ ...preferences, latencyPriority: val[0] })
                    }
                    className="mt-1"
                  />
                  <div className="text-sm text-gray-300">
                    Current: {preferences.latencyPriority}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-200">Cost Priority</Label>
                  <Slider
                    value={[preferences.costPriority]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={(val) =>
                      setPreferences({ ...preferences, costPriority: val[0] })
                    }
                    className="mt-1"
                  />
                  <div className="text-sm text-gray-300">
                    Current: {preferences.costPriority}
                  </div>
                </div>
                <div>
                  <Label className="text-gray-200">Performance Priority</Label>
                  <Slider
                    value={[preferences.accuracyPriority]}
                    min={0}
                    max={10}
                    step={1}
                    onValueChange={(val) =>
                      setPreferences({ ...preferences, accuracyPriority: val[0] })
                    }
                    className="mt-1"
                  />
                  <div className="text-sm text-gray-300">
                    Current: {preferences.accuracyPriority}
                  </div>
                </div>
                <div className="mt-2 space-y-3">
                  <Label className="font-semibold text-teal-300">Constraints</Label>
                  <div>
                    <Label htmlFor="costMax" className="text-gray-200">
                      Max Cost (for 3M tokens)
                    </Label>
                    <Input
                      id="costMax"
                      type="number"
                      value={constraints.cost_max !== null ? constraints.cost_max : ""}
                      min={ranges.cost_min}
                      max={ranges.cost_max}
                      step={1}
                      onChange={(e) =>
                        setConstraints({ ...constraints, cost_max: +e.target.value })
                      }
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                    <small className="text-gray-400">
                      Valid range: [{ranges.cost_min}, {ranges.cost_max}]
                    </small>
                  </div>
                  <div>
                    <Label htmlFor="perfMin" className="text-gray-200">
                      Min Performance
                    </Label>
                    <Input
                      id="perfMin"
                      type="number"
                      value={constraints.perf_min !== null ? constraints.perf_min : ""}
                      min={ranges.performance_min}
                      max={ranges.performance_max}
                      step={1}
                      onChange={(e) =>
                        setConstraints({ ...constraints, perf_min: +e.target.value })
                      }
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                    <small className="text-gray-400">
                      Valid range: [{ranges.performance_min}, {ranges.performance_max}]
                    </small>
                  </div>
                  <div>
                    <Label htmlFor="latMax" className="text-gray-200">
                      Max Latency
                    </Label>
                    <Input
                      id="latMax"
                      type="number"
                      value={constraints.lat_max !== null ? constraints.lat_max : ""}
                      min={ranges.latency_min}
                      max={ranges.latency_max}
                      step={1}
                      onChange={(e) =>
                        setConstraints({ ...constraints, lat_max: +e.target.value })
                      }
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                    <small className="text-gray-400">
                      Valid range: [{ranges.latency_min}, {ranges.latency_max}]
                    </small>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="p-2 bg-red-200 text-red-800 rounded mt-2">{error}</div>
            )}
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full border-teal-500 text-teal-400 hover:bg-teal-600 hover:text-white"
              >
                Reset to Defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Catalog Modal */}
      <AnimatePresence>
        {isCatalogOpen && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 overflow-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-6 rounded shadow-lg w-full max-w-4xl mx-4 relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <h2 className="text-xl font-bold mb-4">Model Catalog</h2>
              <div className="overflow-x-auto max-h-[70vh]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Cost
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Latency
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Performance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {catalogData.map((model) => (
                      <tr key={model.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {model.name}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {model.cost}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {model.latency}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {model.performance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                onClick={() => setIsCatalogOpen(false)}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full px-4 py-2 text-sm font-medium mt-4 absolute top-4 right-4"
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW: Insufficient Balance Modal */}
      <AnimatePresence>
        {showBalanceModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-6 rounded shadow-lg w-full max-w-md mx-4 relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <h2 className="text-xl font-bold text-red-600 mb-4">Insufficient Balance</h2>
              <p className="mb-4 text-gray-700">
                Your balance is below the required minimum (5 cents). Please request more
                balance or contact support.
              </p>
              <div className="mb-4">
                <Label className="mb-1 font-semibold">Reason for Request</Label>
                <textarea
                  value={balanceRequestReason}
                  onChange={(e) => setBalanceRequestReason(e.target.value)}
                  className="w-full p-2 border rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  rows={4}
                  placeholder="Briefly explain why you need more balance..."
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleBalanceRequestSubmit}
                  className="bg-teal-600 hover:bg-teal-700 text-white mr-2"
                >
                  Send Request
                </Button>
                <Button
                  onClick={() => setShowBalanceModal(false)}
                  variant="outline"
                  className="border-gray-400 text-gray-600"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
