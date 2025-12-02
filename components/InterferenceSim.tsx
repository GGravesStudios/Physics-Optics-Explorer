import React, { useState, useRef, useEffect } from 'react';
import MathDisplay from './MathDisplay';

const InterferenceSim: React.FC = () => {
  const [mode, setMode] = useState<'single' | 'double'>('double');
  const [wavelength, setWavelength] = useState(532); // nm
  const [separation, setSeparation] = useState(40); // micrometers (d)
  const [width, setWidth] = useState(10); // micrometers (a)
  const [screenDist] = useState(1.0); // meters (L)

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Constraint: d must be > a for double slit (centers must be apart more than width)
    if (mode === 'double' && separation <= width) {
        setSeparation(width + 5);
    }
  }, [width, mode, separation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); 
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    
    // Fill background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    const lambda = wavelength * 1e-9;
    const d = separation * 1e-6; 
    const a = width * 1e-6;      
    const L = screenDist;
    const screenWidthPhysical = 0.15; // meters
    const metersPerPixel = screenWidthPhysical / w;

    // Cache color string
    const hue = 280 - (wavelength - 380) * (280/370);
    const color = `hsl(${hue}, 100%, 50%)`;
    
    const stripHeight = h * 0.4;
    const centerY = h * 0.75; 
    const graphScale = h * 0.25;

    // --- Draw Intensity Graph ---
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    for (let x = 0; x < w; x+=2) { // Step 2 for performance
       const yPos = (x - w/2) * metersPerPixel;
       const sinTheta = yPos / L;
       
       // Diffraction term (Sinc^2)
       const beta = (Math.PI * a * sinTheta) / lambda;
       const diffraction = beta === 0 ? 1 : Math.pow(Math.sin(beta) / beta, 2);
       
       // Interference term (Cos^2)
       const alpha = (Math.PI * d * sinTheta) / lambda;
       const interference = mode === 'double' ? Math.pow(Math.cos(alpha), 2) : 1;
       
       const intensity = diffraction * interference;
       const graphY = centerY - (intensity * graphScale);

       if (x === 0) ctx.moveTo(x, graphY);
       else ctx.lineTo(x, graphY);
    }
    ctx.stroke();

    // Fill under graph
    ctx.lineTo(w, centerY);
    ctx.lineTo(0, centerY);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // --- Draw Simulated Screen View ---
    for (let x = 0; x < w; x+=2) {
       const yPos = (x - w/2) * metersPerPixel;
       const sinTheta = yPos / L;
       const beta = (Math.PI * a * sinTheta) / lambda;
       const diffraction = beta === 0 ? 1 : Math.pow(Math.sin(beta) / beta, 2);
       const alpha = (Math.PI * d * sinTheta) / lambda;
       const interference = mode === 'double' ? Math.pow(Math.cos(alpha), 2) : 1;
       const intensity = diffraction * interference;

       if (intensity > 0.01) {
          ctx.fillStyle = color;
          ctx.globalAlpha = intensity;
          ctx.fillRect(x, 0, 2, stripHeight);
       }
    }
    ctx.globalAlpha = 1.0;

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText('Simulated Screen View', 10, 20);
    ctx.fillText('Intensity Profile', 10, centerY + 20);
    
    // Axis Markers
    ctx.fillStyle = '#64748b';
    ctx.fillText('0', w/2 - 3, centerY + 12);
    ctx.fillText('Position y', w - 50, centerY + 12);

  }, [wavelength, separation, width, mode, screenDist]);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border border-amber-200 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h3 className="text-xl font-bold text-amber-900 flex items-center gap-2">
            <span>〰️</span> Wave Optics Lab
            </h3>
            <p className="text-xs text-slate-500 mt-1">Interference & Diffraction Pattern Generator</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium shadow-inner">
           <button onClick={() => setMode('single')} className={`px-4 py-1.5 rounded-md transition ${mode === 'single' ? 'bg-white shadow ring-1 ring-black/5 text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-700'}`}>Single Slit</button>
           <button onClick={() => setMode('double')} className={`px-4 py-1.5 rounded-md transition ${mode === 'double' ? 'bg-white shadow ring-1 ring-black/5 text-amber-700 font-bold' : 'text-slate-500 hover:text-slate-700'}`}>Double Slit</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2">
            <canvas ref={canvasRef} width={600} height={300} className="w-full h-auto bg-slate-900 rounded-lg shadow-inner border border-slate-700 block"></canvas>
            <div className="mt-2 text-center text-[10px] text-slate-400 flex justify-between px-4">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Bright = Constructive</span>
                <span className="flex items-center gap-1">Dark = Destructive <span className="w-2 h-2 rounded-full bg-slate-900 border border-slate-600"></span></span>
            </div>
         </div>

         <div className="space-y-6">
            <div className="group">
               <label className="flex justify-between text-sm font-medium text-slate-700 mb-2 group-hover:text-amber-700 transition-colors">
                  <span>Wavelength (<MathDisplay latex="\lambda" inline />)</span>
                  <span className="text-amber-600 font-mono text-xs bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">{wavelength} nm</span>
               </label>
               <input aria-label="Wavelength" type="range" min="380" max="750" value={wavelength} onChange={(e) => setWavelength(Number(e.target.value))} className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
               <div className="h-1.5 w-full rounded-full mt-2 opacity-80" style={{background: 'linear-gradient(to right, #8b5cf6, #3b82f6, #22c55e, #eab308, #f97316, #ef4444)'}}></div>
            </div>

               <div className="group">
               <label className="flex justify-between text-sm font-medium text-slate-700 mb-2 group-hover:text-amber-700 transition-colors">
                  <span>Slit Width (<MathDisplay latex="a" inline />)</span>
                  <span className="text-amber-600 font-mono text-xs bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">{width} µm</span>
               </label>
               <input aria-label="Slit Width" type="range" min="2" max="50" step="1" value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
            </div>

               {mode === 'double' && (
               <div className="group animate-fade-in">
                  <label className="flex justify-between text-sm font-medium text-slate-700 mb-2 group-hover:text-amber-700 transition-colors">
                     <span>Slit Separation (<MathDisplay latex="d" inline />)</span>
                     <span className="text-amber-600 font-mono text-xs bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">{separation} µm</span>
                  </label>
                  <input aria-label="Slit Separation" type="range" min={width + 5} max="100" value={separation} onChange={(e) => setSeparation(Math.max(width + 5, Number(e.target.value)))} className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                  <p className="text-[10px] text-slate-400 mt-1">Distance between slit centers</p>
               </div>
            )}
            
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-xs text-amber-900 leading-relaxed shadow-sm">
               <p className="font-bold mb-1 uppercase tracking-wide text-amber-800/60 text-[10px]">Physics Concept</p>
               {mode === 'double' ? (
                  <p>Double-slit creates narrow <strong className="text-amber-700">interference fringes</strong> (cosine term) inside a wider <strong className="text-amber-700">diffraction envelope</strong> (sinc term). Notice how changing <MathDisplay latex="d" inline /> changes fringe density.</p>
               ) : (
                   <p>Single slit creates a wide central maximum. A <strong className="text-amber-700">narrower slit (<MathDisplay latex="a" inline />)</strong> spreads the light out more due to diffraction (<MathDisplay latex="\\theta \\approx \\frac{\\lambda}{a}" inline />).</p>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default InterferenceSim;
