export function LiturgicalCard() {
  return (
    <div className="rounded-[1.5rem] border border-white/40 bg-white/40 p-6 shadow-2xl shadow-blue-900/10 backdrop-blur-3xl dark:border-zinc-800/40 dark:bg-zinc-900/40">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">
          Daily Liturgy
        </h2>
        <div className="h-2 w-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
      </div>
      
      <div className="space-y-4">
        <div className="group cursor-pointer">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 group-hover:text-blue-500 transition-colors">First Reading</p>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 group-hover:translate-x-1 transition-transform">Genesis 1:1-5</p>
        </div>
        
        <div className="h-px bg-zinc-200/50 dark:bg-zinc-800/50" />
        
        <div className="group cursor-pointer">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 group-hover:text-blue-500 transition-colors">The Holy Gospel</p>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 group-hover:translate-x-1 transition-transform">John 1:1-5</p>
        </div>
      </div>
      
      <button className="mt-6 w-full rounded-2xl bg-zinc-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/20 active:scale-95 dark:bg-zinc-50 dark:text-zinc-900">
        Enter the Word
      </button>
    </div>
  );
}
