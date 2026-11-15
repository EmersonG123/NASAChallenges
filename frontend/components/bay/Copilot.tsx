'use client';
// ASTRA Copilot: questions in plain language, answered from the selected crew member's data with a cited source.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Card } from '@/components/app/ui';
import { useBay } from '@/components/bay/BayContext';
import { answer, ASKS } from '@/lib/bay/copilot';
import { useBayText } from '@/lib/bay/text';

interface Msg { id: number; who: 'q' | 'a'; text: string; src?: string }

export default function Copilot() {
  const { crew, tp, vision } = useBay();
  const x = useBayText(); const { L, lang } = x;
  const [log, setLog] = useState<Msg[]>([]);
  const [typing, setTyping] = useState<{ id: number; shown: number } | null>(null);
  const [q, setQ] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  // typewriter effect for the latest answer (skipped for reduced motion)
  useEffect(() => {
    if (!typing) return;
    const len = log.find((m) => m.id === typing.id)?.text.length ?? 0;
    const next = typing.shown + 4;
    const t = setTimeout(() => setTyping(next >= len ? null : { id: typing.id, shown: next }), 14);
    return () => clearTimeout(t);
  }, [typing, log]);
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [log, typing]);

  const ask = (text: string) => {
    const a = answer(text, crew, tp, x, vision);
    const qid = nextId.current++, aid = nextId.current++;
    const src = `${a.s} · ${x.crewLabel(crew)} · ${x.tpName(tp)}`;
    setLog((l) => [...l, { id: qid, who: 'q', text }, { id: aid, who: 'a', text: a.t, src }]);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTyping(reduce ? null : { id: aid, shown: 0 });
  };
  const submit = (e: FormEvent) => { e.preventDefault(); const v = q.trim(); if (v) { ask(v); setQ(''); } };

  return (
    <Card id="copilot" title="ASTRA Copilot" aside={<span className="meta">{L('Responde solo con datos del tripulante', "Answers only from the crew member's data")}</span>}
      lead={L('Pregunta en lenguaje normal. Cada respuesta cita su fuente.', 'Ask in plain language. Every answer cites its source.')}>
      <div className="log" ref={logRef} aria-live="polite">
        <div className="msg a">{L('Copilot en línea. Elige una pregunta o escribe la tuya: respondo con los datos del tripulante y el punto de tiempo seleccionados.', 'Copilot online. Pick a question or type your own: I answer with the selected crew member and timepoint data.')}</div>
        {log.map((m) => {
          const partial = typing?.id === m.id;
          return (
            <div key={m.id} className={`msg ${m.who}`} data-who={m.who === 'q' ? L('TRIPULANTE', 'CREW') : 'ASTRA'}>
              {partial ? m.text.slice(0, typing.shown) : m.text}
              {!partial && m.src && <span className="src">{m.src}</span>}
            </div>
          );
        })}
      </div>
      <div className="asks">{ASKS[lang].map((s) => <button key={s} type="button" className="ask" onClick={() => ask(s)}>{s}</button>)}</div>
      <form className="cmd" onSubmit={submit}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L('Pregunta a ASTRA… (ej. ¿cómo está mi riñón?)', 'Ask ASTRA… (e.g. how is my kidney?)')} autoComplete="off" aria-label={L('Pregunta', 'Question')} />
        <button type="submit" className="btn-d primary">{L('Enviar', 'Send')}</button>
      </form>
    </Card>
  );
}
