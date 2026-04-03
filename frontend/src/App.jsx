import Header from './components/Header';
import UploadPanel from './components/UploadPanel';
import ChatPanel from './components/ChatPanel';

export default function App() {
  return (
    <>
      {/* Ambient Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent-600/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full bg-accent-500/[0.05] blur-[100px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-info-500/[0.04] blur-[80px]" />
      </div>

      <Header />

      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 min-h-0">
        {/* Upload Panel — Left */}
        <section className="w-full lg:w-[360px] xl:w-[400px] shrink-0 glass rounded-2xl p-5 lg:max-h-[calc(100dvh-88px)] overflow-y-auto">
          <UploadPanel />
        </section>

        {/* Chat Panel — Right */}
        <section className="flex-1 glass rounded-2xl p-5 flex flex-col min-h-[400px] lg:max-h-[calc(100dvh-88px)]">
          <ChatPanel />
        </section>
      </main>
    </>
  );
}
