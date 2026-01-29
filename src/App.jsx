import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, RotateCcw, LayoutGrid, Monitor, List, 
  Shuffle, ArrowDownAZ, X, Settings, BrainCircuit,
  Clipboard, CheckCircle2, BookOpen, HelpCircle,
  Users, Map as MapIcon, ChevronRight, ChevronLeft, Sparkles,
  ArrowRightCircle, AlertCircle, PanelLeftOpen, PanelRightOpen,
  Loader2, Wand2, Info, Copyright, ExternalLink, ChevronDown,
  FileText, Image as ImageIcon, Download, ArrowLeft
} from 'lucide-react';

/**
 * FELIX v7.2 (Export & Print Engine 2.0)
 * Features:
 * - High-Fidelity PNG Export: Now captures student names by syncing input values to cloned text.
 * - Robust Print Trigger: Focused window command with keyboard fallback guidance.
 * - Intelligent State Merger: Preserves manual names during AI sync.
 * - Symmetrical Navigation: Optimized for Bronx & Westchester educator workflows.
 */

export default function App() {
  const apiKey = ""; // API key provided by environment
  const gridRef = useRef(null);

  // --- UI Visibility State ---
  const [activeMenu, setActiveMenu] = useState(null); 
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // --- Room Configuration State ---
  const [gridSize, setGridSize] = useState({ rows: 7, cols: 9 });
  const [desks, setDesks] = useState(new Set(['1-2', '1-3', '1-5', '1-6', '3-2', '3-3', '3-5', '3-6']));
  const [seats, setSeats] = useState({});
  const [studentMetadata, setStudentMetadata] = useState({});
  
  // --- Workspace Logic State ---
  const [rosterInput, setRosterInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState({
    className: 'Class Layout',
    period: 'Section 001',
    date: new Date().toLocaleDateString(),
  });

  // --- Script Injection for Exports ---
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.async = true;
    document.body.appendChild(script);

    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { size: auto; margin: 15mm; }
        html, body { height: auto !important; overflow: visible !important; background: white !important; }
        #root, .h-screen { height: auto !important; overflow: visible !important; display: block !important; position: relative !important; }
        .no-print { display: none !important; }
        main { overflow: visible !important; height: auto !important; padding: 0 !important; margin: 0 !important; display: block !important; }
        .print-layout-card { border: none !important; box-shadow: none !important; width: 100% !important; max-width: none !important; padding: 0 !important; margin-top: 0 !important; }
      }
    `;
    document.head.appendChild(style);

    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => { 
      if (document.body.contains(script)) document.body.removeChild(script); 
      if (document.head.contains(style)) document.head.removeChild(style);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // --- Export Handlers ---
  const enterPrintPreview = () => { 
    setIsExportOpen(false); 
    setActiveMenu(null); 
    setIsPrinting(true); 
  };

  const executePrint = () => { 
    // Aggressive focus and delay to ensure the browser handles the command in sandboxed/preview modes
    window.focus(); 
    setTimeout(() => {
        try {
            window.print(); 
        } catch (e) {
            setError("Standard print command failed. Please use Ctrl+P / Cmd+P.");
        }
    }, 200);
  };

  const handleExportImage = async () => {
    setIsExportOpen(false);
    if (!window.html2canvas) {
        setError("Export tool still loading... please wait.");
        return;
    }
    
    setError(null);
    try {
        const canvas = await window.html2canvas(gridRef.current, { 
            backgroundColor: '#ffffff', 
            scale: 2, 
            useCORS: true,
            // CRITICAL FIX: html2canvas doesn't capture input values by default.
            // This 'onclone' hook swaps inputs for static divs during the capture process.
            onclone: (clonedDoc) => {
              const inputs = clonedDoc.querySelectorAll('input[type="text"]');
              inputs.forEach(input => {
                const parent = input.parentElement;
                const textNode = clonedDoc.createElement('div');
                textNode.innerText = input.value;
                textNode.style.cssText = input.style.cssText;
                // Preserve styling from Tailwind classes
                textNode.className = input.className;
                input.style.display = 'none';
                parent.appendChild(textNode);
              });
            }
        });
        const link = document.createElement('a');
        link.download = `Felix-${details.className.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        setError("Image generation failed. Try standard print or PDF.");
    }
  };

  // --- Gemini API Logic ---
  const generateSeatingWithGemini = async () => {
    if (!rosterInput.trim()) { setError("Roster is empty."); return; }
    setIsGenerating(true);
    setError(null);

    const currentState = {
      gridSize,
      activeDesks: Array.from(desks),
      currentSeating: seats,
      metadata: studentMetadata
    };

    const systemPrompt = `
      You are 'Felix', a state-aware seating assistant.
      RULES:
      1. MERGE: Keep existing names in 'currentSeating' unless specifically asked to move them.
      2. COMPLIANCE: Students with IEP, 504, or ELL must be in Row 0 or 1.
      3. EXPAND: Create new coordinate keys in the grid if capacity exceeded.
      4. RETURN ONLY JSON. 
      JSON SCHEMA: { "assignments": { "row-col": "Name" }, "metadata": { "row-col": { "isPriority": true, "type": "IEP|504|ELL" } } }
    `;

    const fetchWithRetry = async (retries = 0) => {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Current State: ${JSON.stringify(currentState)} \nNew Roster: ${rosterInput}` }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (!response.ok) throw new Error(`API: ${response.status}`);
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text) {
          handleApplyGemJSON(text);
          setActiveMenu(null); 
        }
      } catch (err) {
        if (retries < 3) {
          setTimeout(() => fetchWithRetry(retries + 1), 1000);
        } else {
          setError("Brain sync failed. Please try again.");
          setIsGenerating(false);
        }
      }
    };
    fetchWithRetry();
  };

  const handleApplyGemJSON = (sourceText) => {
    try {
      const cleanJson = sourceText.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleanJson);
      
      const newDesks = new Set(desks);
      Object.keys(data.assignments || {}).forEach(coord => newDesks.add(coord));
      
      const mergedSeats = { ...seats, ...(data.assignments || {}) };
      
      setDesks(newDesks);
      setSeats(mergedSeats);
      setStudentMetadata(prev => ({ ...prev, ...(data.metadata || {}) }));
      setIsGenerating(false);
    } catch (e) {
      setError("AI format error.");
      setIsGenerating(false);
    }
  };

  // --- Manipulators ---
  const handleManualEdit = (key, value) => {
    setSeats(prev => ({...prev, [key]: value}));
  };

  const toggleDesk = (r, c) => {
    const key = `${r}-${c}`;
    const newDesks = new Set(desks);
    if (newDesks.has(key)) {
      newDesks.delete(key);
      const newSeats = { ...seats }; delete newSeats[key]; setSeats(newSeats);
    } else {
      newDesks.add(key);
    }
    setDesks(newDesks);
  };

  const sortAlpha = () => {
    const names = Object.values(seats).filter(n => n).sort((a, b) => a.localeCompare(b));
    const coords = Array.from(desks);
    const newSeats = {};
    names.forEach((n, i) => { if (coords[i]) newSeats[coords[i]] = n; });
    setSeats(newSeats);
  };

  const shuffleSeats = () => {
    const names = Object.values(seats).filter(n => n).sort(() => Math.random() - 0.5);
    const coords = Array.from(desks).sort(() => Math.random() - 0.5);
    const newSeats = {};
    names.forEach((n, i) => { if (coords[i]) newSeats[coords[i]] = n; });
    setSeats(newSeats);
  };

  return (
    <div className={`h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden flex flex-col relative ${isPrinting ? 'bg-white' : ''}`}>
      
      {/* PRINT TOOLBAR */}
      {isPrinting && (
        <div className="no-print bg-slate-900 text-white px-6 py-3 flex justify-between items-center z-[200] shadow-2xl shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsPrinting(false)} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-all"><ArrowLeft size={16} /> Exit Preview</button>
            <span className="h-6 w-px bg-white/20"></span>
            <div className="flex flex-col">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Chart Export Mode</p>
                <p className="text-[9px] text-slate-500 italic mt-0.5 whitespace-nowrap">If print dialog fails to open, press Cmd/Ctrl + P</p>
            </div>
          </div>
          <button onClick={executePrint} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-black shadow-lg">Confirm & Print</button>
        </div>
      )}

      {/* HEADER */}
      <header className={`bg-[#1a73e8] px-6 py-4 flex justify-between items-center shadow-md shrink-0 z-[100] no-print ${isPrinting ? 'hidden' : ''}`}>
        <div className="flex items-center gap-5 text-white">
          <div className="bg-white shadow-xl shadow-blue-800/20 p-2.5 rounded-2xl">
            <LayoutGrid className="w-7 h-7 text-[#1a73e8]" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl font-black leading-[0.8] tracking-tighter uppercase italic">Felix</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-100 opacity-90 mt-1">Rally Seating Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setActiveMenu(activeMenu === 'config' ? null : 'config')} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeMenu === 'config' ? 'bg-blue-800 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}><Settings size={16} /> Room Layout</button>
          <button onClick={() => setActiveMenu(activeMenu === 'gem' ? null : 'gem')} className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeMenu === 'gem' ? 'bg-indigo-700 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}><BrainCircuit size={16} /> Gem Engine</button>
          <div className="w-px h-6 bg-white/20 mx-2"></div>
          <div className="relative">
            <button onClick={() => setIsExportOpen(!isExportOpen)} className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-blue-600 bg-white rounded-xl hover:bg-blue-50 transition-all shadow-lg"><Download size={16} /> Export <ChevronDown size={14} /></button>
            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[110]">
                <button onClick={enterPrintPreview} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><Printer size={16} className="text-blue-500" /> Print / PDF</button>
                <button onClick={handleExportImage} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 border-t"><ImageIcon size={16} className="text-green-500" /> Download PNG</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* OVERLAY CARDS */}
      <div className="relative z-50 no-print">
        {activeMenu && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px]" onClick={() => setActiveMenu(null)}></div>}
        <div className={`absolute left-1/2 -translate-x-1/2 top-0 w-full max-w-2xl bg-white shadow-2xl rounded-b-3xl border transition-all duration-300 transform ${activeMenu === 'config' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 invisible'}`}>
          <div className="p-8 grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grid Dimensions</h3>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={gridSize.rows} onChange={e => setGridSize({...gridSize, rows: parseInt(e.target.value) || 1})} className="bg-slate-50 border rounded-lg p-2 text-sm" />
                <input type="number" value={gridSize.cols} onChange={e => setGridSize({...gridSize, cols: parseInt(e.target.value) || 1})} className="bg-slate-50 border rounded-lg p-2 text-sm" />
              </div>
            </div>
            <div className="space-y-6 border-l pl-8">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Class Info</h3>
              <input placeholder="Course Name" value={details.className} onChange={e => setDetails({...details, className: e.target.value})} className="w-full text-sm border-b pb-1" />
              <button onClick={() => setActiveMenu(null)} className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md">Update Workspace</button>
            </div>
          </div>
        </div>

        <div className={`absolute left-1/2 -translate-x-1/2 top-0 w-full max-w-4xl bg-white shadow-2xl rounded-b-3xl border transition-all duration-300 transform ${activeMenu === 'gem' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 invisible'}`}>
          <div className="p-8 flex gap-8">
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center"><h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Intelligence Sync</h3><HelpCircle size={18} className="text-slate-300 cursor-pointer hover:text-indigo-500" onClick={() => setIsHelpModalOpen(true)} /></div>
              <textarea value={rosterInput} onChange={(e) => setRosterInput(e.target.value)} placeholder={`Paste names here...`} className="w-full h-48 p-4 bg-slate-50 border-2 rounded-2xl font-mono text-sm outline-none" />
              <button disabled={isGenerating || !rosterInput.trim()} onClick={generateSeatingWithGemini} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2">{isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />} {isGenerating ? 'Synthesizing...' : 'Sync Seating Chart'}</button>
            </div>
            <div className="w-64 space-y-4 border-l pl-8 shrink-0">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Refinement</h4>
              <button onClick={sortAlpha} className="w-full flex items-center gap-3 p-3 bg-white border rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"><ArrowDownAZ size={16} /> Sort Alphabetical</button>
              <button onClick={shuffleSeats} className="w-full flex items-center gap-3 p-3 bg-white border rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"><Shuffle size={16} /> Random Shuffle</button>
              {error && <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg border border-red-100">{error}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN GRID Area */}
      <main className={`flex-1 relative overflow-y-auto bg-slate-50/50 flex flex-col items-center pt-12 ${isPrinting ? 'overflow-visible bg-white pt-0' : ''}`}>
        <div className={`max-w-[1400px] w-full px-6 md:px-12 flex-1 flex flex-col items-center ${isPrinting ? 'px-0' : ''}`}>
          <div ref={gridRef} className={`w-full bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 md:p-12 relative min-h-[700px] transition-all flex flex-col print-container print-layout-card ${isPrinting ? 'rounded-none border-none shadow-none' : ''}`}>
            <div className="w-full max-w-2xl h-14 bg-slate-50 border-2 border-slate-100 mx-auto mb-20 rounded-2xl flex items-center justify-center gap-4 shrink-0">
              <Monitor className="text-slate-300" size={24} />
              <span className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.5em]">Classroom Front / Display Area</span>
            </div>

            <div className="flex-1 flex items-start justify-center overflow-x-auto pb-10 print:overflow-visible">
              <div className="grid gap-4 transition-all duration-500" style={{ gridTemplateColumns: `repeat(${gridSize.cols}, minmax(0, 1fr))`, maxWidth: `${gridSize.cols * 110}px`, width: '100%' }}>
                {Array.from({ length: gridSize.rows }).map((_, r) => (
                  Array.from({ length: gridSize.cols }).map((_, c) => {
                    const key = `${r}-${c}`;
                    const isDesk = desks.has(key);
                    const studentName = seats[key];
                    const metadata = studentMetadata[key];

                    return (
                      <div key={key} onClick={() => !studentName && toggleDesk(r, c)} className={`aspect-[1.3] rounded-2xl transition-all duration-300 flex items-center justify-center relative group ${isDesk ? 'bg-white border-[3px] border-slate-300 shadow-sm' : isPrinting ? 'opacity-0' : 'bg-slate-50 border border-dashed border-slate-100 opacity-40 hover:opacity-100 cursor-pointer'} ${isDesk && metadata?.isPriority ? 'border-blue-600 bg-blue-50/20' : ''}`}>
                        {isDesk && (
                          <div className="w-full h-full flex flex-col items-center justify-center px-2 py-1 text-center overflow-hidden">
                            <input type="text" value={studentName || ''} placeholder="..." onChange={(e) => handleManualEdit(key, e.target.value)} className={`w-full text-center bg-transparent border-none text-[11px] font-black uppercase focus:ring-0 placeholder:text-slate-200 ${studentName ? 'text-slate-800' : 'text-slate-200'}`} />
                            {metadata?.isPriority && <div className="absolute top-2 right-2 p-1 bg-blue-600 rounded-full shadow-lg no-print"><CheckCircle2 className="w-2.5 h-2.5 text-white" /></div>}
                            {metadata?.type && <span className="absolute bottom-1 right-2 text-[6px] font-black text-blue-500 print:hidden">{metadata.type}</span>}
                          </div>
                        )}
                        <span className="absolute text-[7px] font-mono font-bold text-slate-200 -bottom-4 opacity-50 no-print">{r}:{c}</span>
                      </div>
                    );
                  })
                ))}
              </div>
            </div>

            {/* Print Only Footer */}
            <div className={`hidden print:flex justify-between items-end mt-24 pt-8 border-t-2 border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-widest ${isPrinting ? 'flex' : 'hidden'}`}>
              <div>
                <p className="text-slate-900 font-black tracking-tight">{details.className} • {details.period}</p>
                <p className="mt-1 opacity-50 tracking-tighter text-[7px]">Engineered by Felix Intelligence • © Charles Herzek</p>
              </div>
              <p>Chart Effective: {details.date}</p>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="w-full py-20 text-center no-print flex flex-col items-center gap-5 shrink-0 bg-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-400 rounded-xl flex items-center justify-center text-white shadow-sm ring-4 ring-slate-100 transition-transform hover:rotate-12"><LayoutGrid size={24} /></div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-[0.3em] pt-0.5">Felix By Rally</span>
          </div>
          <div className="text-center space-y-2 px-6">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">© {new Date().getFullYear() === 2026 ? '2026' : `2024 - ${new Date().getFullYear()}`} Charles Herzek. All Rights Reserved.</p>
            <p className="text-[11px] font-bold text-[#1a73e8] uppercase tracking-[0.15em] opacity-80 max-w-2xl leading-relaxed">Built for the Bronx & Westchester Educational Community</p>
          </div>
          <div className="flex items-center gap-2 mt-1 opacity-40 text-slate-300"><span className="text-[9px] font-bold uppercase tracking-widest">Intelligence powered by</span><span className="font-black text-[11px] italic tracking-tighter uppercase">Gemini 2.5 Flash</span></div>
        </footer>
      </main>

      {/* Help Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-slate-100">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Intelligence Guide</h2>
              <X size={24} className="text-slate-400 cursor-pointer hover:text-slate-600" onClick={() => setIsHelpModalOpen(false)} />
            </div>
            <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh]">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 text-lg tracking-tight">How to use State-Aware Sync:</h4>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">Felix remembers student names you've placed manually. For new rosters, mention <strong>IEP</strong>, <strong>504</strong>, or <strong>ELL</strong> next to names for prioritized front-row placement.</p>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setIsHelpModalOpen(false)} className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl">GOT IT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}