import { Asset } from './types';

// Carteira inicial vazia - os ativos reais virão da conexão oficial via Pluggy Open Finance
export const DEFAULT_PORTFOLIO: Asset[] = [];

export const DEFAULT_RULES_MARKDOWN = `# Minhas Regras e Teses de Investimento

Este documento define os critérios objetivos para tomada de decisão da minha carteira.
A IA deve confrontar as cotações, indicadores e notícias de cada ativo contra estas regras para definir: **COMPRAR MAIS**, **MANTER** ou **VENDER**.

---

## 1. Princípios Gerais de Decisão

### Quando COMPRAR MAIS:
- O preço atual do ativo está com **desconto de pelo menos 15%** em relação ao preço-teto estipulado na tese.
- A tese fundamentalista permanece 100% intacta.
- Para ações pagadoras de dividendos: Dividend Yield (DY) projetado > 7% a.a. e P/L < 10.
- O ativo não ultrapassou o limite máximo de alocação total da carteira.

### Quando MANTER:
- O ativo está operando dentro da faixa de preço justo (entre -15% e +10% do preço médio ou preço-alvo intermediário).
- Os fundamentos operacionais continuam consistentes com a tese original, mesmo que haja volatilidade de curto prazo.
- O fluxo de proventos e lucros permanece estável.

### Quando VENDER:
- **Quebra de Tese:** Deterioração estrutural na governança, escândalos, endividamento descontrolado ou perda definitiva de vantagem competitiva.
- **Atingimento de Preço-Alvo Máximo:** Ativo subiu excessivamente, tornando-se caro (múltiplos esticados) ou atingiu o preço-teto da tese, justificando realização de lucro para alocar em ativos descontados ou Renda Fixa.
- **Stop Fundamentalista:** O ativo atingiu o stop de segurança e os resultados trimestrais vieram piores que o esperado por 3 trimestres consecutivos.
`;
