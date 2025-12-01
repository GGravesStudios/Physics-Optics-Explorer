import React, { useState, useMemo } from 'react';
import Equation from './Equation';

const PrismSim: React.FC = () => {
  const [nPrism, setNPrism] = useState(1.50); // Glass
  const [nEnv, setNEnv] = useState(1.00); // Air
  const [angleA, setAngleA] = useState(60); // Apex Angle in degrees
  const [incidentAngle, setIncidentAngle] = useState(45); // Degrees relative to normal

  // --- Physics Logic (Memoized) ---
  const result = useMemo(() => {
    // 1. First Interface (Left Face)
    // Snell's Law: n1 * sin(theta1) = n2 * sin(theta2)
    const theta1Rad = (incidentAngle * Math.PI) / 180;
    
    // Check for critical angle/TIR on entry
    let sinTheta2 = (nEnv / nPrism) * Math.sin(theta1Rad);
    let theta2Rad = 0;
    
    if (Math.abs(sinTheta2) > 1) {
        return { isTIR: true, stage: 'entry' };
    }
    theta2Rad = Math.asin(sinTheta2);

    // 2. Geometry Transfer
    // theta2 + theta3 = A
    const angleARad = (angleA * Math.PI) / 180;
    const theta3Rad = angleARad - theta2Rad;

    // 3. Second Interface (Right Face)
    // Snell's Law: n2 * sin(theta3) = n1 * sin(theta4)
    const sinTheta4 = (nPrism / nEnv) * Math.sin(theta3Rad);
    const isTIR = Math.abs(sinTheta4) > 1;
    
    const theta4Rad = isTIR ? 0 : Math.asin(sinTheta4);
    const deviationRad = theta1Rad + theta4Rad - angleARad;

    // Calculate Critical Angle for reference
    const criticalAngle = nPrism > nEnv ? (Math.asin(nEnv / nPrism) * 180 / Math.PI) : null;

    return {
        theta1Rad,
        theta2Rad,
        theta3Rad,
        theta4Rad,
        deviationDeg: (deviationRad * 180) / Math.PI,
        isTIR,
        stage: isTIR ? 'exit' : 'complete',
        criticalAngle
    };
  }, [nPrism, nEnv, angleA, incidentAngle]);

  // --- Visualization Calculations ---
  const viz = useMemo(() => {
    const angleARad = (angleA * Math.PI) / 180;
    const apexX = 0;
    const apexY = 150;
    const prismHeight = 250;
    const baseHalfWidth = prismHeight * Math.tan(angleARad / 2);
    
    const p1 = { x: apexX, y: apexY }; 
    const p2 = { x: -baseHalfWidth, y: apexY - prismHeight }; 
    const p3 = { x: baseHalfWidth, y: apexY - prismHeight }; 

    // Hit 1
    const hit1Ratio = 0.4;
    const hit1 = {
        x: p1.x + (p2.x - p1.x) * hit1Ratio,
        y: p1.y + (p2.y - p1.y) * hit1Ratio
    };

    // Face Normals
    const faceLeftAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const normal1Angle = faceLeftAngle + Math.PI / 2; 
    
    // Incoming Ray
    const rayInAngle = normal1Angle + Math.PI + (result.theta1Rad || 0);
    const rayStart = {
        x: hit1.x - 150 * Math.cos(rayInAngle),
        y: hit1.y - 150 * Math.sin(rayInAngle)
    };

    // Ray Inside
    const rayInsideAngle = normal1Angle + Math.PI + (result.theta2Rad || 0);
    const dxRay = Math.cos(rayInsideAngle);
    const dyRay = Math.sin(rayInsideAngle);
    const mFace2 = (p3.y - p1.y) / (p3.x - p1.x);
    
    const t = (p1.y - hit1.y + mFace2 * (hit1.x - p1.x)) / (dyRay - mFace2 * dxRay);
    
    const hit2 = {
        x: hit1.x + t * dxRay,
        y: hit1.y + t * dyRay
    };

    const faceRightAngle = Math.atan2(p3.y - p1.y, p3.x - p1.x);
    const normal2Angle = faceRightAngle - Math.PI / 2; 

    // Exit Ray
    const rayExitAngle = normal2Angle + (result.theta4Rad || 0);
    const rayEnd = {
        x: hit2.x + 150 * Math.cos(rayExitAngle),
        y: hit2.y + 150 * Math.sin(rayExitAngle)
    };
    
    // TIR Ray (Reflection at Face 2)
    const tirAngle = normal2Angle + Math.PI - (result.theta3Rad || 0);
    const tirEnd = {
        x: hit2.x + 100 * Math.cos(tirAngle),
        y: hit2.y + 100 * Math.sin(tirAngle)
    };

    return { p1, p2, p3, hit1, hit2, rayStart, rayEnd, tirEnd, normal1Angle, normal2Angle };
  }, [angleA, result]);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl border border-amber-200 shadow-lg">
       <div className="flex items-center gap-3 mb-6">
         <span className="text-3xl">💎</span>
         <div>
            <h3 className="text-xl font-bold text-amber-900">Refraction & Prism Lab</h3>
            <p className="text-xs text-slate-500">Snell's Law & Internal Reflection Simulator</p>
         </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-6">
             <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-4">
                <div className="group">
                   <label className="flex justify-between text-sm font-medium text-slate-700 group-hover:text-amber-700 transition-colors">
                      <span>Prism Index (<Equation latex="n_2" inline />)</span>
                      <span className="text-amber-700 font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-amber-100">{nPrism.toFixed(2)}</span>
                   </label>
                   <input aria-label="Prism Index" type="range" min="1.0" max="2.5" step="0.01" value={nPrism} onChange={(e) => setNPrism(Number(e.target.value))} className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
                   <p className="text-[10px] text-slate-400 mt-1">Glass ~1.5, Diamond ~2.4</p>
                </div>
                <div className="group">
                   <label className="flex justify-between text-sm font-medium text-slate-700 group-hover:text-amber-700 transition-colors">
                      <span>Environment (<Equation latex="n_1" inline />)</span>
                      <span className="text-amber-700 font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-amber-100">{nEnv.toFixed(2)}</span>
                   </label>
                   <input aria-label="Environment Index" type="range" min="1.0" max="1.5" step="0.01" value={nEnv} onChange={(e) => setNEnv(Number(e.target.value))} className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
                </div>
                <div className="group">
                   <label className="flex justify-between text-sm font-medium text-slate-700 group-hover:text-amber-700 transition-colors">
                      <span>Apex Angle (<Equation latex="A" inline />)</span>
                      <span className="text-amber-700 font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-amber-100">{angleA}°</span>
                   </label>
                   <input aria-label="Apex Angle" type="range" min="30" max="90" step="1" value={angleA} onChange={(e) => setAngleA(Number(e.target.value))} className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
                </div>
                <div className="group">
                   <label className="flex justify-between text-sm font-medium text-slate-700 group-hover:text-amber-700 transition-colors">
                      <span>Incident Angle (<Equation latex="\theta_1" inline />)</span>
                      <span className="text-amber-700 font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-amber-100">{incidentAngle}°</span>
                   </label>
                   <input aria-label="Incident Angle" type="range" min="0" max="85" step="1" value={incidentAngle} onChange={(e) => setIncidentAngle(Number(e.target.value))} className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
                </div>
             </div>

             <div className="bg-slate-800 text-slate-100 p-4 rounded-xl text-sm font-mono shadow-inner border border-slate-700">
                <h4 className="font-bold text-amber-400 mb-2 border-b border-slate-600 pb-1 font-sans">Calculations</h4>
                <ul className="space-y-2 text-xs">
                   <li className="flex justify-between">
                      <span className="text-slate-400">Refraction 1 (<Equation latex="\theta_2" inline />):</span>
                      <span>{result.stage === 'entry' ? 'TIR' : ((result.theta2Rad! * 180)/Math.PI).toFixed(1)}°</span>
                   </li>
                   <li className="flex justify-between">
                      <span className="text-slate-400">Internal Angle (<Equation latex="\theta_3" inline />):</span>
                      <span>{result.theta3Rad ? ((result.theta3Rad * 180)/Math.PI).toFixed(1) : '-'}°</span>
                   </li>
                   <li className="flex justify-between">
                      <span className="text-slate-400">Exit Angle (<Equation latex="\theta_4" inline />):</span>
                      <span className={result.isTIR ? "text-red-400 font-bold" : "text-green-400"}>
                          {result.isTIR ? "TIR (Trapped)" : result.theta4Rad !== undefined ? ((result.theta4Rad * 180)/Math.PI).toFixed(1) + "°" : "-"}
                      </span>
                   </li>
                   {result.criticalAngle && (
                     <li className="flex justify-between text-slate-500">
                        <span>Critical Angle:</span>
                        <span>{result.criticalAngle.toFixed(1)}°</span>
                     </li>
                   )}
                   {!result.isTIR && (
                       <li className="flex justify-between border-t border-slate-600 pt-1 mt-1">
                          <span className="text-slate-300">Deviation (<Equation latex="\delta" inline />):</span>
                          <span className="text-amber-300 font-bold">{result.deviationDeg?.toFixed(1)}°</span>
                       </li>
                   )}
                </ul>
             </div>
          </div>

          {/* Visualization */}
          <div className="lg:col-span-2 bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-700 relative h-[400px]">
             <svg viewBox="-300 -200 600 400" className="w-full h-full preserve-3d" style={{ transform: 'scale(1, -1)' }} aria-label="Prism Diagram">
                {/* Prism */}
                <path 
                   d={`M ${viz.p1.x} ${viz.p1.y} L ${viz.p2.x} ${viz.p2.y} L ${viz.p3.x} ${viz.p3.y} Z`} 
                   fill="rgba(255, 255, 255, 0.05)" 
                   stroke="rgba(255,255,255,0.4)" 
                   strokeWidth="2"
                />
                
                {/* Normals */}
                <line 
                  x1={viz.hit1.x} y1={viz.hit1.y} 
                  x2={viz.hit1.x + 50 * Math.cos(viz.normal1Angle)} y2={viz.hit1.y + 50 * Math.sin(viz.normal1Angle)} 
                  stroke="#94a3b8" strokeDasharray="4" opacity="0.4"
                />
                 <line 
                  x1={viz.hit2.x} y1={viz.hit2.y} 
                  x2={viz.hit2.x + 50 * Math.cos(viz.normal2Angle)} y2={viz.hit2.y + 50 * Math.sin(viz.normal2Angle)} 
                  stroke="#94a3b8" strokeDasharray="4" opacity="0.4"
                />

                {/* Rays */}
                <line x1={viz.rayStart.x} y1={viz.rayStart.y} x2={viz.hit1.x} y2={viz.hit1.y} stroke="#ef4444" strokeWidth="3" />
                
                {result.stage === 'entry' ? (
                   <circle cx={viz.hit1.x} cy={viz.hit1.y} r="5" fill="red" />
                ) : (
                   <>
                       <line x1={viz.hit1.x} y1={viz.hit1.y} x2={viz.hit2.x} y2={viz.hit2.y} stroke="#fbbf24" strokeWidth="3" />
                       
                       {result.isTIR ? (
                           <line 
                             x1={viz.hit2.x} y1={viz.hit2.y} 
                             x2={viz.tirEnd.x} y2={viz.tirEnd.y}
                             stroke="#fbbf24" strokeWidth="2" strokeDasharray="4" opacity="0.8"
                           />
                       ) : (
                           <line x1={viz.hit2.x} y1={viz.hit2.y} x2={viz.rayEnd.x} y2={viz.rayEnd.y} stroke="#22c55e" strokeWidth="3" />
                       )}
                   </>
                )}

                {/* Points */}
                <circle cx={viz.hit1.x} cy={viz.hit1.y} r="3" fill="white"/>
                <circle cx={viz.hit2.x} cy={viz.hit2.y} r="3" fill="white"/>

             </svg>
             
             {result.isTIR && (
                <div className="absolute top-4 right-4 bg-red-900/80 text-red-100 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500 animate-pulse">
                   ⚠️ Total Internal Reflection
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default PrismSim;
