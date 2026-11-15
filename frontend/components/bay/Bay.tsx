'use client';
// Crew health (formerly "medical bay"): one focused view at a time (chosen in the sidebar), sharing one selection (crew, moment, system).
import Alerts from '@/components/bay/Alerts';
import { BayProvider } from '@/components/bay/BayContext';
import Copilot from '@/components/bay/Copilot';
import CrewForm from '@/components/bay/CrewForm';
import { CrewHeat, SpaceWeather } from '@/components/bay/CrewWeather';
import { BayHeader, Brief, Legend, Timeline } from '@/components/bay/Overview';
import Scanner from '@/components/bay/Scanner';
import Simulator from '@/components/bay/Simulator';
import Status from '@/components/bay/Status';
import { useEffect } from 'react';
import { useView } from '@/lib/useHash';

export const BAY_VIEWS = ['resumen', 'alertas', 'tripulacion', 'simulador'] as const;
export type BayView = (typeof BAY_VIEWS)[number];

export default function Bay() {
  const view = useView(BAY_VIEWS);
  // fatigue & stress moved to its own module: old links (/system#fatiga) still land there
  useEffect(() => {
    const go = () => { if (location.hash === '#fatiga') location.replace('/system/fatigue'); };
    go(); window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, []);
  return (
    <BayProvider>
      <div className="page">
        <BayHeader view={view} />
        {view !== 'simulador' && <Timeline />}

        {view === 'resumen' && (
          <>
            <Brief />
            <div className="grid-scan">
              <Scanner />
              <Status />
            </div>
            <Legend />
          </>
        )}
        {view === 'alertas' && (
          <div className="grid-2">
            <Alerts />
            <Copilot />
          </div>
        )}
        {view === 'tripulacion' && (
          <div className="grid-2">
            <CrewHeat />
            <SpaceWeather />
          </div>
        )}
        {view === 'simulador' && <Simulator />}
      </div>
      <CrewForm />
    </BayProvider>
  );
}
