import React, { useState, useMemo } from 'react';
import MathDisplay from './MathDisplay';

type SystemMode = 'single' | 'slab' | 'two-lens';

const RayOpticsSim: React.FC = () => {

    // --- SVG Path Helpers ---
    const getLensPath = (type: 'converging' | 'diverging') => {
        if (type === 'converging') {
            // Biconvex (bulging out)
            return "M 0 -150 Q 30 0 0 150 Q -30 0 0 -150 Z";
        } else {
            // Biconcave (pinched in)
            return "M -15 -150 Q 0 0 -15 150 L 15 150 Q 0 0 15 -150 Z";
        }
    };

    const getMirrorPath = (type: 'converging' | 'diverging' | 'plane') => {
        if (type === 'plane') return "M 0 -150 L 0 150";
        if (type === 'converging') {
            // Concave mirror ( ) ) - Light from left hits inside
            return "M -15 -150 Q 15 0 -15 150";
        } else {
            // Convex mirror ( ( ) - Light from left hits outside
            return "M 15 -150 Q -15 0 15 150";
        }
    };
    // Modes
    const [systemMode, setSystemMode] = useState<SystemMode>('single');

    // Common State
    const [objDist, setObjDist] = useState(200); // 10 to 500
    const [objHeight, setObjHeight] = useState(60); // 10 to 150

    // Single Optic State
    const [focalLengthMag, setFocalLengthMag] = useState(100);
    const [opticType, setOpticType] = useState<'lens' | 'mirror'>('lens');
    const [subType, setSubType] = useState<'converging' | 'diverging' | 'plane'>('converging');

    // Two-Lens State
    const [lens2F, setLens2F] = useState(100);
    const [lensSep, setLensSep] = useState(300);

    // Slab State
    const [slabThickness, setSlabThickness] = useState(150);
    const [slabIndex, setSlabIndex] = useState(1.5);

    // --- Physics Engines (Memoized) ---

    // 1. Single Lens/Mirror Calculation
    const singleOpticResult = useMemo(() => {
        const f = subType === 'plane' ? Infinity : (subType === 'converging' ? 1 : -1) * focalLengthMag;

        // Plane Mirror Special Case
        if (subType === 'plane') {
            return { q: -objDist, m: 1, f: Infinity, type: 'Virtual', orientation: 'Upright', description: 'Virtual image behind mirror' };
        }

        // Thin lens: 1/d_o + 1/d_i = 1/f -> d_i = d_o f / (d_o - f)
        let q = Infinity;
        if (Math.abs(objDist - f) > 0.1) {
            q = (objDist * f) / (objDist - f);
        }

        const m = isFinite(q) ? -q / objDist : Infinity;
        const isReal = (opticType === 'lens' && q > 0) || (opticType === 'mirror' && q > 0);
        const type = isReal ? 'Real' : 'Virtual';
        const orientation = m < 0 ? 'Inverted' : 'Upright';
        const description = isReal ? "Projectable on screen" : "Visible looking into optic";

        return { q, m, f, type, orientation, description };
    }, [objDist, focalLengthMag, opticType, subType]);

    // 2. Two-Lens System Calculation
    const twoLensResult = useMemo(() => {
        // Lens 1 (Converging, fixed at x=0)
        const f1 = focalLengthMag;
        const p1 = objDist;

        // Calculate Intermediate Image
        let q1 = Infinity;
        if (Math.abs(p1 - f1) > 0.1) {
            q1 = (p1 * f1) / (p1 - f1);
        }

        // Lens 2 (Converging, at x = lensSep)
        const f2 = lens2F;
        let p2: number, q2: number, M_total: number;

        // If q1 is infinite (collimated beam between lenses)
        if (!isFinite(q1)) {
            p2 = Infinity;
            q2 = f2;
            M_total = -f2 / f1; // Telescope angular mag approx
        } else {
            p2 = lensSep - q1; // Object distance for L2

            if (Math.abs(p2 - f2) < 0.1) {
                q2 = Infinity;
                M_total = Infinity;
            } else {
                q2 = (p2 * f2) / (p2 - f2);
                const m1 = -q1 / p1;
                const m2 = -q2 / p2;
                M_total = m1 * m2;
            }
        }

        return { q1, p2, q2, M_total };
    }, [objDist, focalLengthMag, lens2F, lensSep]);

    // 3. Slab Calculation
    const slabResult = useMemo(() => {
        // Normal incidence approx: d' = t(1 - 1/n)
        const shift = slabThickness * (1 - 1 / slabIndex);
        return { shift };
    }, [slabThickness, slabIndex]);


    // --- Ray Tracing Generation (Memoized) ---
    const rays = useMemo(() => {
        type Ray = { x1: number, y1: number, x2: number, y2: number, stroke: string, dashed?: boolean, opacity?: number };
        const r: Ray[] = [];
        const VIEW_LIMIT = 800;

        if (systemMode === 'single') {
            const { f, q } = singleOpticResult;
            const objX = -objDist;
            const objY = objHeight;

            // --- DIVERGING LENS (Concave) ---
            if (opticType === 'lens' && subType === 'diverging') {
                const fMag = Math.abs(f);

                // Ray 1: Parallel -> Diverge from near focal point
                // Incident
                r.push({ x1: objX, y1: objY, x2: 0, y2: objY, stroke: "#d97706" });

                // Refracted (Diverging)
                // Slope determined by virtual source at (-fMag, 0)
                // m = (y2 - y1) / (x2 - x1) = (objY - 0) / (0 - (-fMag)) = objY / fMag
                const slope1 = objY / fMag;
                const exitX1 = VIEW_LIMIT;
                const exitY1 = objY + slope1 * exitX1;
                r.push({ x1: 0, y1: objY, x2: exitX1, y2: exitY1, stroke: "#d97706" });

                // Traceback to focal point
                r.push({ x1: -fMag, y1: 0, x2: 0, y2: objY, stroke: "#d97706", dashed: true, opacity: 0.4 });

                // Ray 2: Through Center (Undeviated)
                const slope2 = objY / objX; // Negative slope
                const exitX2 = VIEW_LIMIT;
                const exitY2 = slope2 * exitX2;
                r.push({ x1: objX, y1: objY, x2: exitX2, y2: exitY2, stroke: "#ea580c" });

                // Ray 3: Towards Far Focal Point -> Parallel
                // Incident (virtual target is +fMag)
                // Slope to hit (+fMag, 0) from (objX, objY)
                const slope3 = (0 - objY) / (fMag - objX);
                const hitY3 = objY + slope3 * (0 - objX); // y-intercept at lens

                r.push({ x1: objX, y1: objY, x2: 0, y2: hitY3, stroke: "#b45309" });
                // Dashed extension towards far focal point
                r.push({ x1: 0, y1: hitY3, x2: fMag, y2: 0, stroke: "#b45309", dashed: true, opacity: 0.3 });

                // Refracted (Parallel)
                r.push({ x1: 0, y1: hitY3, x2: VIEW_LIMIT, y2: hitY3, stroke: "#b45309" });

                // Traceback for Ray 3 (to find image)
                r.push({ x1: -VIEW_LIMIT, y1: hitY3, x2: 0, y2: hitY3, stroke: "#b45309", dashed: true, opacity: 0.4 });

            } else {
                // --- CONVERGING LENS & MIRRORS ---
                // Ray 1: Parallel to Axis -> Through Focal Point
                r.push({ x1: objX, y1: objY, x2: 0, y2: objY, stroke: "#d97706" }); // Incident

                if (subType === 'plane') {
                    r.push({ x1: 0, y1: objY, x2: -VIEW_LIMIT, y2: objY, stroke: "#d97706" }); // Reflection
                } else {
                    const slope = -objY / f;
                    const direction = opticType === 'lens' ? 1 : -1;
                    const exitX = direction * VIEW_LIMIT;
                    const exitY = objY + slope * (exitX - 0);

                    r.push({ x1: 0, y1: objY, x2: exitX, y2: exitY, stroke: "#d97706" });

                    // Virtual Traceback
                    if ((opticType === 'lens' && f < 0) || (opticType === 'mirror')) {
                        const backX = -direction * VIEW_LIMIT;
                        const backY = objY + slope * (backX - 0);
                        r.push({ x1: 0, y1: objY, x2: backX, y2: backY, stroke: "#d97706", dashed: true, opacity: 0.3 });
                    }
                }

                // Ray 2: Through Center (Lens) or Vertex (Mirror)
                if (opticType === 'lens') {
                    const slope = objY / objX;
                    const exitX = VIEW_LIMIT;
                    const exitY = slope * exitX;
                    r.push({ x1: objX, y1: objY, x2: exitX, y2: exitY, stroke: "#ea580c" });

                    if (q < 0 && isFinite(q)) {
                        r.push({ x1: 0, y1: 0, x2: -VIEW_LIMIT, y2: -slope * VIEW_LIMIT, stroke: "#ea580c", dashed: true, opacity: 0.3 });
                    }
                } else {
                    // Mirror Vertex (i=r)
                    const slope = -(objY / objX);
                    const exitX = -VIEW_LIMIT;
                    const exitY = slope * exitX;
                    r.push({ x1: objX, y1: objY, x2: 0, y2: 0, stroke: "#ea580c" });
                    r.push({ x1: 0, y1: 0, x2: exitX, y2: exitY, stroke: "#ea580c" });
                    r.push({ x1: 0, y1: 0, x2: VIEW_LIMIT, y2: -slope * VIEW_LIMIT, stroke: "#ea580c", dashed: true, opacity: 0.3 });
                }
            }

        } else if (systemMode === 'slab') {
            const startX = -objDist;
            const startY = objHeight;
            const face1X = -slabThickness / 2;
            const face2X = slabThickness / 2;
            const hitY = 20; // Visual approximation

            r.push({ x1: startX, y1: startY, x2: face1X, y2: hitY, stroke: "#ef4444" });

            const slopeIn = (hitY - startY) / (face1X - startX);
            const theta1 = Math.atan(slopeIn);
            const theta2 = Math.asin(Math.sin(theta1) / slabIndex);
            const slopeInside = Math.tan(theta2);

            const exitY = hitY + slopeInside * (face2X - face1X);
            r.push({ x1: face1X, y1: hitY, x2: face2X, y2: exitY, stroke: "#ef4444" });

            const slopeOut = slopeIn;
            r.push({ x1: face2X, y1: exitY, x2: VIEW_LIMIT, y2: exitY + slopeOut * (VIEW_LIMIT - face2X), stroke: "#ef4444" });

            // Apparent source trace
            r.push({ x1: face1X, y1: hitY, x2: VIEW_LIMIT, y2: hitY + slopeIn * (VIEW_LIMIT - face1X), stroke: "#94a3b8", dashed: true, opacity: 0.3 });

        } else if (systemMode === 'two-lens') {
            const objX = -objDist;
            const objY = objHeight;
            const L1X = 0;
            const L2X = lensSep;
            const f1 = focalLengthMag;
            const f2 = lens2F;

            // Ray 1
            r.push({ x1: objX, y1: objY, x2: L1X, y2: objY, stroke: "#d97706" });
            const m1 = -objY / f1;
            const hitY2 = objY + m1 * (L2X - L1X);
            r.push({ x1: L1X, y1: objY, x2: L2X, y2: hitY2, stroke: "#d97706" });
            const m2 = m1 - (hitY2 / f2);
            r.push({ x1: L2X, y1: hitY2, x2: VIEW_LIMIT, y2: hitY2 + m2 * (VIEW_LIMIT - L2X), stroke: "#d97706" });

            // Ray 2
            const mC1 = objY / objX;
            const hitY2_C = mC1 * (L2X - L1X);
            r.push({ x1: objX, y1: objY, x2: L2X, y2: hitY2_C, stroke: "#ea580c" });
            const mC2 = mC1 - (hitY2_C / f2);
            r.push({ x1: L2X, y1: hitY2_C, x2: VIEW_LIMIT, y2: hitY2_C + mC2 * (VIEW_LIMIT - L2X), stroke: "#ea580c" });
        }

        return r;
    }, [systemMode, objDist, objHeight, focalLengthMag, lens2F, lensSep, slabIndex, slabThickness, opticType, subType, singleOpticResult.f, singleOpticResult.q]);


    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl border border-amber-200 shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-amber-900 flex items-center gap-2">
                        <span>🔭</span> Geometric Optics Lab
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Ray Tracing & Image Formation</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium overflow-x-auto shadow-inner">
                    {(['single', 'two-lens', 'slab'] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => setSystemMode(m)}
                            className={`px-3 py-1.5 rounded-md capitalize transition whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-amber-200
                    ${systemMode === m
                                    ? 'bg-white text-amber-700 shadow ring-1 ring-black/5 font-bold'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {m === 'two-lens' ? 'Two-Lens System' : m === 'single' ? 'Single Optic' : 'Glass Slab'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Controls Sidebar */}
                <div className="lg:col-span-4 space-y-6">

                    {systemMode === 'single' && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-3">
                            <div className="flex rounded-md bg-white/50 p-1 border border-amber-200/50">
                                <button onClick={() => setOpticType('lens')} className={`flex-1 text-xs font-bold py-1.5 rounded transition ${opticType === 'lens' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-800 hover:bg-white'}`}>Lens</button>
                                <button onClick={() => setOpticType('mirror')} className={`flex-1 text-xs font-bold py-1.5 rounded transition ${opticType === 'mirror' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-800 hover:bg-white'}`}>Mirror</button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {(['converging', 'diverging', 'plane'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setSubType(t)}
                                        disabled={opticType === 'lens' && t === 'plane'}
                                        className={`text-xs py-2 px-1 rounded border capitalize transition-all focus:outline-none
                            ${subType === t
                                                ? 'bg-white border-amber-400 text-amber-700 font-bold ring-1 ring-amber-200'
                                                : 'bg-white/50 border-transparent text-slate-500 hover:bg-white hover:border-slate-200'
                                            }
                            ${opticType === 'lens' && t === 'plane' ? 'opacity-30 cursor-not-allowed hidden' : ''} 
                        `}
                                    >
                                        {t === 'converging'
                                            ? (opticType === 'lens' ? 'Convex' : 'Concave')
                                            : t === 'diverging'
                                                ? (opticType === 'lens' ? 'Concave' : 'Convex')
                                                : 'Plane'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-5 p-1">
                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Object Parameters</div>
                            <div className="space-y-4">
                                <div className="group">
                                    <div className="flex justify-between text-sm mb-1 group-hover:text-amber-700 transition-colors">
                                        <span className="text-slate-700 font-medium">Object Distance (<MathDisplay latex="d_o" inline />)</span>
                                        <span className="font-mono text-xs text-amber-600 bg-amber-50 px-1.5 rounded border border-amber-100">{objDist} cm</span>
                                    </div>
                                    <input aria-label="Object Distance" type="range" min="10" max="400" step="5" value={objDist} onChange={(e) => setObjDist(Number(e.target.value))} className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                </div>
                                <div className="group">
                                    <div className="flex justify-between text-sm mb-1 group-hover:text-amber-700 transition-colors">
                                        <span className="text-slate-700 font-medium">Height (<MathDisplay latex="h_o" inline />)</span>
                                        <span className="font-mono text-xs text-amber-600 bg-amber-50 px-1.5 rounded border border-amber-100">{objHeight} cm</span>
                                    </div>
                                    <input aria-label="Object Height" type="range" min="10" max="150" step="5" value={objHeight} onChange={(e) => setObjHeight(Number(e.target.value))} className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100" />

                        <div>
                            <div className="flex justify-between text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Optical Properties</div>

                            {systemMode === 'single' && subType !== 'plane' && (
                                <div className="mt-3 group">
                                    <div className="flex justify-between text-sm mb-1 group-hover:text-amber-700 transition-colors">
                                        <span className="text-slate-700 font-medium">Focal Length (<MathDisplay latex="f" inline />)</span>
                                        <span className="font-mono text-xs text-amber-600 bg-amber-50 px-1.5 rounded border border-amber-100">{focalLengthMag} cm</span>
                                    </div>
                                    <input aria-label="Focal Length" type="range" min="10" max="300" step="5" value={focalLengthMag} onChange={(e) => setFocalLengthMag(Number(e.target.value))} className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
                                        <span>Strong Power</span>
                                        <span>Weak Power</span>
                                    </div>
                                </div>
                            )}

                            {systemMode === 'two-lens' && (
                                <div className="space-y-4 mt-3">
                                    <div className="group">
                                        <div className="flex justify-between text-sm mb-1 group-hover:text-blue-700 transition-colors">
                                            <span className="text-slate-700 font-medium">Lens 1 (<MathDisplay latex="f_1" inline />)</span>
                                            <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1.5 rounded border border-blue-100">{focalLengthMag} cm</span>
                                        </div>
                                        <input aria-label="Lens 1 Focal Length" type="range" min="20" max="200" step="5" value={focalLengthMag} onChange={(e) => setFocalLengthMag(Number(e.target.value))} className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                    <div className="group">
                                        <div className="flex justify-between text-sm mb-1 group-hover:text-blue-700 transition-colors">
                                            <span className="text-slate-700 font-medium">Lens 2 (<MathDisplay latex="f_2" inline />)</span>
                                            <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1.5 rounded border border-blue-100">{lens2F} cm</span>
                                        </div>
                                        <input aria-label="Lens 2 Focal Length" type="range" min="20" max="200" step="5" value={lens2F} onChange={(e) => setLens2F(Number(e.target.value))} className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                    <div className="group">
                                        <div className="flex justify-between text-sm mb-1 group-hover:text-slate-700 transition-colors">
                                            <span className="text-slate-700 font-medium">Separation (<MathDisplay latex="d" inline />)</span>
                                            <span className="font-mono text-xs text-slate-600 bg-slate-100 px-1.5 rounded border border-slate-200">{lensSep} cm</span>
                                        </div>
                                        <input aria-label="Lens Separation" type="range" min="50" max="500" step="10" value={lensSep} onChange={(e) => setLensSep(Number(e.target.value))} className="w-full accent-slate-500 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                </div>
                            )}

                            {systemMode === 'slab' && (
                                <div className="space-y-4 mt-3">
                                    <div className="group">
                                        <div className="flex justify-between text-sm mb-1 group-hover:text-amber-700 transition-colors">
                                            <span className="text-slate-700 font-medium">Index (<MathDisplay latex="n" inline />)</span>
                                            <span className="font-mono text-xs text-amber-600 bg-amber-50 px-1.5 rounded border border-amber-100">{slabIndex}</span>
                                        </div>
                                        <input aria-label="Refractive Index" type="range" min="1.0" max="2.5" step="0.1" value={slabIndex} onChange={(e) => setSlabIndex(Number(e.target.value))} className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                    <div className="group">
                                        <div className="flex justify-between text-sm mb-1 group-hover:text-amber-700 transition-colors">
                                            <span className="text-slate-700 font-medium">Thickness (<MathDisplay latex="t" inline />)</span>
                                            <span className="font-mono text-xs text-amber-600 bg-amber-50 px-1.5 rounded border border-amber-100">{slabThickness} cm</span>
                                        </div>
                                        <input aria-label="Slab Thickness" type="range" min="10" max="300" step="10" value={slabThickness} onChange={(e) => setSlabThickness(Number(e.target.value))} className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-800 text-slate-200 p-4 rounded-xl text-xs shadow-inner font-mono border border-slate-700">
                        <h4 className="font-bold text-amber-400 mb-2 border-b border-slate-700 pb-1 text-sm font-sans">
                            {systemMode === 'two-lens' ? 'System Analysis' : 'Image Properties'}
                        </h4>

                        {systemMode === 'single' && (
                            <ul className="space-y-2">
                                <li className="flex justify-between">
                                    <span className="text-slate-400">Image Distance (<MathDisplay latex="d_i" inline />):</span>
                                    <span className={singleOpticResult.q > 0 ? "text-green-400" : "text-red-400"}>
                                        {isFinite(singleOpticResult.q) ? singleOpticResult.q.toFixed(1) + ' cm' : 'Infinity'}
                                    </span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-slate-400">Magnification:</span>
                                    <span>{singleOpticResult.m.toFixed(2)}x</span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-slate-400">Type:</span>
                                    <span>{singleOpticResult.type} ({singleOpticResult.orientation})</span>
                                </li>
                                <li className="pt-2 text-[10px] text-slate-500 italic border-t border-slate-700/50">
                                    {singleOpticResult.description}
                                </li>
                            </ul>
                        )}

                        {systemMode === 'two-lens' && (
                            <ul className="space-y-1.5">
                                <li className="flex justify-between">
                                    <span className="text-slate-400">First Image (<MathDisplay latex="d_{i1}" inline />):</span>
                                    <span>{isFinite(twoLensResult.q1) ? twoLensResult.q1.toFixed(1) + ' cm' : 'Infinity'}</span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-slate-400">Obj for L2 (<MathDisplay latex="d_{o2}" inline />):</span>
                                    <span>{isFinite(twoLensResult.p2) ? twoLensResult.p2.toFixed(1) + ' cm' : 'Infinity'}</span>
                                </li>
                                <li className="flex justify-between border-t border-slate-700 pt-1 mt-1">
                                    <span className="text-slate-300">Final Image (<MathDisplay latex="d_{i2}" inline />):</span>
                                    <span className="text-amber-300 font-bold">{isFinite(twoLensResult.q2) ? twoLensResult.q2.toFixed(1) + ' cm' : 'Infinity'}</span>
                                </li>
                                <li className="flex justify-between">
                                    <span className="text-slate-400">Total Mag (<MathDisplay latex="M" inline />):</span>
                                    <span>{isFinite(twoLensResult.M_total) ? twoLensResult.M_total.toFixed(2) + 'x' : 'N/A'}</span>
                                </li>
                            </ul>
                        )}

                        {systemMode === 'slab' && (
                            <ul className="space-y-1.5">
                                <li className="flex justify-between">
                                    <span className="text-slate-400">Lateral Shift:</span>
                                    <span className="text-amber-300">{slabResult.shift.toFixed(1)} cm</span>
                                </li>
                                <li className="text-[10px] text-slate-500 pt-1">Objects appear closer/shifted</li>
                            </ul>
                        )}
                    </div>
                </div>

                {/* Visualizer */}
                <div className="lg:col-span-8 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden relative min-h-[400px] shadow-sm">
                    <svg viewBox="-400 -250 800 500" className="w-full h-full preserve-3d absolute inset-0" style={{ transform: 'scale(1, -1)' }} aria-label="Optics Simulation Canvas">
                        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                        </pattern>
                        <rect x="-400" y="-250" width="800" height="500" fill="url(#grid)" />

                        <line x1="-400" y1="0" x2="400" y2="0" stroke="#cbd5e1" strokeWidth="2" />
                        <line x1="0" y1="-250" x2="0" y2="250" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4" />

                        {/* Object */}
                        <g>
                            <line x1={-objDist} y1="0" x2={-objDist} y2={objHeight} stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
                            <circle cx={-objDist} cy={objHeight} r="5" fill="#fbbf24" />
                        </g>

                        {/* Single Optic Graphics */}
                        {systemMode === 'single' && (
                            <g>
                                {opticType === 'lens' ? (
                                    <path
                                        d={getLensPath(subType === 'diverging' ? 'diverging' : 'converging')}
                                        fill={subType === 'diverging' ? "#cffafe" : "#bae6fd"}
                                        stroke={subType === 'diverging' ? "#0891b2" : "#0284c7"}
                                        strokeWidth="2"
                                        opacity="0.6"
                                    />
                                ) : (
                                    <path
                                        d={getMirrorPath(subType)}
                                        fill="none"
                                        stroke="#64748b"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                    />
                                )}

                                {isFinite(singleOpticResult.q) && Math.abs(singleOpticResult.q) < 5000 && (
                                    <g opacity={0.7}>
                                        <line
                                            x1={opticType === 'lens' ? singleOpticResult.q : -singleOpticResult.q}
                                            y1="0"
                                            x2={opticType === 'lens' ? singleOpticResult.q : -singleOpticResult.q}
                                            y2={singleOpticResult.m * objHeight}
                                            stroke={singleOpticResult.type === 'Real' ? "#22c55e" : "#ef4444"}
                                            strokeWidth="4"
                                            strokeDasharray={singleOpticResult.type === 'Real' ? "0" : "4"}
                                        />
                                        <circle
                                            cx={opticType === 'lens' ? singleOpticResult.q : -singleOpticResult.q}
                                            cy={singleOpticResult.m * objHeight}
                                            r="4"
                                            fill={singleOpticResult.type === 'Real' ? "#22c55e" : "#ef4444"}
                                        />
                                    </g>
                                )}
                            </g>
                        )}

                        {/* Slab Optic Graphics */}
                        {systemMode === 'slab' && (
                            <g>
                                <rect
                                    x={-slabThickness / 2} y="-150"
                                    width={slabThickness} height="300"
                                    fill="#bae6fd" stroke="#0ea5e9" strokeWidth="2" opacity="0.3"
                                />
                                <text x="0" y="-160" textAnchor="middle" fill="#0ea5e9" fontSize="12" transform="scale(1,-1)">Glass Block (n={slabIndex})</text>
                            </g>
                        )}

                        {/* Two-Lens Graphics */}
                        {systemMode === 'two-lens' && (
                            <g>
                                {/* L1 */}
                                <path d={getLensPath('converging')} fill="#bae6fd" stroke="#0284c7" strokeWidth="2" opacity="0.6" />
                                <text x="0" y="-160" textAnchor="middle" fill="#0284c7" fontSize="12" transform="scale(1,-1)">L1</text>

                                {/* L2 */}
                                <g transform={`translate(${lensSep}, 0)`}>
                                    <path d={getLensPath('converging')} fill="#bae6fd" stroke="#0284c7" strokeWidth="2" opacity="0.6" />
                                    <text x="0" y="-160" textAnchor="middle" fill="#0284c7" fontSize="12" transform="scale(1,-1)">L2</text>
                                </g>

                                {/* Images */}
                                {isFinite(twoLensResult.q1) && (
                                    <circle cx={twoLensResult.q1} cy="0" r="3" fill="#cbd5e1" />
                                )}
                                {isFinite(twoLensResult.q2) && (
                                    <g opacity={0.7}>
                                        <line
                                            x1={twoLensResult.q2 + lensSep}
                                            y1="0"
                                            x2={twoLensResult.q2 + lensSep}
                                            y2={twoLensResult.M_total * objHeight}
                                            stroke="#22c55e"
                                            strokeWidth="4"
                                        />
                                        <circle
                                            cx={twoLensResult.q2 + lensSep}
                                            cy={twoLensResult.M_total * objHeight}
                                            r="4"
                                            fill="#22c55e"
                                        />
                                    </g>
                                )}
                            </g>
                        )}

                        {/* Rays */}
                        {rays.map((ray, i) => (
                            <line
                                key={i}
                                x1={ray.x1} y1={ray.y1}
                                x2={ray.x2} y2={ray.y2}
                                stroke={ray.stroke}
                                strokeWidth="2"
                                opacity={ray.opacity || 0.6}
                                strokeDasharray={ray.dashed ? "6" : "0"}
                            />
                        ))}

                    </svg>
                </div>
            </div>
        </div>
    );
};

export default RayOpticsSim;
