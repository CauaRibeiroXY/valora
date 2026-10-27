import { Asset } from './types';

// Carteira inicial vazia - os ativos reais virão da conexão oficial via Pluggy Open Finance
export const DEFAULT_PORTFOLIO: Asset[] = [];

export const DEFAULT_RULES_MARKDOWN = `# Guia de Análise de Empresas e Ações (Critérios Operacionais)

Este documento consolida os fatores e indicadores para avaliar a saúde financeira, múltiplos e o potencial de cada ativo na bolsa de valores, determinando se devemos **COMPRAR MAIS**, **MANTER** ou **VENDER**.

---

## 1. Visão Geral e Análise Qualitativa
Antes de analisar os números, é fundamental entender o contexto da empresa e de quem a administra:
* **Setor da Empresa:** Qual a área de atuação e como esse mercado se comporta?
* **Posicionamento no Setor:** Qual é a vantagem competitiva da empresa frente aos seus concorrentes? Ela é líder de mercado?
* **Histórico de Resultados:** A empresa possui um histórico consistente de lucros e crescimento ao longo dos anos?
* **Qualidade do Gestor:** A diretoria é competente e transparente?
* **Comprometimento do Controlador:** Os sócios majoritários estão alinhados com os interesses dos acionistas minoritários e com o futuro da empresa?

---

## 2. Indicadores e Múltiplos Quantitativos

### 2.1. LPA (Lucro Por Ação)
- **Critério:** Indica quanto de lucro líquido cada ação gerou.
- **Interpretação:** Quanto maior, melhor. LPA negativo é bandeira vermelha imediata (empresa dando prejuízo).

### 2.2. P/L (Preço / Lucro)
- **Critério:** Quantos anos para o investidor recuperar o capital se todo o lucro for distribuído.
- **Interpretação:** Menor indica ação mais barata. Deve ser comparado com a média do setor. P/L muito alto sem crescimento justifica cautela ou realização de lucro.

### 2.3. Dividend Yield (DY)
- **Critério:** Rendimento em proventos pagos nos últimos 12 meses frente à cotação atual.
- **Interpretação:** Foco em empresas geradoras de caixa com DY consistente e sustentável.

### 2.4. Margem Líquida
- **Fórmula:** (Lucro Líquido / Receita Líquida) * 100
- **Interpretação:** Percentual de cada real faturado que sobra limpo. Margens elevadas e crescentes denotam forte poder de precificação (moat).

### 2.5. ROE (Retorno Sobre o Patrimônio Líquido)
- **Fórmula:** (Lucro Líquido / Patrimônio Líquido) * 100
- **Interpretação:** Mede a eficiência de geração de lucro com o capital próprio.
- **Parâmetro Ideal:** **15% ou mais** (quanto maior, melhor).

### 2.6. P/VP (Preço / Valor Patrimonial da Ação)
- **= 1:** Ação sendo negociada ao valor patrimonial justo.
- **< 1:** Ação descontada perante o patrimônio líquido (potencial margem de segurança).
- **> 1:** Mercado pagando ágio pelo crescimento futuro ou ativo esticado.

### 2.7. EV/EBITDA
- **Critério:** Custo de adquirir a empresa inteira (com dívida líquida) em relação ao caixa operacional gerado.
- **Interpretação:** Quanto menor, mais rápido o retorno sobre o valor da firma.

---

## 3. Matriz de Decisão (Algoritmo da IA)

- **COMPRAR MAIS:**
  1. Empresa lucrativa (LPA positivo) com ROE consistente >= 15% ou líder setorial.
  2. Múltiplos atrativos com margem de segurança (P/VP moderado ou < 1, P/L e EV/EBITDA abaixo ou alinhados à média histórica).
  3. Preço atual com desconto relevante em relação ao valor justo ou preço-alvo.

- **MANTER:**
  1. Empresa com fundamentos sólidos, lucro estável e ROE satisfatório.
  2. Cotação dentro da faixa justa de negociação, sem gatilhos extremos de desconto ou euforia.

- **VENDER:**
  1. Quebra de fundamentos: LPA persistentemente negativo, queda contínua de margem líquida e deterioração do ROE.
  2. Endividamento excessivo ou múltiplos absurdamente esticados (P/L e EV/EBITDA fora da realidade sem crescimento proporcional).
  3. Atingimento do preço-alvo de realização ou rompimento de stop de segurança.
`;
