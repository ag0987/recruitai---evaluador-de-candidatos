export interface CandidateEvaluation {
  name: string;
  score: number;
  justification: string[];
  strengths: string[];
  gaps: string[];
  recommendation: 'Avanzar' | 'Considerar' | 'Descartar';
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
