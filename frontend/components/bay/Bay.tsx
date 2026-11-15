'use client';
// Medical bay: one focused view at a time (chosen in the sidebar), sharing one selection (crew, moment, system).
import Alerts from '@/components/bay/Alerts';
import { BayProvider } from '@/components/bay/BayContext';
import Copilot from '@/components/bay/Copilot';
import CrewForm from '@/components/bay/CrewForm';
import { CrewHeat, SpaceWeather } from '@/components/bay/CrewWeather';
import { BayHeader, Brief, Legend, Timeline } from '@/components/bay/Overview';
import Scanner from '@/components/bay/Scanner';
import Sessions from '@/components/bay/Sessions';
import Simulator from '@/components/bay/Simulator';
import Status from '@/components/bay/Status';
import VisionPanel from '@/components/bay/VisionPanel';
import { useView } from '@/lib/useHash';

export const BAY_VIEWS = ['resumen', 'alertas', 'tripulacion', 'fatiga', 'simulador'] as const;
export type BayView = (typeof BAY_VIEWS)[number];

export default function Bay() {
  const view = useView(BAY_VIEWS);
  return (
    <BayProvider>
      <div className="page">
        <BayHeader view={view} />
        {view !== 'simulador' && view !== 'fatiga' && <Timeline />}

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
        {view === 'fatiga' && (
          <>
            <VisionPanel />
            <Sessions />
          </>
        )}
        {view === 'simulador' && <Simulator />}
      </div>
      <CrewForm />
    </BayProvider>
  );
}
