'use client';

import { SpanishLevel } from '@/types/database';

interface ArticleTipProps {
  level: SpanishLevel;
}

export default function ArticleTip({ level }: ArticleTipProps) {
  const tips: Record<SpanishLevel, { title: string; content: string }> = {
    A1: {
      title: "💡 Artikel Tip for A1",
      content: "På A1 niveau fokuser på: el (hankøn) vs la (hunkøn) + grundlæggende mønstre som -o = hankøn, -a = hunkøn."
    },
    A2: {
      title: "💡 Artikel Tip for A2", 
      content: "På A2 niveau lær: undtagelser (problema, mano), kontekstuel brug og bestemt vs ubestemt i sammenhæng."
    },
    B1: {
      title: "💡 Artikel Tip for B1",
      content: "På B1 niveau mestre: abstrakte begreber, professionelle titler og subtile betydningsforskelle."
    },
    B2: {
      title: "💡 Artikel Tip for B2",
      content: "På B2 niveau perfektioner: nuancerede betydninger, stilistiske valg og artikel udeladelse."
    },
    C1: {
      title: "💡 Artikel Tip for C1",
      content: "På C1 niveau behersker du: komplekse literære tekster, regionale variationer og avancerede registre."
    },
    C2: {
      title: "💡 Artikel Tip for C2",
      content: "På C2 niveau har du: nær-indfødt beherskelse af alle artikel nuancer og stilistiske anvendelser."
    }
  };

  const tip = tips[level];

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-yellow-600 text-lg">📝</span>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            {tip.title}
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>{tip.content}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
