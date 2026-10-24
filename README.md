# InvestAI - Decisor Inteligente de Carteira (B3 & Renda Fixa)

Sistema moderno desenvolvido em **Next.js 16**, **TypeScript**, **Tailwind CSS** e **Google Gemini IA**, desenhado para rodar localmente e com suporte nativo a deploy na **Vercel**.

---

## 🎯 Objetivo do Algoritmo

O sistema responde à pergunta central do investidor para cada ativo da sua carteira:
- **COMPRAR MAIS:** O ativo está com margem de segurança atrativa (desconto > 15% do preço-alvo), múltiplos saudáveis e em conformidade com as teses de aporte.
- **MANTER:** O ativo opera dentro da faixa justa de consolidação e seus fundamentos permanecem intactos.
- **VENDER:** O ativo atingiu o preço-teto estipulado, atingiu o stop loss de segurança ou quebrou a tese de investimento original.

---

## 📁 Estrutura do Projeto

- `app/page.tsx`: Dashboard financeiro completo com métricas da carteira, filtros, badges de recomendação da IA e editor do documento de teses em tempo real.
- `app/api/quote/route.ts`: Rota serverless para buscar cotações da B3 em tempo real (Brapi / Yahoo Finance).
- `app/api/analyze/route.ts`: Rota serverless que envia a posição e o documento de teses para o motor de decisão da IA.
- `lib/geminiService.ts`: Integração com o Google Gemini e algoritmo heurístico local de alta fidelidade.
- `lib/defaultData.ts`: Documento de regras/teses em Markdown padrão e carteira inicial de demonstração (PETR4, VALE3, WEGE3, HGLG11, Tesouro IPCA+).
- `lib/types.ts`: Definições de tipagem TypeScript.

---

## 🚀 Como Executar Localmente

```bash
# Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse no navegador: [http://localhost:3000](http://localhost:3000)

---

## ☁️ Deploy na Vercel

1. Suba este repositório para o seu GitHub:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin master
   ```
2. Acesse [vercel.com](https://vercel.com) e importe o repositório.
3. Configure as variáveis em **Settings > Environment Variables**:
   - `GEMINI_API_KEY`: sua chave de API da Google Gemini
   - `BRAPI_TOKEN`: seu token da Brapi (opcional)
4. Clique em **Deploy**.
