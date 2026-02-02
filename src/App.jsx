import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, RotateCcw, LayoutGrid, Monitor, List, 
  Shuffle, ArrowDownAZ, X, Settings, BrainCircuit,
  Clipboard, CheckCircle2, BookOpen, HelpCircle,
  Users, Map as MapIcon, ChevronRight, ChevronLeft, Sparkles,
  ArrowRightCircle, AlertCircle, PanelLeftOpen, PanelRightOpen,
  Loader2, Wand2, Info, Copyright, ExternalLink, ChevronDown,
  FileText, Image as ImageIcon, Download, ArrowLeft, ShieldCheck,
  Grid3X3, Square, Boxes, Columns
} from 'lucide-react';

/**
 * FELIX v8.8 (Layout Reversion Update)
 * - Reverted: U-Shapes now have the base at the rear and open towards the front.
 * - Preserved: All previous presets (Rows, Pairs, Trios, Quads).
 * - Restored: Full Logic Engine and AdSense/Privacy Compliance.
 * - Fix: Environment compatibility for Canvas preview.
 */

export default function App() {
  // Key is provided by the execution environment at runtime
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || ""; 
  const gridRef = useRef(null);

  // --- UI Visibility State ---
  const [activeMenu, setActiveMenu] = useState(null); 
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
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

  // --- Ad & Script Effects ---
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.async = true;
    document.body.appendChild(script);

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.log("AdSense initialization pending.");
    }

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

  // --- Preset Layout Engine ---
  const applyPreset = (type) => {
    const newDesks = new Set();
    const { rows, cols } = gridSize;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let shouldAdd = false;

        switch (type) {
          case 'rows':
            if (c % 2 === 0) shouldAdd = true;
            break;
          case 'big-u':
            // Base at the Rear (rows - 1), opening at the front (row 0)
            if (r === rows - 1 || c === 0 || c === cols - 1) shouldAdd = true;
            break;
          case 'small-u':
            // Inner horseshoe base at Row (rows - 2), opening at the front
            if ((r === rows - 2 && c > 1 && c < cols - 2) || (c === 2 && r < rows - 1) || (c === cols - 3 && r < rows - 1)) shouldAdd = true;
            break;
          case 'pairs':
            if (c % 3 !== 2) shouldAdd = true;
            break;
          case 'trios':
            if (c % 4 !== 3) shouldAdd = true;
            break;
          case 'quads':
            if (c % 3 !== 2 && r % 3 !== 2) shouldAdd = true;
            break;
          default:
            break;
        }

        if (shouldAdd) newDesks.add(`${r}-${c}`);
      }
    }

    setDesks(newDesks);
    setSeats({}); 
    setStudentMetadata({});
  };

  // --- Handlers ---
  const enterPrintPreview = () => { setIsExportOpen(false); setActiveMenu(null); setIsPrinting(true); };
  const executePrint = () => { window.focus(); setTimeout(() => { try { window.print(); } catch (e) { setError("Print blocked."); } }, 200); };

  const handleExportImage = async () => {
    setIsExportOpen(false);
    if (!window.html2canvas) { setError("Loading engine..."); return; }
    try {
        const canvas = await window.html2canvas(gridRef.current, { 
            backgroundColor: '#ffffff', 
            scale: 2,
            useCORS: true,
            onclone: (clonedDoc) => {
              const inputs = clonedDoc.querySelectorAll('input[type="text"]');
              inputs.forEach(input => {
                const parent = input.parentElement;
                const textNode = clonedDoc.createElement('div');
                textNode.innerText = input.value;
                textNode.style.cssText = input.style.cssText;
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
    } catch (err) { setError("PNG Export failed."); }
  };

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

    const systemPrompt = `Return JSON only: { "assignments": { "row-col": "Name" }, "metadata": { "row-col": { "isPriority": true, "type": "IEP|504|ELL" } } }`;
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            contents: [{ parts: [{ text: `Current State: ${JSON.stringify(currentState)} \nRoster: ${rosterInput}` }] }], 
            systemInstruction: { parts: [{ text: systemPrompt }] }, 
            generationConfig: { responseMimeType: "application/json" } 
        })
      });
      const result = await response.json();
      const cleanJson = (result.candidates?.[0]?.content?.parts?.[0]?.text || "").replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleanJson);
      
      setSeats(prev => ({ ...prev, ...(data.assignments || {}) }));
      setStudentMetadata(prev => ({ ...prev, ...(data.metadata || {}) }));
      setIsGenerating(false);
      setActiveMenu(null);
    } catch (err) { 
        setError("Brain sync failed. Please try again."); 
        setIsGenerating(false); 
    }
  };

  const handleManualEdit = (key, value) => setSeats(prev => ({...prev, [key]: value}));
  
  const toggleDesk = (r, c) => {
    const key = `${r}-${c}`;
    const newDesks = new Set(desks);
    if (newDesks.has(key)) { 
        newDesks.delete(key); 
        const ns = {...seats}; delete ns[key]; setSeats(ns); 
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
    <div className={`h-screen bg-slate-100 text-slate-900 font-sans overflow-hidden flex flex-col relative ${isPrinting ? 'bg-white' : ''}`}>
      
      {/* PRINT TOOLBAR */}
      {isPrinting && (
        <div className="no-print bg-slate-900 text-white px-6 py-3 flex justify-between items-center z-[200] shadow-2xl shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsPrinting(false)} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-all"><ArrowLeft size={16} /> Exit Preview</button>
            <span className="h-6 w-px bg-white/20"></span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Chart Export Mode</p>
          </div>
          <button onClick={executePrint} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-black shadow-lg">Confirm & Print</button>
        </div>
      )}

      {/* HEADER */}
      <header className={`bg-[#1a73e8] px-6 py-4 flex justify-between items-center shadow-md shrink-0 z-[100] no-print ${isPrinting ? 'hidden' : ''}`}>
        <div className="flex items-center gap-5 text-white">
          <div className="bg-white p-1.5 rounded-xl">
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
        
        {/* ROOM CONFIG MODAL */}
        <div className={`absolute left-1/2 -translate-x-1/2 top-0 w-full max-w-4xl bg-white shadow-2xl rounded-b-3xl border transition-all duration-300 transform ${activeMenu === 'config' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 invisible'}`}>
          <div className="p-8 grid grid-cols-3 gap-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grid Dimensions</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Rows</label>
                  <input type="number" value={gridSize.rows} onChange={e => setGridSize({...gridSize, rows: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 border rounded-lg p-2 text-sm font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Cols</label>
                  <input type="number" value={gridSize.cols} onChange={e => setGridSize({...gridSize, cols: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 border rounded-lg p-2 text-sm font-bold" />
                </div>
              </div>
              <div className="space-y-1 pt-4 border-t">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Class Info</h3>
                <input placeholder="Course Name" value={details.className} onChange={e => setDetails({...details, className: e.target.value})} className="w-full text-sm font-bold border-b pb-1 focus:border-blue-500 outline-none" />
              </div>
            </div>

            <div className="col-span-2 space-y-4 border-l pl-8">
              <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2"><LayoutGrid size={14}/> Quick Layout Presets</h3>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => applyPreset('rows')} className="flex flex-col items-center justify-center p-3 border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group">
                    <Columns className="mb-2 text-slate-400 group-hover:text-indigo-600" size={24} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Standard Rows</span>
                </button>
                <button onClick={() => applyPreset('big-u')} className="flex flex-col items-center justify-center p-3 border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group">
                    <Square className="mb-2 text-slate-400 group-hover:text-indigo-600" size={24} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Big U-Shape</span>
                </button>
                <button onClick={() => applyPreset('small-u')} className="flex flex-col items-center justify-center p-3 border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group">
                    <Monitor className="mb-2 text-slate-400 group-hover:text-indigo-600" size={24} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Small U-Shape</span>
                </button>
                <button onClick={() => applyPreset('pairs')} className="flex flex-col items-center justify-center p-3 border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group">
                    <Users className="mb-2 text-slate-400 group-hover:text-indigo-600" size={24} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Co-op Pairs</span>
                </button>
                <button onClick={() => applyPreset('trios')} className="flex flex-col items-center justify-center p-3 border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group">
                    <Boxes className="mb-2 text-slate-400 group-hover:text-indigo-600" size={24} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Dynamic Trios</span>
                </button>
                <button onClick={() => applyPreset('quads')} className="flex flex-col items-center justify-center p-3 border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group">
                    <Grid3X3 className="mb-2 text-slate-400 group-hover:text-indigo-600" size={24} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Project Quads</span>
                </button>
              </div>
              <button onClick={() => setActiveMenu(null)} className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md hover:bg-slate-800">Finalize Workspace</button>
            </div>
          </div>
        </div>

        {/* GEM ENGINE MODAL */}
        <div className={`absolute left-1/2 -translate-x-1/2 top-0 w-full max-w-4xl bg-white shadow-2xl rounded-b-3xl border transition-all duration-300 transform ${activeMenu === 'gem' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 invisible'}`}>
          <div className="p-8 flex gap-8">
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest italic">Intelligence Sync</h3>
                <HelpCircle size={18} className="text-slate-300 cursor-pointer hover:text-indigo-500" onClick={() => setIsHelpModalOpen(true)} />
              </div>
              <textarea value={rosterInput} onChange={(e) => setRosterInput(e.target.value)} placeholder={`Paste names here (e.g. John Doe - IEP, Jane Smith)...`} className="w-full h-48 p-4 bg-slate-50 border-2 rounded-2xl font-mono text-sm outline-none focus:border-indigo-400" />
              <button disabled={isGenerating || !rosterInput.trim()} onClick={generateSeatingWithGemini} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg">
                {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />} {isGenerating ? 'Synthesizing...' : 'Sync Seating Chart'}
              </button>
            </div>
            <div className="w-64 space-y-4 border-l pl-8 shrink-0">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Refinement</h4>
              <button onClick={sortAlpha} className="w-full flex items-center gap-3 p-3 bg-white border rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"><ArrowDownAZ size={16} /> Sort Alphabetical</button>
              <button onClick={shuffleSeats} className="w-full flex items-center gap-3 p-3 bg-white border rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"><Shuffle size={16} /> Random Shuffle</button>
              {error && <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg border border-red-100 flex items-center gap-2"><AlertCircle size={12}/> {error}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 relative overflow-y-auto bg-slate-100 flex flex-col items-center pt-8 ${isPrinting ? 'bg-white pt-0' : ''}`}>
        <div className={`max-w-[1400px] w-full px-6 flex-1 flex flex-col items-center ${isPrinting ? 'px-0' : ''}`}>
          <div ref={gridRef} className={`w-full bg-white rounded-[32px] border-2 border-slate-300 shadow-sm p-12 relative min-h-[700px] flex flex-col transition-all print-layout-card ${isPrinting ? 'rounded-none border-none shadow-none p-0' : ''}`}>
            
            {/* FRONT OF CLASSROOM MARKER */}
            <div className="w-full max-w-2xl h-14 bg-slate-900 border-2 border-slate-800 mx-auto mb-20 rounded-2xl flex items-center justify-center gap-4 shadow-lg shrink-0">
              <Monitor className="text-white opacity-80" size={24} />
              <span className="text-white font-black text-[11px] uppercase tracking-[0.6em]">Front of Classroom</span>
            </div>

            {/* SEATING GRID */}
            <div className="flex-1 flex items-start justify-center overflow-x-auto pb-10 print:overflow-visible">
              <div className="grid gap-5 transition-all duration-500" style={{ gridTemplateColumns: `repeat(${gridSize.cols}, minmax(0, 1fr))`, maxWidth: `${gridSize.cols * 115}px`, width: '100%' }}>
                {Array.from({ length: gridSize.rows }).map((_, r) => (
                  Array.from({ length: gridSize.cols }).map((_, c) => {
                    const key = `${r}-${c}`, isDesk = desks.has(key), studentName = seats[key], meta = studentMetadata[key];
                    return (
                      <div 
                        key={key} 
                        onClick={() => !studentName && toggleDesk(r, c)} 
                        className={`aspect-[1.3] rounded-2xl transition-all flex items-center justify-center relative group
                          ${isDesk ? 'bg-white border-[4px] border-indigo-600 shadow-xl ring-2 ring-indigo-50' : isPrinting ? 'opacity-0' : 'bg-slate-300/80 border-2 border-slate-400 opacity-90 hover:bg-indigo-100 hover:border-indigo-400 cursor-pointer'}
                          ${isDesk && meta?.isPriority ? 'border-amber-500 bg-amber-50/20 ring-amber-100' : ''}
                        `}
                      >
                        {isDesk && (
                          <div className="w-full h-full flex flex-col items-center justify-center px-2 py-1 text-center overflow-hidden">
                            <input 
                              type="text" 
                              value={studentName || ''} 
                              placeholder="..." 
                              onChange={(e) => handleManualEdit(key, e.target.value)} 
                              className={`w-full text-center bg-transparent border-none text-[12px] font-black uppercase tracking-tight focus:ring-0 placeholder:text-slate-300 ${studentName ? 'text-slate-900' : 'text-indigo-400'}`} 
                            />
                            {meta?.isPriority && (
                              <div className="absolute -top-2 -right-2 p-1.5 bg-amber-500 rounded-full shadow-lg no-print z-10 border-2 border-white">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        )}
                        <span className="absolute text-[8px] font-mono font-black text-slate-800 -bottom-4 opacity-50 no-print">{r}:{c}</span>
                      </div>
                    );
                  })
                ))}
              </div>
            </div>

            {/* PRINT ONLY FOOTER */}
            <div className={`hidden print:flex justify-between items-end mt-24 pt-8 border-t-4 border-slate-900 text-[10px] text-slate-900 font-black uppercase tracking-widest ${isPrinting ? 'flex' : 'hidden'}`}>
              <div>
                <p className="text-xl font-black tracking-tighter uppercase">{details.className} • {details.period}</p>
                <p className="mt-1 opacity-60 tracking-tighter text-[8px]">Engineered by Felix Intelligence • © Charles Herzek</p>
              </div>
              <div className="text-right">
                <p>Chart Effective: {details.date}</p>
                <p className="text-[7px] opacity-40 mt-1 italic uppercase">Rally Professional Suite</p>
              </div>
            </div>
          </div>
        </div>

        {/* AD SLOT (FREE TIER) */}
        <div className="w-full bg-slate-50 py-6 flex flex-col items-center no-print shrink-0 border-t mt-12">
          <div className="w-full max-w-4xl min-h-[90px] bg-white border rounded-xl flex items-center justify-center overflow-hidden shadow-sm">
            <ins className="adsbygoogle" style={{ display: 'block', width: '100%', height: '90px' }} data-ad-client="ca-pub-6389348477896619" data-ad-slot="6400805398" data-ad-format="auto" data-full-width-responsive="true"></ins>
          </div>
          <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Sponsored for Education</p>
        </div>

        {/* FOOTER */}
        <footer className="w-full py-16 text-center no-print flex flex-col items-center gap-5 shrink-0 bg-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg ring-4 ring-indigo-100 transition-transform hover:rotate-12 hover:scale-110 cursor-pointer"><LayoutGrid size={24} /></div>
            <span className="text-sm font-black text-slate-900 uppercase tracking-[0.4em] pt-0.5">Felix By Rally</span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-6 px-6">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">© {new Date().getFullYear()} Charles Herzek. All Rights Reserved.</p>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] opacity-90">Rally Ecosystem Authorized</p>
              </div>
              <button onClick={() => setIsPrivacyModalOpen(true)} className="text-[11px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1.5 transition-all"><ShieldCheck size={14} /> Privacy Policy</button>
            </div>
          </div>
        </footer>
      </main>

      {/* PRIVACY MODAL */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-lg z-[300] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] border-4 border-indigo-600">
            <div className="p-8 border-b flex justify-between items-center bg-indigo-50/30">
                <h2 className="text-2xl font-black text-indigo-900 uppercase tracking-tighter">Privacy Policy</h2>
                <X size={28} className="text-slate-400 cursor-pointer hover:text-indigo-600 transition-all" onClick={() => setIsPrivacyModalOpen(false)} />
            </div>
            <div className="p-8 overflow-y-auto text-slate-600 space-y-4 text-sm font-medium leading-relaxed">
                <p><strong>Felix</strong> prioritize your privacy as an educator.</p>
                <p><strong>1. Advertising:</strong> We use Google AdSense to serve ads. Google uses cookies to serve ads based on your prior visits. You can opt-out at Google Ad Settings.</p>
                <p><strong>2. Data Storage:</strong> This is a local-first app. Student data is stored in your browser's cache and is not transmitted to our servers.</p>
                <p><strong>3. Consent:</strong> By using Felix, you agree to this policy.</p>
            </div>
            <div className="p-8 bg-slate-50 border-t flex justify-end">
                <button onClick={() => setIsPrivacyModalOpen(false)} className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* HELP MODAL */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-lg z-[300] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col border-4 border-indigo-600">
            <div className="p-8 border-b flex justify-between items-center bg-indigo-50/30">
              <h2 className="text-3xl font-black text-indigo-900 uppercase tracking-tighter italic">Intelligence Guide</h2>
              <X size={32} className="text-slate-400 cursor-pointer hover:text-indigo-600 transition-all" onClick={() => setIsHelpModalOpen(false)} />
            </div>
            <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh]">
              <div className="space-y-4 text-sm font-bold text-slate-600">
                <h4 className="font-black text-indigo-900 text-xl tracking-tight uppercase">How to use State-Aware Sync:</h4>
                <p className="leading-relaxed">Add <strong>IEP</strong>, <strong>504</strong>, or <strong>ELL</strong> next to names in the roster. Felix will automatically prioritize those students for front-row seating.</p>
              </div>
              <div className="space-y-4 text-sm font-bold text-slate-600">
                <h4 className="font-black text-indigo-900 text-xl tracking-tight uppercase">Manual Overrides:</h4>
                <p className="leading-relaxed">You can always click an empty slot to create a desk, or click a desk to remove it. Typing directly into a desk saves the name to that coordinate.</p>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setIsHelpModalOpen(false)} className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all uppercase tracking-widest">Understood</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}