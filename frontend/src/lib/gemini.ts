export interface CandidateEvaluation {
  name: string;
  score: number;
  justification: string[];
  strengths: string[];
  gaps: string[];
  recommendation: 'Avanzar' | 'Considerar' | 'Descartar';
  dataIntegrity: {
    missingCriticalInfo: string[];
    infoNotFoundInCV: string[];
    insufficientData: boolean;
  };
}

export interface InterviewQuestion {
  category: 'Técnica' | 'Comportamental' | 'Situacional' | 'Verificación';
  question: string;
  rationale: string;
}

export interface InterviewPrep {
  questions: InterviewQuestion[];
}

export async function prepareInterview(
  jd: string,
  cv: string,
  evaluation: CandidateEvaluation
): Promise<InterviewPrep> {
  const response = await fetch('/api/interview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jd, cv, evaluation }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || 'No se pudieron generar las preguntas.');
  }

  return await response.json() as InterviewPrep;
}

export async function evaluateCandidate(jd: string, cv: string): Promise<CandidateEvaluation> {
  const response = await fetch('/api/evaluate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ jd, cv })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'No se pudo evaluar el candidato.');
  }

  return await response.json() as CandidateEvaluation;
}
