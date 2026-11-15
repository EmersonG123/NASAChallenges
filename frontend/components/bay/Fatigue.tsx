'use client';
// Fatigue & stress module: camera monitoring (ASTRA Vision) for the selected crew member and the history of sessions.
import { BayProvider } from '@/components/bay/BayContext';
import CrewForm from '@/components/bay/CrewForm';
import { CrewPicker } from '@/components/bay/Overview';
import Sessions from '@/components/bay/Sessions';
import VisionPanel from '@/components/bay/VisionPanel';
import { useBayText } from '@/lib/bay/text';

function Head() {
  const { L } = useBayText();
  return (
    <header className="page-head">
      <div>
        <h1>{L('Fatiga y estrés', 'Fatigue & stress')}</h1>
        <p>{L('Monitoreo con la cámara durante el turno; cada sesión queda registrada.', 'Camera monitoring during the shift; every session is recorded.')}</p>
      </div>
      <CrewPicker />
    </header>
  );
}

export default function Fatigue() {
  return (
    <BayProvider>
      <div className="page">
        <Head />
        <VisionPanel />
        <Sessions />
      </div>
      <CrewForm />
    </BayProvider>
  );
}
