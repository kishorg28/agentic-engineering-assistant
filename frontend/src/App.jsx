import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Upload,
  Send,
  FileText,
  Trash2,
  Cpu,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle,
  Database,
  RefreshCw,
  Clock,
  Layers,
  ChevronRight,
  BookOpen,
  Check,
  AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Configure axios base (uses environment variable in production, falls back to local proxy in dev)
const API_URL = import.meta.env.VITE_API_URL || '/api';
const API = axios.create({
  baseURL: API_URL,
});

const TASK_LABELS = {
  general_qa: { icon: Cpu, label: "Q&A Agent", desc: "Routes query to Factual QA process" },
  summarize: { icon: FileText, label: "Summarizer Agent", desc: "Routes query to Summarization process" },
  compare: { icon: Layers, label: "Comparator Agent", desc: "Routes query to Comparison process" },
  extract_procedure: { icon: RefreshCw, label: "Procedure Agent", desc: "Routes query to Procedure Extraction process" },
};

export default function App() {
  // Application State
  const [messages, setMessages] = useState([]);
  const [ingestedDocs, setIngestedDocs] = useState([]);
  const [queryText, setQueryText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isQuerying]);

  // Handle Drag Over
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Handle Drag Leave
  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Handle Drop Files
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      addSelectedFiles(files);
    }
  };

  // Handle File Input Select
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      addSelectedFiles(files);
    }
  };

  // Add files to selection list, filtering types
  const addSelectedFiles = (files) => {
    const allowedExtensions = ['pdf', 'txt', 'csv'];
    const validFiles = files.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      return allowedExtensions.includes(ext);
    });
    
    if (validFiles.length < files.length) {
      showError("Only PDF, TXT, and CSV files are allowed.");
    }
    
    // De-duplicate selected files by name
    setSelectedFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const newFiles = validFiles.filter(f => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });
  };

  // Show temp error alerts
  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(""), 5000);
  };

  // Show temp success alerts
  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 5000);
  };

  // Remove single file from selected list
  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload Selected Files
  const handleIngest = async () => {
    if (selectedFiles.length === 0) {
      showError("Please select or drop files first.");
      return;
    }

    setIsIngesting(true);
    let successCount = 0;

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await API.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        
        if (response.status === 200) {
          successCount++;
          const name = file.name;
          setIngestedDocs(prev => {
            if (!prev.includes(name)) return [...prev, name];
            return prev;
          });
        }
      } catch (err) {
        console.error(err);
        showError(`Failed to ingest ${file.name}: ${err.response?.data?.detail || err.message}`);
      }
    }

    setIsIngesting(false);
    if (successCount > 0) {
      showSuccess(`Successfully ingested ${successCount} document(s).`);
      setSelectedFiles([]);
    }
  };

  // Submit Query
  const handleQuery = async (textToSend) => {
    const query = textToSend || queryText;
    if (!query.trim()) return;

    // Append User Message
    const userMsg = { role: "user", content: query };
    setMessages(prev => [...prev, userMsg]);
    setQueryText("");
    setIsQuerying(true);

    try {
      const response = await API.post("/query", { query: query });
      if (response.status === 200) {
        const data = response.data;
        // Append Assistant Message with rich metadata
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.answer,
          metadata: {
            task_type: data.task_type,
            confidence_level: data.confidence_level,
            confidence_score: data.confidence_score,
            citations: data.citations,
            retry_count: data.retry_count
          }
        }]);
      } else {
        showError(`Backend returned error ${response.status}`);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || err.message || "Failed to reach backend API.";
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ **API Connection Error**\n\nCould not process query. ${errMsg}\n\nPlease check if backend service is running on port 8000.`,
        metadata: {
          task_type: 'general_qa',
          confidence_level: 'Low',
          confidence_score: 0.0,
          citations: [],
          retry_count: 0
        }
      }]);
    } finally {
      setIsQuerying(false);
    }
  };

  // Handle Form Submit
  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleQuery();
  };

  // Quick Prompt Selection
  const handleQuickPrompt = (prompt) => {
    handleQuery(prompt);
  };

  // Clear Conversation History
  const clearChat = () => {
    setMessages([]);
    showSuccess("Chat history cleared.");
  };

  // File Icon helper
  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <span className="text-red-400 text-lg font-bold">📕</span>;
    if (ext === 'csv') return <span className="text-green-400 text-lg font-bold">📊</span>;
    return <span className="text-cyan-400 text-lg font-bold">📝</span>;
  };

  return (
    <div className="bg-glow-container min-h-screen flex flex-col md:flex-row relative z-10 font-sans">
      
      {/* ────────────────────────────────────────────────────────────────────────
          SIDEBAR PANEL
      ──────────────────────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/5 bg-slate-950/80 backdrop-blur-2xl flex flex-col flex-shrink-0 z-20">
        
        {/* Brand Block */}
        <div className="p-6 border-b border-white/5 flex flex-col items-center">
          <div className="relative mb-3 group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-accent-primary/20 to-accent-secondary/20 border border-accent-primary/30 flex items-center justify-center text-2xl shadow-glow animate-brand-pulse">
              ⚡
            </div>
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-tr from-accent-primary to-accent-secondary opacity-0 group-hover:opacity-30 blur transition duration-300"></div>
          </div>
          
          <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-accent-primary to-indigo-300 bg-clip-text text-transparent">
            NexusAI Engineer
          </h1>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-1">
            Agentic · RAG · LangGraph
          </p>
          
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-semibold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-dot-pulse"></span>
            System Online
          </div>
        </div>

        {/* Upload Block */}
        <div className="p-5 flex flex-col flex-shrink-0">
          <div className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-3 flex items-center gap-2">
            <span>Upload Documents</span>
            <span className="h-px bg-white/5 flex-grow"></span>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-xl border border-dashed p-5 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-accent-primary bg-accent-primary/10 scale-[0.98]'
                : 'border-accent-primary/20 bg-accent-primary/5 hover:border-accent-primary/50 hover:bg-accent-primary/8'
            }`}
          >
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              accept=".pdf,.txt,.csv"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="file-selector"
            />
            <Upload className="w-8 h-8 text-accent-primary/60 mb-2" />
            <span className="text-xs text-accent-primary font-medium">Click or drag files here</span>
            <span className="text-[9px] text-slate-500 mt-1">PDF, TXT, CSV up to 200MB</span>
          </div>

          {/* Selected File Badges */}
          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-900/60 border border-white/5 px-2.5 py-1.5 rounded-lg text-xs">
                  <span className="truncate text-slate-400 font-medium max-w-[180px]">{file.name}</span>
                  <button
                    onClick={() => removeSelectedFile(idx)}
                    className="text-slate-500 hover:text-red-400 p-0.5"
                    title="Remove file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Ingest Action Button */}
          {selectedFiles.length > 0 && (
            <button
              onClick={handleIngest}
              disabled={isIngesting}
              className="mt-3 w-full bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold text-xs py-2 rounded-lg hover:shadow-glow hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:translate-y-0"
            >
              {isIngesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  <span>Ingest Documents</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Knowledge Base */}
        <div className="flex-1 px-5 overflow-y-auto pb-4">
          <div className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-3 flex items-center gap-2">
            <span>Knowledge Base</span>
            <span className="h-px bg-white/5 flex-grow"></span>
          </div>

          {ingestedDocs.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-600 italic">
              No files ingested yet
            </div>
          ) : (
            <div className="space-y-1">
              {ingestedDocs.map((doc, idx) => {
                const ext = doc.split('.').pop().toUpperCase();
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2.5 bg-slate-900/30 hover:bg-accent-primary/5 border border-white/5 hover:border-accent-primary/10 rounded-lg p-2 text-xs transition-all hover:translate-x-0.5 group"
                  >
                    {getFileIcon(doc)}
                    <span className="truncate text-slate-400 group-hover:text-slate-200 flex-1" title={doc}>
                      {doc}
                    </span>
                    <span className="text-[9px] font-mono bg-accent-primary/10 border border-accent-primary/20 text-accent-primary px-1.5 py-0.25 rounded font-bold">
                      {ext}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Clear Button and Footer Info */}
        <div className="p-5 border-t border-white/5 bg-slate-950 flex flex-col gap-3">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="w-full bg-slate-900/50 hover:bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-white/5 hover:border-white/10 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Conversation</span>
            </button>
          )}

          <div className="text-[10px] text-slate-700 text-center leading-relaxed">
            <span className="hover:text-accent-primary transition-colors cursor-default">LangGraph</span> · <span className="hover:text-accent-primary transition-colors cursor-default">ChromaDB</span><br />
            <span className="hover:text-accent-primary transition-colors cursor-default">FastAPI</span> · <span className="hover:text-accent-primary transition-colors cursor-default">OpenAI Embeddings</span>
          </div>
        </div>

      </aside>

      {/* ────────────────────────────────────────────────────────────────────────
          MAIN WORKSPACE
      ──────────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-[calc(100vh-140px)] md:h-screen min-w-0 relative z-10">

        {/* Floating Notification banners */}
        {errorMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-950/80 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl flex items-center gap-3 backdrop-blur-xl shadow-2xl z-50 text-xs animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-950/80 border border-emerald-500/20 text-emerald-200 px-4 py-3 rounded-xl flex items-center gap-3 backdrop-blur-xl shadow-2xl z-50 text-xs animate-in fade-in duration-200">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Global Page Header */}
        <header className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-950/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-accent-primary/20 to-accent-secondary/20 border border-accent-primary/20 flex items-center justify-center text-lg">
              🛠️
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                Engineering <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent italic font-semibold">Document Intelligence</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Upload technical manuals to answer queries, extract procedures, and check compliance.
              </p>
            </div>
          </div>

          {/* Quick Info Badges */}
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-primary"></span>
              Agentic Routing
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-secondary"></span>
              Self-Corrects
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Cites Sources
            </span>
          </div>
        </header>

        {/* Conversation Feed */}
        <section className="flex-grow overflow-y-auto px-6 py-6 space-y-6">
          
          {messages.length === 0 ? (
            /* EMPTY HERO STATE */
            <div className="max-w-2xl mx-auto py-12 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-slate-900/60 border border-accent-primary/20 flex items-center justify-center text-3xl shadow-glow animate-empty-float">
                  ⚡
                </div>
                <div className="absolute inset-[-6px] rounded-full border border-accent-primary/10 animate-spin-reverse"></div>
                <div className="absolute inset-[-15px] rounded-full border border-accent-secondary/5 animate-spin-slow"></div>
              </div>
              
              <h3 className="text-base font-bold text-white tracking-tight mb-2">Ready for Queries</h3>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-8">
                Upload manuals or procedures in the sidebar, then type your technical questions.<br />
                The AI system will retrieve relevant chunks, validate statements, and cite findings.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <button
                  onClick={() => handleQuickPrompt("What are the inspection steps before transformer oil testing?")}
                  className="p-3 bg-slate-900/50 hover:bg-accent-primary/5 border border-white/5 hover:border-accent-primary/20 rounded-xl text-left text-xs text-slate-400 hover:text-slate-200 transition-all hover:-translate-y-0.5 group relative overflow-hidden"
                >
                  <span className="font-semibold block text-accent-primary text-[10px] uppercase mb-1">QA Inquiry</span>
                  "What are the inspection steps before transformer oil testing?"
                  <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-accent-primary" />
                  </div>
                </button>
                
                <button
                  onClick={() => handleQuickPrompt("Summarize safety precautions for maintenance shutdown.")}
                  className="p-3 bg-slate-900/50 hover:bg-accent-primary/5 border border-white/5 hover:border-accent-primary/20 rounded-xl text-left text-xs text-slate-400 hover:text-slate-200 transition-all hover:-translate-y-0.5 group relative overflow-hidden"
                >
                  <span className="font-semibold block text-accent-secondary text-[10px] uppercase mb-1">Summarize</span>
                  "Summarize safety precautions for maintenance shutdown."
                  <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-accent-secondary" />
                  </div>
                </button>

                <button
                  onClick={() => handleQuickPrompt("Compare the troubleshooting steps for overheating vs insulation failure.")}
                  className="p-3 bg-slate-900/50 hover:bg-accent-primary/5 border border-white/5 hover:border-accent-primary/20 rounded-xl text-left text-xs text-slate-400 hover:text-slate-200 transition-all hover:-translate-y-0.5 group relative overflow-hidden"
                >
                  <span className="font-semibold block text-cyan-400 text-[10px] uppercase mb-1">Compare Specs</span>
                  "Compare troubleshooting steps for overheating vs insulation failure."
                  <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-cyan-400" />
                  </div>
                </button>

                <button
                  onClick={() => handleQuickPrompt("Extract the procedure for replacing the stator winding.")}
                  className="p-3 bg-slate-900/50 hover:bg-accent-primary/5 border border-white/5 hover:border-accent-primary/20 rounded-xl text-left text-xs text-slate-400 hover:text-slate-200 transition-all hover:-translate-y-0.5 group relative overflow-hidden"
                >
                  <span className="font-semibold block text-purple-400 text-[10px] uppercase mb-1">Extract Procedure</span>
                  "Extract the procedure for replacing the stator winding."
                  <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-purple-400" />
                  </div>
                </button>
              </div>

            </div>
          ) : (
            /* CONVERSATION HISTORY LIST */
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                
                return (
                  <div
                    key={index}
                    className={`flex gap-4 p-4 rounded-2xl transition-all duration-300 ${
                      isUser ? 'chat-bubble-user ml-12' : 'chat-bubble-assistant mr-12'
                    }`}
                  >
                    {/* Avatar Icon */}
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-semibold select-none ${
                      isUser 
                        ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20' 
                        : 'bg-gradient-to-tr from-accent-primary to-accent-secondary text-white'
                    }`}>
                      {isUser ? '🧑‍💻' : '⚡'}
                    </div>

                    {/* Message Contents */}
                    <div className="flex-1 min-w-0">
                      
                      {/* Markdown Text rendering */}
                      <div className="prose-custom">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {/* Assistant Metadata and Citations */}
                      {!isUser && msg.metadata && (
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                          
                          {/* Agent Routing Visual Flowchart */}
                          <div className="bg-slate-950/60 rounded-xl p-3 border border-white/5">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Cpu className="w-3.5 h-3.5 text-accent-primary" />
                              Agent Pipeline Routing
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Entry Node */}
                              <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400 font-medium">
                                User Input
                              </div>
                              <ChevronRight className="w-3 h-3 text-slate-600" />
                              
                              {/* Routing Node */}
                              <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                Classifier
                              </div>
                              <ChevronRight className="w-3 h-3 text-slate-600" />
                              
                              {/* Activated Agent Node */}
                              {(() => {
                                const matchedTask = TASK_LABELS[msg.metadata.task_type] || { icon: Cpu, label: "Q&A Agent" };
                                const ActiveIcon = matchedTask.icon;
                                return (
                                  <div className="px-2.5 py-1 rounded bg-accent-primary/10 border border-accent-primary/30 text-[10px] text-accent-primary font-bold flex items-center gap-1.5 shadow-glow">
                                    <ActiveIcon className="w-3 h-3" />
                                    {matchedTask.label}
                                  </div>
                                );
                              })()}
                              
                              <ChevronRight className="w-3 h-3 text-slate-600" />

                              {/* Vector DB Ingest Node */}
                              <div className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Database className="w-3 h-3 text-slate-500" />
                                ChromaDB RAG
                              </div>

                              <ChevronRight className="w-3 h-3 text-slate-600" />

                              {/* Self Correction Node */}
                              <div className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${
                                msg.metadata.confidence_level === 'High' 
                                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                                  : msg.metadata.confidence_level === 'Medium'
                                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
                              }`}>
                                <Check className="w-3 h-3" />
                                Validator Loop
                                {msg.metadata.retry_count > 0 && (
                                  <span className="bg-red-500/20 text-red-400 text-[9px] px-1 rounded ml-1">
                                    {msg.metadata.retry_count} retries
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Confidence Indicators */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            
                            {/* Confidence Score Bar */}
                            <div className="bg-slate-950/40 rounded-xl p-3 border border-white/5">
                              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                                Verification confidence
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-3 rounded-full bg-slate-900 border border-white/5 overflow-hidden relative">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                      msg.metadata.confidence_level === 'High' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                      msg.metadata.confidence_level === 'Medium' ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                                      'bg-gradient-to-r from-red-500 to-red-400'
                                    }`}
                                    style={{ width: `${Math.round(msg.metadata.confidence_score * 100)}%` }}
                                  />
                                  {/* Shimmer animation */}
                                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] bg-[length:200%_100%] animate-[shimmer_2.5s_infinite]"></div>
                                </div>
                                <span className={`font-mono text-xs font-bold ${
                                  msg.metadata.confidence_level === 'High' ? 'text-emerald-400' :
                                  msg.metadata.confidence_level === 'Medium' ? 'text-amber-400' :
                                  'text-red-400'
                                }`}>
                                  {Math.round(msg.metadata.confidence_score * 100)}%
                                </span>
                              </div>
                            </div>

                            {/* Confidence Level Badge details */}
                            <div className="bg-slate-950/40 rounded-xl p-3 border border-white/5 flex items-center justify-between">
                              <div>
                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">
                                  Hallucination check
                                </div>
                                <div className="text-xs font-bold text-slate-200">
                                  {msg.metadata.confidence_level === 'High' && "Verified context alignment"}
                                  {msg.metadata.confidence_level === 'Medium' && "Partial context verification"}
                                  {msg.metadata.confidence_level === 'Low' && "Low grounding context matches"}
                                </div>
                              </div>

                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                                msg.metadata.confidence_level === 'High' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                                msg.metadata.confidence_level === 'Medium' ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' :
                                'bg-red-500/10 border-red-500/25 text-red-400'
                              }`}>
                                {msg.metadata.confidence_level === 'High' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                {msg.metadata.confidence_level}
                              </span>
                            </div>

                          </div>

                          {/* Citations Expandable Block */}
                          {msg.metadata.citations && msg.metadata.citations.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-accent-primary" />
                                Sources Cited ({msg.metadata.citations.length})
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {msg.metadata.citations.map((cite, idx) => (
                                  <div 
                                    key={idx} 
                                    className="flex gap-3 items-start bg-slate-900/40 hover:bg-accent-primary/5 border border-white/5 hover:border-accent-primary/10 rounded-xl p-3 transition-all hover:translate-x-0.5 relative overflow-hidden group"
                                  >
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-accent-primary to-accent-secondary rounded-l"></div>
                                    <div className="w-5 h-5 rounded-md bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-[10px] font-bold text-accent-primary font-mono mt-0.5">
                                      {(idx + 1).toString().padStart(2, '0')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs font-bold text-slate-300 truncate" title={cite.document_name}>
                                        📄 {cite.document_name}
                                      </div>
                                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                                        <span>Page {cite.page_number}</span>
                                        <span className="opacity-30">•</span>
                                        <span className="italic" title={cite.section_title}>{cite.section_title || 'General Context'}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reasoning Active Spinner Overlay */}
          {isQuerying && (
            <div className="max-w-3xl mx-auto flex gap-4 p-4 rounded-2xl chat-bubble-assistant mr-12 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-primary to-accent-secondary text-white flex items-center justify-center text-sm font-semibold select-none animate-spin">
                🔄
              </div>
              <div className="flex-grow space-y-2 mt-1">
                <div className="text-xs font-bold text-accent-primary flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  Agent Reasoning Loop active...
                </div>
                <div className="text-[11px] text-slate-500">
                  Retrieving relevant document segments from vector store and executing validation model to rule out hallucinations.
                </div>
                <div className="h-1.5 bg-slate-900 rounded-full w-2/3 overflow-hidden relative mt-2 border border-white/5">
                  <div className="h-full bg-accent-primary rounded-full w-1/3 animate-[shimmer_1.5s_infinite]"></div>
                </div>
              </div>
            </div>
          )}

          {/* Dummy element for scroll anchoring */}
          <div ref={messagesEndRef} />
        </section>

        {/* Chat Input Container */}
        <footer className="p-6 bg-gradient-to-t from-space-dark via-space-dark/95 to-transparent">
          <div className="max-w-3xl mx-auto relative">
            
            <form onSubmit={handleFormSubmit} className="flex gap-2 bg-slate-900/90 border border-white/10 focus-within:border-accent-primary/50 focus-within:ring-2 focus-within:ring-accent-primary/10 rounded-2xl p-2.5 backdrop-blur-2xl shadow-xl transition-all duration-300">
              
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                disabled={isQuerying}
                placeholder="Ask about your engineering documents..."
                className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 px-3 py-2 outline-none disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={isQuerying || !queryText.trim()}
                className="bg-accent-primary/10 hover:bg-accent-primary border border-accent-primary/20 hover:border-transparent text-accent-primary hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-30 disabled:hover:bg-accent-primary/10 disabled:hover:text-accent-primary disabled:hover:border-accent-primary/20 disabled:cursor-not-allowed select-none"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>

            </form>

            <p className="text-[10px] text-center text-slate-600 mt-2.5">
              Grounded answers require document context. Make sure technical manuals are ingested in the sidebar before questioning.
            </p>
          </div>
        </footer>

      </main>

    </div>
  );
}
