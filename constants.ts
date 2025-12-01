import { Equation, Topic } from './types';

export interface EquationExtended extends Equation {
  simple: string; // Plain English explanation
}

export const EQUATIONS: Record<Topic, EquationExtended[]> = {
  [Topic.REFRACTION]: [
    { 
      name: "Snell's Law", 
      latex: "n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2", 
      description: "Relationship between angles of incidence and refraction.",
      simple: "Light bends when changing mediums. Higher 'n' means smaller angle."
    },
    { 
      name: "Index of Refraction", 
      latex: "n = \\frac{c}{v}", 
      description: "Ratio of speed of light in vacuum to medium.",
      simple: "How much slower light travels in a material." 
    },
    { 
      name: "Critical Angle", 
      latex: "\\sin\\theta_c = \\frac{n_2}{n_1}", 
      description: "For internal reflection (n1 > n2).",
      simple: "The angle where light gets trapped inside the denser material."
    },
    { 
      name: "Prism Deviation", 
      latex: "\\delta = \\theta_1 + \\theta_{2} - A", 
      description: "Total angular deviation through a prism.",
      simple: "Total bending of a light ray through a prism." 
    },
    {
      name: "Apparent Depth (Slab)",
      latex: "d' = d \\frac{n_2}{n_1}",
      description: "Apparent shift in depth when viewing through a medium.",
      simple: "Objects look closer when underwater or in glass."
    }
  ],
  [Topic.LENSES_MIRRORS]: [
    { 
      name: "Lens/Mirror Equation", 
      latex: "\\frac{1}{p} + \\frac{1}{q} = \\frac{1}{f}", 
      description: "Relates object (p), image (q), and focal length (f).",
      simple: "Calculates where the image forms."
    },
    { 
      name: "Magnification", 
      latex: "m = -\\frac{q}{p} = \\frac{h_i}{h_o}", 
      description: "Ratio of image height to object height.",
      simple: "Negative m means inverted. |m| > 1 means bigger."
    },
    { 
      name: "Lens Power", 
      latex: "P = \\frac{1}{f}", 
      description: "Optical power measured in Diopters (m⁻¹).",
      simple: "Stronger lenses have shorter focal lengths."
    },
    { 
      name: "Lens Maker's Eq", 
      latex: "\\frac{1}{f} = (n-1)\\left(\\frac{1}{R_1} - \\frac{1}{R_2}\\right)", 
      description: "Focal length based on curvature.",
      simple: "Determines f based on the lens shape and material."
    },
    {
      name: "Two-Lens System",
      latex: "\\frac{1}{f_{eff}} = \\frac{1}{f_1} + \\frac{1}{f_2} - \\frac{d}{f_1 f_2}",
      description: "Effective focal length of two separated lenses.",
      simple: "How two lenses work together (like in a microscope)."
    }
  ],
  [Topic.INTERFERENCE]: [
    { 
      name: "Double-Slit Maxima", 
      latex: "d \\sin\\theta = m\\lambda", 
      description: "Condition for constructive interference (Bright spots).",
      simple: "Where peaks meet peaks (Bright Fringes)."
    },
    { 
      name: "Single-Slit Minima", 
      latex: "a \\sin\\theta = m\\lambda", 
      description: "Condition for destructive diffraction (Dark spots).",
      simple: "Where the wave cancels itself out (Dark spots)."
    },
    { 
      name: "Thin Film (Constructive)", 
      latex: "2t = (m + \\frac{1}{2})\\frac{\\lambda}{n}", 
      description: "Phase shift assumed (1 hard reflection).",
      simple: "Why soap bubbles look colorful."
    },
    { 
      name: "Resolution (Rayleigh)", 
      latex: "\\theta_{min} = \\frac{1.22\\lambda}{D}", 
      description: "Minimum angular separation.",
      simple: "The limit of detail a lens can resolve."
    },
  ]
};