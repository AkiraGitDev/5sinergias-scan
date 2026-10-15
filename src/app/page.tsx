"use client";

import { useRef, useState } from "react";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Sparkles,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import {
  AMBIENTE_META,
  type AmbienteKey,
  type ScanResult,
} from "@/lib/types";

type Phase = "idle" | "preview" | "analyzing" | "result" | "error";

type ApiResponse = {
  model: string;
  elapsedMs: number;
  result: ScanResult;
};

const SENSO_COLOR_BY_SCORE = (score: number) => {
  if (score >= 80) return "#00E096";
  if (score >= 65) return "#FFC72C";
  return "#FF4757";
};

export default function Page() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [ambiente, setAmbiente] = useState<AmbienteKey>("mesa");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setPhase("preview");
    e.target.value = "";
  }

  function resetAll() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setModelUsed(null);
    setElapsedMs(null);
    setErrorMsg(null);
    setPhase("idle");
  }

  async function analyze() {
    if (!file) return;
    setPhase("analyzing");
    setErrorMsg(null);

    try {
      const form = new FormData();
      form.append("photo", file);
      form.append("ambiente", ambiente);

      const res = await fetch("/api/scan", { method: "POST", body: form });
      const data = (await res.json()) as ApiResponse | { error: string };

      if (!res.ok || "error" in data) {
        const msg = "error" in data ? data.error : `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setResult(data.result);
      setModelUsed(data.model);
      setElapsedMs(data.elapsedMs);
      setPhase("result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  const amb = AMBIENTE_META[ambiente];

  return (
    <main className="relative min-h-screen w-full flex justify-center bg-bg-primary text-text-primary">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md min-h-screen flex flex-col">
        <header className="pt-14 pb-6 px-5 flex items-center gap-3">
          {phase !== "idle" && phase !== "analyzing" && (
            <button
              onClick={resetAll}
              className="w-9 h-9 rounded-full border border-border-subtle bg-bg-surface flex items-center justify-center hover:border-primary/60 transition"
              aria-label="Voltar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-text-muted uppercase">
              5Sinergias Scan
            </p>
            <h1 className="text-lg font-semibold">
              {phase === "idle" && "Qual ambiente?"}
              {phase === "preview" && "Revisar foto"}
              {phase === "analyzing" && "Analisando com IA"}
              {phase === "result" && "Resultado 5S"}
              {phase === "error" && "Algo deu errado"}
            </h1>
          </div>
        </header>

        {phase === "idle" && (
          <IdleView
            ambiente={ambiente}
            onAmbienteChange={setAmbiente}
            onOpenPicker={openPicker}
          />
        )}

        {phase === "preview" && previewUrl && (
          <PreviewView
            previewUrl={previewUrl}
            ambiente={amb}
            onRetake={openPicker}
            onAnalyze={analyze}
          />
        )}

        {phase === "analyzing" && <AnalyzingView ambiente={amb} />}

        {phase === "result" && result && (
          <ResultView
            result={result}
            modelUsed={modelUsed}
            elapsedMs={elapsedMs}
            ambienteLabel={amb.label}
            onNewScan={resetAll}
          />
        )}

        {phase === "error" && (
          <ErrorView
            message={errorMsg ?? "Erro desconhecido"}
            onRetry={analyze}
            onReset={resetAll}
          />
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </main>
  );
}

function IdleView({
  ambiente,
  onAmbienteChange,
  onOpenPicker,
}: {
  ambiente: AmbienteKey;
  onAmbienteChange: (a: AmbienteKey) => void;
  onOpenPicker: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col px-5 pb-10 gap-6">
      <p className="text-sm text-text-secondary">
        Fotografe o ambiente, a IA diagnostica os 5 sensos e devolve ações
        práticas em menos de 10 segundos.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(AMBIENTE_META) as AmbienteKey[]).map((key) => {
          const m = AMBIENTE_META[key];
          const active = key === ambiente;
          return (
            <button
              key={key}
              onClick={() => onAmbienteChange(key)}
              className={`p-4 rounded-2xl border text-left transition ${
                active
                  ? "bg-primary border-primary shadow-[0_8px_24px_rgba(123,79,255,0.4)]"
                  : "bg-bg-surface border-border-subtle hover:border-primary/60"
              }`}
            >
              <div className="text-2xl mb-2">{m.emoji}</div>
              <div className="font-semibold text-sm">{m.label}</div>
              <div
                className={`text-[11px] mt-1 ${
                  active ? "text-white/80" : "text-text-muted"
                }`}
              >
                Toque para selecionar
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <button
          onClick={onOpenPicker}
          className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white font-semibold text-base shadow-[0_8px_32px_rgba(123,79,255,0.5)] flex items-center justify-center gap-3 transition"
        >
          <Camera size={20} />
          Tirar foto do ambiente
        </button>
        <button
          onClick={onOpenPicker}
          className="w-full py-3 rounded-2xl bg-bg-surface hover:bg-bg-elevated border border-border-subtle text-text-secondary text-sm flex items-center justify-center gap-2 transition"
        >
          <ImageIcon size={16} />
          Escolher da galeria
        </button>
      </div>
    </div>
  );
}

function PreviewView({
  previewUrl,
  ambiente,
  onRetake,
  onAnalyze,
}: {
  previewUrl: string;
  ambiente: { label: string; emoji: string };
  onRetake: () => void;
  onAnalyze: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col px-5 pb-10 gap-5">
      <div className="relative rounded-2xl overflow-hidden border border-border-subtle">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Preview do ambiente"
          className="w-full aspect-square object-cover"
        />
        <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-bg-primary/80 backdrop-blur-sm text-xs font-semibold flex items-center gap-1.5">
          <span>{ambiente.emoji}</span>
          <span>{ambiente.label}</span>
        </div>
      </div>

      <div className="rounded-xl bg-bg-surface border border-border-subtle p-4 flex gap-3">
        <Sparkles
          size={18}
          className="text-accent-cyan flex-shrink-0 mt-0.5"
        />
        <div className="text-xs text-text-secondary leading-relaxed">
          A IA vai avaliar os 5 sensos, identificar itens fora do padrão e
          sugerir ações rápidas. Nenhuma foto é salva.
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <button
          onClick={onAnalyze}
          className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white font-semibold text-base shadow-[0_8px_32px_rgba(123,79,255,0.5)] flex items-center justify-center gap-2 transition"
        >
          <Sparkles size={18} />
          Analisar com IA
        </button>
        <button
          onClick={onRetake}
          className="w-full py-3 rounded-2xl bg-bg-surface hover:bg-bg-elevated border border-border-subtle text-text-secondary text-sm flex items-center justify-center gap-2 transition"
        >
          <RotateCcw size={14} />
          Trocar foto
        </button>
      </div>
    </div>
  );
}

function AnalyzingView({
  ambiente,
}: {
  ambiente: { label: string; emoji: string };
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10 gap-8">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/40 blur-2xl animate-pulse" />
        <div className="relative w-28 h-28 rounded-full bg-primary flex items-center justify-center shadow-[0_8px_48px_rgba(123,79,255,0.6)]">
          <Loader2 className="animate-spin" size={44} />
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs font-semibold tracking-widest text-text-muted uppercase mb-2">
          Analisando {ambiente.label}
        </p>
        <h2 className="text-2xl font-bold mb-3">Interpretando os 5 sensos…</h2>
        <p className="text-sm text-text-secondary max-w-xs">
          A IA está identificando objetos, avaliando a organização e preparando
          ações sugeridas.
        </p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-2">
        {["Lendo a imagem", "Avaliando os sensos", "Gerando ações"].map(
          (t, i) => (
            <div
              key={t}
              className="flex items-center gap-3 text-xs text-text-secondary"
            >
              <div
                className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"
                style={{ animationDelay: `${i * 300}ms` }}
              />
              {t}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function ResultView({
  result,
  modelUsed,
  elapsedMs,
  ambienteLabel,
  onNewScan,
}: {
  result: ScanResult;
  modelUsed: string | null;
  elapsedMs: number | null;
  ambienteLabel: string;
  onNewScan: () => void;
}) {
  const sensos = [
    { key: "seiri" as const, name: "Seiri — Utilização" },
    { key: "seiton" as const, name: "Seiton — Ordenação" },
    { key: "seiso" as const, name: "Seiso — Limpeza" },
    { key: "seiketsu" as const, name: "Seiketsu — Padronização" },
    { key: "shitsuke" as const, name: "Shitsuke — Autodisciplina" },
  ];

  return (
    <div className="flex-1 flex flex-col px-5 pb-10 gap-5">
      <div className="relative overflow-hidden rounded-3xl bg-primary p-6 shadow-[0_12px_48px_rgba(123,79,255,0.5)]">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <p className="text-[11px] font-semibold tracking-widest text-white/75 uppercase relative">
          Score 5S · {ambienteLabel}
        </p>
        <div className="flex items-baseline gap-1 mt-1 relative">
          <span className="text-7xl font-bold leading-none">
            {result.scoreGeral}
          </span>
          <span className="text-xl font-semibold text-white/60">/100</span>
        </div>
        <p className="text-sm text-white/90 mt-4 relative leading-relaxed">
          {result.resumoMotivacional}
        </p>
      </div>

      <section>
        <h3 className="text-sm font-semibold mb-3 px-1">Por senso</h3>
        <div className="space-y-2">
          {sensos.map((s) => {
            const data = result.sensos[s.key];
            const color = SENSO_COLOR_BY_SCORE(data.score);
            return (
              <div
                key={s.key}
                className="rounded-xl bg-bg-surface border border-border-subtle p-3 flex items-start gap-3"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold">{s.name}</span>
                    <span className="text-sm font-bold">{data.score}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden mb-1.5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${data.score}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    {data.observacao}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {result.itensDetectados.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-3 px-1">Itens detectados</h3>
          <div className="space-y-2">
            {result.itensDetectados.map((item, i) => (
              <div
                key={i}
                className="rounded-xl bg-bg-surface border border-border-subtle p-3 flex gap-3"
              >
                <AlertCircle
                  size={16}
                  className="text-warning flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{item.objeto}</div>
                  <div className="text-xs text-text-secondary leading-relaxed">
                    {item.problema}
                  </div>
                  <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-1">
                    {item.senso}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold mb-3 px-1 flex items-center gap-2">
          <Sparkles size={14} className="text-accent-cyan" />
          Ações sugeridas pela IA
        </h3>
        <div className="space-y-2">
          {result.acoesSugeridas.map((a, i) => (
            <div
              key={i}
              className="rounded-xl bg-bg-surface border border-border-subtle p-3"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-sm font-semibold">{a.titulo}</div>
                <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-accent-cyan text-bg-primary text-[10px] font-bold flex items-center gap-1">
                  <Clock size={10} />
                  {a.tempoEstimadoMin}min
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {a.descricao}
              </p>
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-1.5">
                {a.senso}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-xl bg-bg-elevated border border-warning p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-warning flex items-center justify-center text-xl flex-shrink-0">
          🏆
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-warning">
            Nova conquista!
          </div>
          <div className="text-sm font-bold">Olho de Águia · +30 pts</div>
        </div>
      </div>

      {(modelUsed || elapsedMs) && (
        <div className="flex items-center gap-3 text-[10px] text-text-muted justify-center">
          {modelUsed && (
            <span className="flex items-center gap-1">
              <CheckCircle2 size={10} /> {modelUsed}
            </span>
          )}
          {elapsedMs !== null && (
            <span>· {(elapsedMs / 1000).toFixed(1)}s</span>
          )}
        </div>
      )}

      <button
        onClick={onNewScan}
        className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white font-semibold flex items-center justify-center gap-2 shadow-[0_8px_32px_rgba(123,79,255,0.5)] transition"
      >
        <Camera size={18} />
        Fazer novo scan
      </button>
    </div>
  );
}

function ErrorView({
  message,
  onRetry,
  onReset,
}: {
  message: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10 gap-6">
      <div className="w-20 h-20 rounded-full bg-danger/20 border border-danger flex items-center justify-center">
        <AlertCircle size={36} className="text-danger" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold mb-2">Falha na análise</h2>
        <p className="text-sm text-text-secondary max-w-xs break-words">
          {message}
        </p>
      </div>
      <div className="w-full flex flex-col gap-3 mt-auto">
        <button
          onClick={onRetry}
          className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white font-semibold flex items-center justify-center gap-2 transition"
        >
          <RotateCcw size={18} />
          Tentar novamente
        </button>
        <button
          onClick={onReset}
          className="w-full py-3 rounded-2xl bg-bg-surface border border-border-subtle text-text-secondary text-sm transition"
        >
          Começar do zero
        </button>
      </div>
    </div>
  );
}
