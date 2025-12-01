import React, { useState } from 'react';
import { AppMode, Topic } from './types';
import { EQUATIONS } from './constants';
import Equation from './components/Equation';
import RayOpticsSim from './components/RayOpticsSim';
import InterferenceSim from './components/InterferenceSim';
import PrismSim from './components/PrismSim';
import AiTutor from './components/AiTutor';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.EXPLORE);
  const [activeTopic, setActiveTopic] = useState<Topic>(Topic.LENSES_MIRRORS);
  const [showFormulaSheet, setShowFormulaSheet] = useState(false);

  const renderActiveModule = () => {
    switch (activeTopic) {
      case Topic.LENSES_MIRRORS:
        return <RayOpticsSim />;
      case Topic.INTERFERENCE:
        return <InterferenceSim />;
      case Topic.REFRACTION:
        return <PrismSim />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800 font-sans selection:bg-amber-200">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-amber-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm font-serif">
              Φ
            </div>
            <h1 className="text-lg font-bold tracking-tight text-amber-950 hidden sm:block">
              Physics Optics Explorer
            </h1>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
            {(Object.values(AppMode) as AppMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  mode === m 
                    ? 'bg-white text-amber-700 shadow-sm ring-1 ring-black/5' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === AppMode.EXPLORE ? 'Explore' : m === AppMode.PRACTICE ? 'Practice' : 'Exam Mode'}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setShowFormulaSheet(!showFormulaSheet)}
            className="text-amber-700 hover:text-amber-900 font-medium text-sm flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 transition hover:bg-amber-100"
          >
            <span className="font-serif italic text-lg leading-none">Σ</span> 
            <span className="hidden sm:inline">Formulas</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Navigation & Constants */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Topic Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Modules</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {(Object.values(Topic) as Topic[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTopic(t)}
                    className={`w-full text-left px-4 py-4 text-sm transition-colors flex justify-between items-center ${
                      activeTopic === t 
                        ? 'bg-amber-50 text-amber-900 font-medium border-l-4 border-amber-500' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t}
                    {activeTopic === t && <span className="text-amber-500">▶</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Formula Sheet */}
            <div className={`
                fixed inset-0 z-40 bg-black/50 lg:static lg:bg-transparent lg:block transition-opacity duration-200
                ${showFormulaSheet ? 'opacity-100' : 'opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto'}
            `} onClick={() => setShowFormulaSheet(false)}>
              <div className={`
                  absolute right-0 top-0 h-full w-full sm:w-[500px] lg:w-full lg:static bg-slate-900 text-slate-100 lg:rounded-xl shadow-2xl lg:shadow-lg p-5 overflow-y-auto transition-transform duration-300
                  ${showFormulaSheet ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
              `} onClick={e => e.stopPropagation()}>
                
                <div className="flex justify-between items-center mb-4 lg:hidden">
                   <h3 className="font-bold text-amber-400">Equations</h3>
                   <button onClick={() => setShowFormulaSheet(false)} className="text-slate-400 p-2">✕</button>
                </div>

                <div className="hidden lg:block absolute top-0 right-0 p-4 opacity-5 text-8xl font-serif">∫</div>
                <h3 className="hidden lg:block font-bold text-amber-400 mb-4 border-b border-slate-700 pb-2">
                  {activeTopic.split(' ')[0]} Equations
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                  {EQUATIONS[activeTopic]?.map((eq, idx) => (
                    <div key={idx} className="group bg-slate-800/50 rounded-lg border border-slate-700 hover:border-amber-500/30 transition flex flex-col">
                      <div className="p-3 bg-slate-800/80 rounded-t-lg border-b border-slate-700 text-slate-200">
                          <Equation 
                            latex={eq.latex} 
                            className="bg-transparent border-none text-amber-300 text-lg shadow-none my-0 py-0" 
                          />
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-center">
                         <div className="text-xs font-bold text-amber-200/90 mb-1">{eq.name}</div>
                         <div className="text-[10px] text-slate-400 leading-relaxed">
                            {eq.simple}
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Main Content */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Simulation Area */}
            <section className="animate-fade-in">
               {renderActiveModule()}
            </section>

            {/* AI Tutor */}
            <section>
              <AiTutor mode={mode} currentTopic={activeTopic} />
            </section>

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;