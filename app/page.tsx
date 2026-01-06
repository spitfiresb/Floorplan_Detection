import Link from "next/link";
import { ArrowRight, Layout, Scan, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black overflow-hidden relative">

      {/* Background Effects Removed */}

      <div className="z-10 container px-4 md:px-6 flex flex-col items-center text-center space-y-8">
        <div className="space-y-4 max-w-3xl">
          {/* v2.0 Badge Removed */}

          <h1 className="text-4xl md:text-7xl font-bold tracking-tighter text-white">
            Intelligent Floor Plan Analysis
          </h1>

          <p className="mx-auto max-w-[700px] text-slate-400 md:text-xl leading-relaxed">
            Upload any architectural drawing and let our AI instantly identify rooms, doors, windows, and furniture with 99% accuracy.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link
            href="/dashboard"
            className="inline-flex h-14 items-center justify-center rounded-none bg-blue-600 px-10 text-base font-bold text-white transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:bg-blue-500 hover:translate-x-1 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Try It Now <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link
            href="https://roboflow.com"
            target="_blank"
            className="inline-flex h-12 items-center justify-center rounded-none border border-slate-700 bg-transparent px-8 text-sm font-medium text-slate-300 transition-all hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700"
          >
            Read the Docs
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left">
          {/* Card 1 */}
          <div className="group relative p-8 bg-slate-950/40 backdrop-blur-md border border-white/5 hover:border-blue-500 transition-colors duration-300">
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/10 group-hover:border-blue-500 transition-colors"></div>
            <div className="mb-4 text-blue-500">
              <Scan className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-white uppercase tracking-wider">Instant Detection</h3>
            <p className="text-slate-500 text-sm leading-relaxed group-hover:text-slate-400 transition-colors">Model inference runs in milliseconds. Upload and get results immediately.</p>
          </div>

          {/* Card 2 */}
          <div className="group relative p-8 bg-slate-950/40 backdrop-blur-md border border-white/5 hover:border-purple-500 transition-colors duration-300">
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/10 group-hover:border-purple-500 transition-colors"></div>
            <div className="mb-4 text-purple-500">
              <Layout className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-white uppercase tracking-wider">Interactive Viewer</h3>
            <p className="text-slate-500 text-sm leading-relaxed group-hover:text-slate-400 transition-colors">Toggle layers, zoom, and pan through the detected architecture.</p>
          </div>

          {/* Card 3 */}
          <div className="group relative p-8 bg-slate-950/40 backdrop-blur-md border border-white/5 hover:border-green-500 transition-colors duration-300">
            <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-white/10 group-hover:border-green-500 transition-colors"></div>
            <div className="mb-4 text-green-500">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-white uppercase tracking-wider">Export Ready</h3>
            <p className="text-slate-500 text-sm leading-relaxed group-hover:text-slate-400 transition-colors">Get your data in standardized JSON formats for downstream tasks.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
