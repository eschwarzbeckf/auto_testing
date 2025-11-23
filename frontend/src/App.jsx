import React, { useState, useEffect, useRef } from 'react';
import { Play, Terminal, CheckCircle, XCircle, AlertTriangle, Loader2, Layout, Smartphone, Tablet, Monitor, SmartphoneCharging, Server, Settings, Figma, Bot, Users } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export default function App() {
  const [url, setUrl] = useState('https://www.google.com');
  
  // Config
  const [figmaToken, setFigmaToken] = useState('');
  const [figmaFile, setFigmaFile] = useState('');
  const [llmModel, setLlmModel] = useState('gemini-2.5-flash');
  const [showConfig, setShowConfig] = useState(false);

  const [status, setStatus] = useState('idle'); 
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('console');
  const [report, setReport] = useState(null);
  
  const [selectedDevices, setSelectedDevices] = useState({
    mobile: true,
    tablet: false,
    desktop: true
  });

  const consoleEndRef = useRef(null);

  const addLog = (agent, message, type = 'info') => {
    setLogs(prev => [...prev, { 
      id: Date.now(), 
      agent, // 'Architect', 'Executor', 'Designer', 'System'
      message, 
      type, 
      timestamp: new Date().toLocaleTimeString() 
    }]);
  };

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const toggleDevice = (device) => {
    if (status !== 'idle') return;
    setSelectedDevices(prev => ({ ...prev, [device]: !prev[device] }));
  };

  const runTestForDevice = async (device) => {
    addLog('System', `Initializing Multi-Agent Swarm for: ${device.toUpperCase()}`, 'system');
    
    try {
      // Simulation of agent stages for UI feedback before the big await
      setTimeout(() => addLog('Executor', 'Navigating to target URL via Playwright...', 'info'), 1000);
      setTimeout(() => addLog('Architect', 'Analyzing DOM structure for test planning...', 'info'), 4000);
      if(figmaFile) setTimeout(() => addLog('Designer', 'Fetching Figma original for comparison...', 'info'), 6000);

      const response = await fetch(`${API_URL}/api/start-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            url, 
            devices: [device],
            figmaToken, 
            figmaFile,
            llmModel
        })
      });

      if (!response.ok) throw new Error('Server response error');

      const result = await response.json();
      
      if (result.success && result.data) {
        const data = result.data;
        addLog('System', `Mission Complete. Status: ${data.status.toUpperCase()}`, data.status === 'fail' ? 'error' : 'success');
        
        return {
            device: device,
            status: data.status,
            analysis: data.analysis,
            issues: data.issues || [],
            testPlan: data.test_plan || [],
            figmaComparison: data.figma_analysis || "Not compared"
        };
      } else {
        throw new Error(result.error || 'Unknown failure');
      }

    } catch (error) {
      addLog('System', `❌ Mission Failed: ${error.message}`, 'error');
      return { device, status: 'error', analysis: error.message, issues: ['Agent Error'] };
    }
  };

  const startTest = async () => {
    const devicesToRun = Object.keys(selectedDevices).filter(k => selectedDevices[k]);
    if (devicesToRun.length === 0) {
      alert("Select at least one device");
      return;
    }

    setStatus('running');
    setLogs([]);
    setReport(null);
    setActiveTab('console');
    
    const results = [];

    for (const device of devicesToRun) {
      const result = await runTestForDevice(device);
      results.push(result);
    }

    setStatus('finished');
    
    const finalReport = {
        score: results.filter(r => r.status === 'pass').length / results.length * 100,
        results: results
    };
    
    setReport(finalReport);
    setActiveTab('report');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono selection:bg-blue-500 selection:text-white">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Users className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Agent<span className="text-blue-400">Swarm</span> QA
            </h1>
          </div>
          <div className="flex gap-4 items-center">
            <button 
                onClick={() => setShowConfig(!showConfig)}
                className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full border transition-colors ${showConfig ? 'bg-blue-900/30 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}
            >
                <Settings size={14} />
                Configuration
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          
          {/* Config Panel */}
          {showConfig && (
             <div className="bg-slate-900 border border-blue-900/50 rounded-xl p-5 shadow-xl animate-in fade-in slide-in-from-top-2 space-y-5">
                
                <div>
                    <h3 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                        <Bot size={16}/> AI Model
                    </h3>
                    <select 
                        value={llmModel}
                        onChange={(e) => setLlmModel(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none appearance-none cursor-pointer hover:bg-slate-900 transition-colors"
                    >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                        <option value="gemini-3-pro-preview">Gemini 3 Pro (Preview)</option>
                    </select>
                </div>

                <div className="border-t border-slate-800"></div>

                <div>
                    <h3 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                        <Figma size={16}/> Figma Integration
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Personal Access Token</label>
                            <input 
                                type="password" 
                                placeholder="(Optional if in ENV)"
                                value={figmaToken}
                                onChange={e => setFigmaToken(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none placeholder:text-slate-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">File Key (ID)</label>
                            <input 
                                type="text" 
                                placeholder="e.g. j8y9..."
                                value={figmaFile}
                                onChange={e => setFigmaFile(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
             </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Target (URL)</label>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={status === 'running'}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
            />

            <div className="space-y-3 mb-6">
              <p className="text-sm text-slate-400">Devices:</p>
              <div className="grid grid-cols-3 gap-2">
                <DeviceSelector selected={selectedDevices.mobile} onClick={() => toggleDevice('mobile')} icon={<Smartphone size={20}/>} label="Mobile" />
                <DeviceSelector selected={selectedDevices.tablet} onClick={() => toggleDevice('tablet')} icon={<Tablet size={20}/>} label="Tablet" />
                <DeviceSelector selected={selectedDevices.desktop} onClick={() => toggleDevice('desktop')} icon={<Monitor size={20}/>} label="Desktop" />
              </div>
            </div>
            
            <button 
              onClick={startTest}
              disabled={status === 'running'}
              className={`w-full py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${status === 'running' ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25'}`}
            >
              {status === 'running' ? <><Loader2 className="w-5 h-5 animate-spin" /> Agents working...</> : <><Play className="w-5 h-5" /> Start Mission</>}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[600px] shadow-xl">
          <div className="flex border-b border-slate-800 bg-slate-950/50">
            <button onClick={() => setActiveTab('console')} className={`px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'console' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}>
              <Terminal className="w-4 h-4" /> Swarm Logs
            </button>
            <button onClick={() => setActiveTab('report')} disabled={!report} className={`px-6 py-3 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'report' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 disabled:opacity-30'}`}>
              <Layout className="w-4 h-4" /> Final Report
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-0 custom-scrollbar relative">
            {activeTab === 'console' && (
              <div className="p-4 font-mono text-sm space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-3 animate-in fade-in duration-300">
                    <span className="text-slate-600 shrink-0 w-20">[{log.timestamp}]</span>
                    <div className="flex-1">
                        {log.agent !== 'System' && <span className={`text-xs font-bold px-1.5 py-0.5 rounded mr-2 uppercase ${log.agent === 'Architect' ? 'bg-purple-900 text-purple-300' : log.agent === 'Executor' ? 'bg-amber-900 text-amber-300' : 'bg-blue-900 text-blue-300'}`}>{log.agent}</span>}
                        <span className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : 'text-slate-300'}>{log.message}</span>
                    </div>
                  </div>
                ))}
                <div ref={consoleEndRef} />
              </div>
            )}

            {activeTab === 'report' && report && (
              <div className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xl font-bold text-white mb-6">Mission Report: {llmModel}</h2>
                <div className="space-y-6">
                    {report.results.map((r, idx) => (
                        <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                            <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-lg capitalize text-white">{r.device}</span>
                                    <span className={`text-xs px-2 py-1 rounded ${r.status === 'pass' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-amber-900/30 text-amber-400'}`}>{r.status.toUpperCase()}</span>
                                </div>
                            </div>
                            
                            <div className="p-4 space-y-4">
                                {/* Analysis */}
                                <div>
                                    <h4 className="text-xs uppercase font-bold text-slate-500 mb-2">Visual Analysis</h4>
                                    <p className="text-slate-300 text-sm">{r.analysis}</p>
                                </div>

                                {/* Figma Comparison */}
                                {r.figmaComparison && r.figmaComparison !== "Not compared" && (
                                    <div className="bg-purple-900/10 border border-purple-900/30 p-3 rounded">
                                        <h4 className="text-xs uppercase font-bold text-purple-400 mb-1 flex items-center gap-2"><Figma size={12}/> Design Validation</h4>
                                        <p className="text-slate-300 text-sm">{r.figmaComparison}</p>
                                    </div>
                                )}

                                {/* Test Plan */}
                                {r.testPlan && r.testPlan.length > 0 && (
                                    <div>
                                        <h4 className="text-xs uppercase font-bold text-blue-400 mb-2 flex items-center gap-2"><Terminal size={12}/> Executed Test Plan</h4>
                                        <ul className="space-y-1">
                                            {r.testPlan.map((step, i) => (
                                                <li key={i} className="text-xs text-slate-400 flex gap-2">
                                                    <span className="text-blue-500 font-mono">{step.id}.</span> 
                                                    <span className="text-slate-300">{step.action}</span>
                                                    <span className="text-slate-500 italic">&rarr; {step.expectation}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function DeviceSelector({ selected, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${selected ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'}`}>
      {icon} <span className="text-xs mt-1 font-medium">{label}</span>
    </button>
  );
}