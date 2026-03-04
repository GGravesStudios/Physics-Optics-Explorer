import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import MathDisplay from './MathDisplay';
import { calculatePrincipalRays, OpticParams, Ray, C_INCIDENT, C_REFRACTED } from '../src/utils/opticsEngine';

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

    // Viewport State
    const [viewBox, setViewBox] = useState({ x: -400, y: -250, w: 800, h: 500 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);

    // --- Physics Engines (Memoized) ---

    // 1. Single Lens/Mirror Calculation
    const singleOpticResult = useMemo<{ rays: Ray[], q: number, m: number, type: string, description: string }>(() => {
        const params: OpticParams = {
            objX: -objDist,
            objY: objHeight,
            opticX: 0,
            f: focalLengthMag * (subType === 'diverging' ? -1 : 1),
            opticType,
            subType
        };
        return calculatePrincipalRays(params);
    }, [objDist, objHeight, focalLengthMag, opticType, subType]);

    // 2. Two-Lens System Calculation
    const twoLensResult = useMemo<{ l1Result: { rays: Ray[], q: number, m: number, type: string, description: string }, l2Result: { rays: Ray[], q: number, m: number, type: string, description: string }, M_total: number, q1: number, p2: number, q2: number }>(() => {
        // Lens 1
        const p1: OpticParams = {
            objX: -objDist,
            objY: objHeight,
            opticX: 0,
            f: focalLengthMag, // Assuming converging
            opticType: 'lens',
            subType: 'converging'
        };
        const l1Result = calculatePrincipalRays(p1);

        // Calculate Image 1 position (if real, it's positive from opticX, if virtual, negative)
        const i1X = p1.opticX + l1Result.q;
        const i1Y = l1Result.m * objHeight;

        // Lens 2
        const p2: OpticParams = {
            objX: i1X,
            objY: i1Y,
            opticX: lensSep,
            f: lens2F, // Assuming converging
            opticType: 'lens',
            subType: 'converging'
        };
        const l2Result = calculatePrincipalRays(p2);

        // Final total mag
        const M_total = l1Result.m * l2Result.m;

        return {
            l1Result,
            l2Result,
            M_total,
            q1: l1Result.q,
            p2: lensSep - i1X,
            q2: l2Result.q
        };
    }, [objDist, objHeight, focalLengthMag, lens2F, lensSep]);

    // 3. Slab Calculation
    const slabResult = useMemo(() => {
        // Normal incidence approx: d' = t(1 - 1/n)
        const shift = slabThickness * (1 - 1 / slabIndex);
        return { shift };
    }, [slabThickness, slabIndex]);


    // --- Ray Tracing Generation (Memoized) ---
    const rays = useMemo<Ray[]>(() => {
        const r: Ray[] = [];
        const VIEW_LIMIT = 2000;

        if (systemMode === 'single') {
            r.push(...singleOpticResult.rays);
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
            // Lens 1 Rays
            const clippedL1Rays: Ray[] = twoLensResult.l1Result.rays.map((ray: Ray) => {
                if (ray.stroke === C_REFRACTED) {
                    if (twoLensResult.q1 > 0 && isFinite(twoLensResult.q1)) {
                        // Terminate at intermediate image exactly
                        return { ...ray, x2: twoLensResult.q1, y2: twoLensResult.l1Result.m * objHeight } as Ray;
                    } else if (ray.x2 > lensSep) {
                        // Virtual or infinite: clip at Lens 2 so they don't clutter everything past it
                        const slope = (ray.y2 - ray.y1) / (ray.x2 - ray.x1);
                        const yAtLens2 = ray.y1 + slope * (lensSep - ray.x1);
                        return { ...ray, x2: lensSep, y2: yAtLens2 } as Ray;
                    }
                }
                return ray;
            });
            r.push(...clippedL1Rays);

            // Render virtual traceback from Lens 2
            r.push(...twoLensResult.l2Result.rays.map((ray: Ray) => ({
                ...ray,
                // Color virtual extensions clearly
                stroke: ray.stroke === C_INCIDENT ? "#f59e0b" : ray.stroke // Orange for incident to L2
            } as Ray)));
        }

        return r;
    }, [systemMode, singleOpticResult, twoLensResult, slabIndex, slabThickness, objDist, objHeight]);


    // --- Viewport Orientation Controls ---
    const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
        // Prevent default scrolling via css, handle zoom
        e.preventDefault();
        const zoomRate = 0.1;
        const zoomFactor = e.deltaY > 0 ? (1 + zoomRate) : (1 - zoomRate);

        setViewBox(prev => {
            // Zoom towards center
            const newW = prev.w * zoomFactor;
            const newH = prev.h * zoomFactor;
            const newX = prev.x + (prev.w - newW) / 2;
            const newY = prev.y + (prev.h - newH) / 2;

            // Limit bounds prevent crazy zoom out/in
            if (newW > 10000 || newW < 100) return prev;
            return { x: newX, y: newY, w: newW, h: newH };
        });
    }, []);

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!isDragging || !svgRef.current) return;

        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setDragStart({ x: e.clientX, y: e.clientY });

        // Calculate mapped drag based on SVG width
        const rect = svgRef.current.getBoundingClientRect();
        const scaleX = viewBox.w / rect.width;
        const scaleY = viewBox.h / rect.height;

        setViewBox(prev => ({
            ...prev,
            x: prev.x - dx * scaleX,
            y: prev.y + dy * scaleY // Invert Y because SVG transform scale(1,-1)
        }));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const getDefaultBounds = (currentRays: Ray[]) => {
        if (currentRays.length === 0) return { x: -400, y: -250, w: 800, h: 500 };

        let minX = -objDist;
        let maxX = 0;
        let minY = 0;
        let maxY = objHeight;

        // Traverse all rays to find bounds
        currentRays.forEach(r => {
            if (r.x1 > -5000 && r.x1 < 5000) { minX = Math.min(minX, r.x1); maxX = Math.max(maxX, r.x1); }
            if (r.x2 > -5000 && r.x2 < 5000) { minX = Math.min(minX, r.x2); maxX = Math.max(maxX, r.x2); }
            if (r.y1 > -5000 && r.y1 < 5000) { minY = Math.min(minY, r.y1); maxY = Math.max(maxY, r.y1); }
            if (r.y2 > -5000 && r.y2 < 5000) { minY = Math.min(minY, r.y2); maxY = Math.max(maxY, r.y2); }
        });

        // Ensure focal points are included
        const elementsToCheckX = [
            -focalLengthMag, focalLengthMag,
            systemMode === 'two-lens' ? lensSep : 0,
            systemMode === 'two-lens' ? lensSep - lens2F : 0,
            systemMode === 'two-lens' ? lensSep + lens2F : 0,
            singleOpticResult.q > -5000 && singleOpticResult.q < 5000 ? singleOpticResult.q : 0,
            twoLensResult.q2 > -5000 && twoLensResult.q2 < 5000 ? twoLensResult.q2 + lensSep : 0
        ];

        elementsToCheckX.forEach(x => {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
        });

        // Calculate padding
        const paddingX = Math.max(50, (maxX - minX) * 0.15);
        const paddingY = Math.max(50, (maxY - minY) * 0.25);

        let finalW = (maxX - minX) + 2 * paddingX;
        let finalH = (maxY - minY) + 2 * paddingY;

        // Ensure Aspect Ratio is roughly maintained
        const targetAspect = 800 / 500;
        if (finalW / finalH > targetAspect) {
            finalH = finalW / targetAspect;
        } else {
            finalW = finalH * targetAspect;
        }

        const finalX = minX - paddingX;
        // SVG Y is inverted and center is weird, so we roughly balance
        const finalY = (minY + maxY) / 2 - (finalH / 2);

        return { x: finalX, y: finalY, w: finalW, h: finalH };
    };

    const autoFitView = () => {
        setViewBox(getDefaultBounds(rays));
    };

    // Viewport Initialization Bug Fix: Run ONCE on mount using a boolean flag
    const hasInitializedView = useRef(false);

    useEffect(() => {
        if (!hasInitializedView.current && rays.length > 0) {
            hasInitializedView.current = true;
            autoFitView();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rays]); // We watch rays so that the first valid ray calculation triggers the fit. HasInitialized prevents loops.


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
                    <div className="w-px bg-slate-300 mx-2" />
                    <button
                        onClick={autoFitView}
                        className="px-3 py-1.5 text-slate-500 hover:text-slate-700 rounded-md transition whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-amber-200"
                        title="Auto-Fit System in Viewport"
                    >
                        ⛶ Fit
                    </button>
                    <button
                        onClick={() => setViewBox({ x: -400, y: -250, w: 800, h: 500 })}
                        className="px-3 py-1.5 text-slate-500 hover:text-slate-700 rounded-md transition whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-amber-200"
                        title="Reset Viewport"
                    >
                        ↻ Reset
                    </button>
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
                                    <span>{singleOpticResult.type}</span>
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
                <div className="lg:col-span-8 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden relative min-h-[400px] shadow-sm cursor-grab active:cursor-grabbing">
                    <svg
                        ref={svgRef}
                        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                        className="w-full h-full preserve-3d absolute inset-0"
                        style={{ transform: 'scale(1, -1)', touchAction: 'none' }}
                        aria-label="Optics Simulation Canvas"
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                        </pattern>
                        {/* Make grid expansive to cover panning */}
                        <rect x="-10000" y="-10000" width="20000" height="20000" fill="url(#grid)" />

                        <line x1="-10000" y1="0" x2="10000" y2="0" stroke="#cbd5e1" strokeWidth="2" />
                        <line x1="0" y1="-10000" x2="0" y2="10000" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4" />

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

                                {/* Focal Points (F) and Center of Curvature (C) */}
                                {subType !== 'plane' && (
                                    <g>
                                        <circle cx={focalLengthMag * (subType === 'diverging' ? -1 : 1)} cy="0" r="3" fill="#000" />
                                        <text x={focalLengthMag * (subType === 'diverging' ? -1 : 1)} y="-10" textAnchor="middle" fill="#000" fontSize="12" fontWeight="bold" transform="scale(1,-1)">F</text>

                                        <circle cx={-focalLengthMag * (subType === 'diverging' ? -1 : 1)} cy="0" r="3" fill="#000" />
                                        <text x={-focalLengthMag * (subType === 'diverging' ? -1 : 1)} y="-10" textAnchor="middle" fill="#000" fontSize="12" fontWeight="bold" transform="scale(1,-1)">F'</text>

                                        {opticType === 'mirror' && (
                                            <>
                                                <circle cx={2 * focalLengthMag * (subType === 'diverging' ? -1 : 1)} cy="0" r="3" fill="#000" />
                                                <text x={2 * focalLengthMag * (subType === 'diverging' ? -1 : 1)} y="-10" textAnchor="middle" fill="#000" fontSize="12" fontWeight="bold" transform="scale(1,-1)">C</text>
                                            </>
                                        )}
                                    </g>
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
                                    <g opacity={0.6}>
                                        <line
                                            x1={twoLensResult.q1} // Q1 is calculated relative to Lens 1 (which is at x=0)
                                            y1="0"
                                            x2={twoLensResult.q1}
                                            y2={twoLensResult.l1Result.m * objHeight}
                                            stroke="#f59e0b"
                                            strokeWidth="2"
                                            strokeDasharray="4"
                                        />
                                        <circle
                                            cx={twoLensResult.q1}
                                            cy={twoLensResult.l1Result.m * objHeight}
                                            r="4"
                                            fill="#f59e0b" />
                                        <text x={twoLensResult.q1} y={twoLensResult.l1Result.m * objHeight > 0 ? twoLensResult.l1Result.m * objHeight + 15 : twoLensResult.l1Result.m * objHeight - 15} textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold" transform="scale(1,-1)">Intermediate</text>
                                    </g>
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
