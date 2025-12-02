# Optics Explorer

Interactive study tool for optics topics built with React, TypeScript, Vite, and Tailwind. Explore labs for geometric optics, wave interference, and refraction while keeping a clean formula sheet and AI tutor beside you.

## Features
- Geometric optics lab: single optic, glass slab, and two-lens ray tracing with live diagrams.
- Wave optics lab: single/double slit diffraction and interference intensity plots.
- Refraction & prism lab: Snell's law, total internal reflection, and deviation visualized.
- Equation sidebar: consistent LaTeX-rendered formula sheet across all modules.
- AI tutor: Gemini-powered explanations, practice problems, and diagram requests with KaTeX math rendering.

## Tech Stack
- React + TypeScript + Vite
- Tailwind CSS for styling
- KaTeX for equation rendering
- React Markdown + remark-math for inline/block math in chat
- Gemini API integration for tutoring and diagram prompts

## Setup
1. Install dependencies: `npm install`
2. Create `.env.local` and set `GEMINI_API_KEY=<your key>`
3. Run the dev server: `npm run dev`
4. Build for production: `npm run build`
