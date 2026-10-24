import { Asset } from './types';

export const DEFAULT_PORTFOLIO: Asset[] = [
  {
    id: 'asset-1',
    ticker: 'PETR4',
    name: 'Petróleo Brasileiro S.A.',
    type: 'stock',
    quantity: 200,
    averagePrice: 32.50,
    currentPrice: 38.20,
    change24h: 0.85,
    dividendYield: 14.5,
    pl: 4.8,
    pvp: 1.15,
    targetPrice: 42.00,
    stopLossPrice: 28.00,
    sector: 'Petróleo e Gás',
    notes: 'Comprado com foco em dividendos robustos e fluxo de caixa livre.'
  },
  {
    id: 'asset-2',
    ticker: 'VALE3',
    name: 'Vale S.A.',
    type: 'stock',
    quantity: 150,
    averagePrice: 68.90,
    currentPrice: 58.40,
    change24h: -1.20,
    dividendYield: 8.2,
    pl: 6.1,
    pvp: 1.25,
    targetPrice: 75.00,
    stopLossPrice: 50.00,
    sector: 'Mineração e Siderurgia',
    notes: 'Ciclo de baixa do minério de ferro chinês. Tese de longo prazo.'
  },
  {
    id: 'asset-3',
    ticker: 'WEGE3',
    name: 'WEG S.A.',
    type: 'stock',
    quantity: 100,
    averagePrice: 38.00,
    currentPrice: 52.10,
    change24h: 1.40,
    dividendYield: 1.8,
    pl: 32.5,
    pvp: 9.8,
    targetPrice: 55.00,
    sector: 'Bens Industriais',
    notes: 'Ativo de crescimento contínuo e alta rentabilidade (ROE > 28%).'
  },
  {
    id: 'asset-4',
    ticker: 'HGLG11',
    name: 'CSHG Logística FII',
    type: 'fii',
    quantity: 80,
    averagePrice: 158.00,
    currentPrice: 164.50,
    change24h: 0.15,
    dividendYield: 8.9,
    pvp: 1.02,
    targetPrice: 172.00,
    sector: 'Imobiliário / Galpões Logísticos',
    notes: 'Galpões Triple A no raio de 30km de São Paulo com vacância baixa.'
  },
  {
    id: 'asset-5',
    ticker: 'IPCA_2029',
    name: 'Tesouro IPCA+ 2029',
    type: 'fixed_income',
    quantity: 5,
    averagePrice: 3200.00,
    currentPrice: 3310.00,
    change24h: 0.05,
    targetPrice: 3500.00,
    sector: 'Títulos Públicos',
    notes: 'Garantir juro real de IPCA + 6.2% ao ano até o vencimento.'
  }
];

export const DEFAULT_RULES_MARKDOWN = `# Minhas Regras e Teses de Investimento

Este documento define os critérios objetivos para tomada de decisão da minha carteira.
A IA deve confrontar as cotações, indicadores e notícias de cada ativo contra estas regras para definir: **COMPRAR MAIS**, **MANTER** ou **VENDER**.

---

## 1. Princípios Gerais de Decisão

### Quando COMPRAR MAIS:
- O preço atual do ativo está com **desconto de pelo menos 15%** em relação ao preço-teto estipulado na tese.
- A tese fundamentalista permanece 100% intacta.
- Para ações pagadoras de dividendos: Dividend Yield (DY) projetado > 7% a.a. e P/L < 10.
- O ativo não ultrapassou o limite máximo de 20% de alocação total da carteira.

### Quando MANTER:
- O ativo está operando dentro da faixa de preço justo (entre -15% e +10% do preço médio ou preço-alvo intermediário).
- Os fundamentos operacionais continuam consistentes com a tese original, mesmo que haja volatilidade de curto prazo.
- O fluxo de proventos e lucros permanece estável.

### Quando VENDER:
- **Quebra de Tese:** Deterioração estrutural na governança, escândalos, endividamento descontrolado (Dívida Líquida/EBITDA > 3.5x sem justificativa) ou perda definitiva de vantagem competitiva.
- **Atingimento de Preço-Alvo Máximo:** Ativo subiu excessivamente, tornando-se caro (múltiplos esticados, P/L > 25 em empresas maduras) ou atingiu o preço-teto da tese, justificando realização de lucro para alocar em ativos descontados ou Renda Fixa.
- **Stop Fundamentalista:** O ativo atingiu o stop de segurança e os resultados trimestrais vieram piores que o esperado por 3 trimestres consecutivos.

---

## 2. Teses Específicas por Ativo

### PETR4 (Petrobras)
- **Tese:** Geradora massiva de caixa, dividendos trimestrais elevados e custo de extração no pré-sal entre os mais baixos do mundo.
- **Preço Teto para Compra:** R$ 36,00.
- **Preço Alvo para Realização Parcial:** R$ 42,00.
- **Gatilho de Venda:** Se a política de dividendos for reduzida para menos de 40% do fluxo de caixa livre ou houver interferência governamental severa na precificação de combustíveis.

### VALE3 (Vale)
- **Tese:** Líder global de minério de alta qualidade. Alta ciclicidade dependente da economia chinesa.
- **Preço Teto para Compra:** R$ 62,00 (Abaixo deste valor é zona de acumulação forte).
- **Preço Alvo:** R$ 75,00.
- **Gatilho de Venda:** Se a dívida líquida passar de 20 bilhões de dólares ou ocorrer novos desastres ambientais com risco de cassação de licenças.

### WEGE3 (WEG)
- **Tese:** Multinacional de altíssima qualidade de gestão, internacionalização contínua e transição energética. Múltiplos historicamente altos.
- **Preço Teto para Compra:** R$ 45,00.
- **Preço Alvo:** R$ 55,00.
- **Gatilho de Venda:** P/L superar 38x sem crescimento proporcional de receita líquida (venda parcial de 25%) ou ROE cair abaixo de 18%.

### HGLG11 (CSHG Logística)
- **Tese:** FII de galpões logísticos classe A. Renda passiva mensal isenta de IR.
- **Preço Teto para Compra:** R$ 162,00 (P/VP <= 1.01).
- **Gatilho de Venda:** Se o P/VP ultrapassar 1.15 (caro para FII de tijolo) ou vacância física superar 15%.

### Renda Fixa (Tesouro IPCA+ 2029 / Selic)
- **Tese:** Reserva de oportunidade e proteção contra inflação.
- **Regra:** Manter até o vencimento para garantir a taxa pactuada (juro real > 6%). Se a taxa de mercado cair para IPCA + 4.5%, avaliar venda antecipada por marcação a mercado.
`;
