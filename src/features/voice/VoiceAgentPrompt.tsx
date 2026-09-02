import { useState } from "react";
import { KeyRound, Settings2, X } from "lucide-react";

export default function VoiceAgentPrompt({ providerName, onSave, onOpenSettings, onClose }: {
  providerName: string;
  onSave: (key: string) => void;
  onOpenSettings: () => void;
  onClose: () => void;
}) {
  const [key, setKey] = useState("");
  return <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Configure ${providerName}`}>
    <section className="w-full max-w-md rounded-xl border border-[#5c5850] bg-[#252522] p-5 text-[#ebe6d8] shadow-2xl">
      <header className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="mt-0.5 rounded-md border border-[#777269] bg-[#343431] p-2 text-[#d5a34b]"><KeyRound size={17}/></span><div><p className="m-0 text-[10px] font-bold uppercase tracking-[.12em] text-[#938f85]">Voice Agent · Needs input</p><h2 className="m-0 mt-1 text-base font-semibold">Set up {providerName}</h2></div></div><button onClick={onClose} className="text-[#938f85] hover:text-white" aria-label="Close"><X size={17}/></button></header>
      <p className="mb-4 mt-4 text-sm leading-5 text-[#b7b3a8]">Paste the key manually. Noska never captures API keys from speech and does not display the saved value.</p>
      <input autoFocus type="password" autoComplete="off" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Paste API key" className="w-full rounded-md border border-[#5c5850] bg-[#171716] px-3 py-2.5 font-mono text-sm text-[#ebe6d8] outline-none focus:border-[#b7b3a8]" />
      <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={onOpenSettings} className="rounded-md border border-[#777269] bg-[#343431] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#ebe6d8]"><Settings2 className="mr-1 inline" size={13}/>Settings</button><button disabled={!key.trim()} onClick={() => onSave(key.trim())} className="rounded-md border border-[#e06b61] bg-[#bd302b] px-3 py-2 text-xs font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40">Save key</button></div>
    </section>
  </div>;
}
