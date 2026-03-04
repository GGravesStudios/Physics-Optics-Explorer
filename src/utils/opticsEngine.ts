export type Ray = { x1: number, y1: number, x2: number, y2: number, stroke: string, dashed?: boolean, opacity?: number };

export const C_INCIDENT = "#FF0000"; // Red
export const C_REFRACTED = "#0000FF"; // Blue
export const C_VIRTUAL = "#808080";   // Gray

export type OpticParams = {
    objX: number;
    objY: number;
    opticX: number;
    f: number;
    opticType: 'lens' | 'mirror';
    subType: 'converging' | 'diverging' | 'plane';
};

export const calculatePrincipalRays = (params: OpticParams): { rays: Ray[], q: number, m: number, type: string, description: string } => {
    const { objX, objY, f, opticType, subType, opticX } = params;

    // 1. Infinity / NaN propagation failsafe
    if (!isFinite(objX) || !isFinite(objY) || !isFinite(f)) {
        return {
            rays: [],
            q: Infinity,
            m: Infinity,
            type: 'Invalid',
            description: 'Object is at Infinity or undefined'
        };
    }

    const r: Ray[] = [];
    const VIEW_LIMIT = 2000;

    // Relative object parameters to the optic
    const p = opticX - objX;

    let q = Infinity;
    const isAtFocalPoint = Math.abs(p - f) <= 0.1;
    if (subType === 'plane') {
        q = -p;
    } else if (!isAtFocalPoint) {
        q = (p * f) / (p - f);
    }


    const m = isFinite(q) ? -q / p : Infinity;
    const isReal = (opticType === 'lens' && q > 0) || (opticType === 'mirror' && q > 0);
    const type = isReal ? 'Real' : 'Virtual';
    const description = isReal ? "Projectable on screen" : "Visible looking into optic";

    // --- LENSES ---
    if (opticType === 'lens') {
        const fMag = Math.abs(f);
        const isConverging = subType === 'converging';

        // Ray 1: Parallel to Principal Axis
        r.push({ x1: objX, y1: objY, x2: opticX, y2: objY, stroke: C_INCIDENT }); // Incident

        if (isConverging) {
            // Refracts through back focal point (x = opticX + fMag, y = 0)
            const slope1 = (0 - objY) / ((opticX + fMag) - opticX);
            const exitY1 = objY + slope1 * VIEW_LIMIT;
            r.push({ x1: opticX, y1: objY, x2: opticX + VIEW_LIMIT, y2: exitY1, stroke: C_REFRACTED });

            // Virtual traceback if virtual image
            if (q < 0 && isFinite(q)) {
                const imgX = opticX + q;
                const imgY = objY + slope1 * (imgX - opticX); // Actually just m * objY, but slope works too
                r.push({ x1: opticX, y1: objY, x2: imgX, y2: imgY, stroke: C_VIRTUAL, dashed: true });
            }
        } else {
            // Diverging: Refracts as if coming from front focal point (x = opticX - fMag, y = 0)
            const slope1 = (objY - 0) / (opticX - (opticX - fMag));
            const exitY1 = objY + slope1 * VIEW_LIMIT;
            r.push({ x1: opticX, y1: objY, x2: opticX + VIEW_LIMIT, y2: exitY1, stroke: C_REFRACTED });

            // Virtual traceback to virtual image
            if (isFinite(q)) {
                const imgX = opticX + q;
                const imgY = objY + slope1 * (imgX - opticX);
                r.push({ x1: opticX, y1: objY, x2: imgX, y2: imgY, stroke: C_VIRTUAL, dashed: true });
            }
        }

        // Ray 2: Through Optical Center (undeviated) - ONLY drawn if at focal point
        if (isAtFocalPoint) {
            const slope2 = objY / (objX - opticX);
            const exitY2 = slope2 * VIEW_LIMIT;
            r.push({ x1: objX, y1: objY, x2: opticX + VIEW_LIMIT, y2: exitY2, stroke: C_INCIDENT });

            // Technically changes from Incident -> Refracted once it crosses OpticX
            r.push({ x1: opticX, y1: slope2 * (opticX - objX) + objY, x2: opticX + VIEW_LIMIT, y2: slope2 * VIEW_LIMIT, stroke: C_REFRACTED, opacity: 0.0 }); // Dummy stroke for code structure

            // Note: Since q is Infinity here, it will never trace back virtually
        }

        // Ray 3: Through/Towards Focal Point
        if (isConverging) {
            // Passes through front focal point (x = opticX - fMag, y = 0) -> refracts parallel
            const slope3 = (0 - objY) / ((opticX - fMag) - objX);
            const hitY3 = objY + slope3 * (opticX - objX); // y-intercept at optic

            if (Math.abs(objX - (opticX - fMag)) > 0.1) {
                r.push({ x1: objX, y1: objY, x2: opticX, y2: hitY3, stroke: C_INCIDENT });
                r.push({ x1: opticX, y1: hitY3, x2: opticX + VIEW_LIMIT, y2: hitY3, stroke: C_REFRACTED });

                // Traceback
                if (q < 0 && isFinite(q)) {
                    const imgX = opticX + q;
                    const imgY = hitY3; // Ray refracts parallel, so y is constant
                    r.push({ x1: opticX, y1: hitY3, x2: imgX, y2: imgY, stroke: C_VIRTUAL, dashed: true });
                }
            }

        } else {
            // Diverging: Aimed at back focal point (x = opticX + fMag, y = 0) -> refracts parallel
            const slope3 = (0 - objY) / ((opticX + fMag) - objX);
            const hitY3 = objY + slope3 * (opticX - objX); // y-intercept at optic

            r.push({ x1: objX, y1: objY, x2: opticX, y2: hitY3, stroke: C_INCIDENT });
            // Dashed virtual part approaching the focal point
            r.push({ x1: opticX, y1: hitY3, x2: opticX + fMag, y2: 0, stroke: C_VIRTUAL, dashed: true, opacity: 0.5 });

            // Refracted part parallel
            r.push({ x1: opticX, y1: hitY3, x2: opticX + VIEW_LIMIT, y2: hitY3, stroke: C_REFRACTED });

            // Traceback
            if (q < 0 && isFinite(q)) {
                const imgX = opticX + q;
                const imgY = hitY3; // parallel
                r.push({ x1: opticX, y1: hitY3, x2: imgX, y2: imgY, stroke: C_VIRTUAL, dashed: true });
            }
        }

    } else {
        // --- MIRRORS ---
        if (subType === 'plane') {
            // Ray 1: Parallel to Axis -> horizontal hit -> reflect back
            r.push({ x1: objX, y1: objY, x2: opticX, y2: objY, stroke: C_INCIDENT });
            r.push({ x1: opticX, y1: objY, x2: opticX - VIEW_LIMIT, y2: objY, stroke: C_REFRACTED });
            r.push({ x1: opticX, y1: objY, x2: opticX + VIEW_LIMIT, y2: objY, stroke: C_VIRTUAL, dashed: true });

            // Ray 2: Hit origin
            const slope2 = objY / (objX - opticX);
            r.push({ x1: objX, y1: objY, x2: opticX, y2: 0, stroke: C_INCIDENT });
            const reflSlope2 = -slope2;
            r.push({ x1: opticX, y1: 0, x2: opticX - VIEW_LIMIT, y2: reflSlope2 * -VIEW_LIMIT, stroke: C_REFRACTED });
            r.push({ x1: opticX, y1: 0, x2: opticX + VIEW_LIMIT, y2: slope2 * VIEW_LIMIT, stroke: C_VIRTUAL, dashed: true });

        } else {
            const isConcave = subType === 'converging';

            // F relative to opticX
            const fX = opticX - f;

            // Ray 1: Parallel -> Through/From Focal Point
            r.push({ x1: objX, y1: objY, x2: opticX, y2: objY, stroke: C_INCIDENT });

            if (isConcave) {
                // Reflects through F at (fX, 0)
                const slope1 = (0 - objY) / (fX - opticX);
                r.push({ x1: opticX, y1: objY, x2: opticX - VIEW_LIMIT, y2: objY + slope1 * (-VIEW_LIMIT), stroke: C_REFRACTED });

                if (q < 0 && isFinite(q)) {
                    const imgX = opticX - q; // Mirrors form virtual images behind it (+x direction relative to opticX, so opticX - q since q is negative)
                    const imgY = objY + slope1 * (imgX - opticX);
                    r.push({ x1: opticX, y1: objY, x2: imgX, y2: imgY, stroke: C_VIRTUAL, dashed: true });
                }
            } else {
                // Reflects as if coming from F at (fX, 0)
                const slope1 = (0 - objY) / (fX - opticX);
                r.push({ x1: opticX, y1: objY, x2: opticX - VIEW_LIMIT, y2: objY + slope1 * (-VIEW_LIMIT), stroke: C_REFRACTED });

                if (isFinite(q)) {
                    const imgX = opticX - q;
                    const imgY = objY + slope1 * (imgX - opticX);
                    r.push({ x1: opticX, y1: objY, x2: imgX, y2: imgY, stroke: C_VIRTUAL, dashed: true });
                }
            }

            // Ray 2: Through Focal Point -> Parallel
            const slope2 = (0 - objY) / (fX - objX);
            const hitY2 = objY + slope2 * (opticX - objX);

            if (Math.abs(objX - fX) > 0.1) {
                r.push({ x1: objX, y1: objY, x2: opticX, y2: hitY2, stroke: C_INCIDENT });

                if (!isConcave) {
                    r.push({ x1: opticX, y1: hitY2, x2: fX, y2: 0, stroke: C_VIRTUAL, dashed: true, opacity: 0.5 });
                }

                r.push({ x1: opticX, y1: hitY2, x2: opticX - VIEW_LIMIT, y2: hitY2, stroke: C_REFRACTED });

                if ((isConcave && q < 0 && isFinite(q)) || !isConcave) {
                    const imgX = opticX - q;
                    const imgY = hitY2; // parallel
                    r.push({ x1: opticX, y1: hitY2, x2: imgX, y2: imgY, stroke: C_VIRTUAL, dashed: true });
                }
            }

            // Ray 3: Vertex (i=r) - ONLY drawn if at focal point
            if (isAtFocalPoint) {
                const slope3 = objY / (objX - opticX);
                const reflSlope3 = -slope3;
                r.push({ x1: objX, y1: objY, x2: opticX, y2: 0, stroke: C_INCIDENT });
                r.push({ x1: opticX, y1: 0, x2: opticX - VIEW_LIMIT, y2: reflSlope3 * -VIEW_LIMIT, stroke: C_REFRACTED });
                // Note: Since q is Infinity here, it will never trace back virtually
            }
        }
    }

    return { rays: r, q, m, type, description };
}
