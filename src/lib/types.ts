export const AMBIENTES = {
  mesa: "estação de trabalho / mesa de escritório",
  almoxarifado: "almoxarifado / estoque de materiais",
  armario: "armário de ferramentas ou EPIs",
  bancada: "bancada de trabalho industrial",
} as const;

export type AmbienteKey = keyof typeof AMBIENTES;

export const AMBIENTE_META: Record<
  AmbienteKey,
  { label: string; emoji: string }
> = {
  mesa: { label: "Mesa de Escritório", emoji: "🖥️" },
  almoxarifado: { label: "Almoxarifado", emoji: "📦" },
  armario: { label: "Armário", emoji: "🧰" },
  bancada: { label: "Bancada Técnica", emoji: "⚡" },
};

export type Senso = "Seiri" | "Seiton" | "Seiso" | "Seiketsu" | "Shitsuke";

export interface SensoScore {
  score: number;
  observacao: string;
}

export interface ItemDetectado {
  objeto: string;
  problema: string;
  senso: string;
}

export interface AcaoSugerida {
  titulo: string;
  descricao: string;
  tempoEstimadoMin: number;
  senso: string;
}

export interface ScanResult {
  scoreGeral: number;
  sensos: {
    seiri: SensoScore;
    seiton: SensoScore;
    seiso: SensoScore;
    seiketsu: SensoScore;
    shitsuke: SensoScore;
  };
  itensDetectados: ItemDetectado[];
  acoesSugeridas: AcaoSugerida[];
  resumoMotivacional: string;
}
