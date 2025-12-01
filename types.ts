export enum AppMode {
  EXPLORE = 'EXPLORE',
  PRACTICE = 'PRACTICE',
  EXAM = 'EXAM',
}

export enum Topic {
  LENSES_MIRRORS = 'Lenses & Mirrors',
  INTERFERENCE = 'Interference & Diffraction',
  REFRACTION = 'Reflection & Refraction',
}

export interface Equation {
  name: string;
  latex: string;
  description: string;
  simple?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isImage?: boolean; 
  timestamp: number;
  isHiddenSolution?: boolean; // For exam mode
}

export interface RayOpticsState {
  focalLength: number;
  objectDistance: number;
  objectHeight: number;
  opticType: 'lens' | 'mirror'; 
  subType: 'converging' | 'diverging'; // Concave Mirror/Conv Lens vs Convex Mirror/Conc Lens
}

export interface InterferenceState {
  wavelength: number; // in nm
  slitSeparation: number; // in micrometers (d)
  slitWidth: number; // in micrometers (a)
  screenDistance: number; // in meters (L)
  mode: 'single' | 'double';
}