import Nav from '@/components/site/Nav';
import {
  CallToAction, DataSources, SYSTEM, Footer, Hero, Impact, MissionBar, Modules, Problem, Solution, TwinSection, Vision,
} from '@/components/site/Sections';

export default function Home() {
  return (
    <>
      <Nav href={SYSTEM} />
      <main id="top">
        <Hero />
        <MissionBar />
        <Problem />
        <TwinSection />
        <Solution />
        <Modules />
        <Vision />
        <Impact />
        <DataSources />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
