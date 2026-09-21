// Coleta a renda ociosa, limpa o log e repete após o intervalo configurado no pop-up.
// Como o executor de pesquisa, usa chrome.alarms para atravessar navegações.
const intervaloPadraoColetaMs = 60 * 60 * 1000;
// O site impõe um tempo de espera para coleta; valores menores falham, então este é o limite mínimo.
const intervaloMinimoColetaMs = 10.5 * 60 * 1000;

const COLLECT_STEPS = {
  goto_list: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "collect" }),
    perform: () => {
      if (location.href !== "https://hackerwars.io/list.php?action=collect") {
        location.href = "https://hackerwars.io/list.php?action=collect";
      }
    },
  },
  collect: {
    timeout: 15000,
    find: () => encontrarBotaoSubmitPorValor("Collect my money!"),
    resolve: () => ({ next: "goto_log" }),
    perform: (elemento) => elemento.click(),
  },
  goto_log: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "clear_log" }),
    perform: () => {
      location.href = "https://hackerwars.io/log";
    },
  },
  clear_log: {
    timeout: 15000,
    find: () => {
      const textarea = obterTextareaDoLog();
      const botao = obterBotaoEditarLog();
      return textarea && botao ? { textarea: textarea, button: botao } : null;
    },
    resolve: (resultadoEncontrado, estado) => ({
      next: "goto_btc",
      patch: { collectDeadline: Date.now() + Math.max(estado.collectIntervalMs || intervaloPadraoColetaMs, intervaloMinimoColetaMs) },
      complete: true,
    }),
    perform: async ({ textarea: textarea, button: botao }) => {
      await cancelarProcessosAntigosDeEdicaoDeLog();
      textarea.value = "";
      botao.click();
    },
  },
  // Mesmo fluxo de compra de bitcoin de missions.js, reutilizando o localizador e o seletor #btc-submit.
  // Gasta o dinheiro antes que fique parado por uma hora.
  goto_btc: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "buy_btc_click" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?redirect=btc";
    },
  },
  buy_btc_click: {
    timeout: 15000,
    find: encontrarLinkComprarBitcoin,
    resolve: () => ({ next: "buy_btc_submit" }),
    perform: (elemento) => elemento.click(),
  },
  // Sem sessão no mercado BTC aparece #btc-login em vez de #btc-submit; faça login e tente
  // Buy Bitcoins novamente.
  buy_btc_submit: {
    timeout: 15000,
    find: () => {
      const botaoLogin = document.querySelector("#btc-login");
      if (botaoLogin) return { kind: "login", el: botaoLogin };
      const botaoCompra = document.querySelector("#btc-submit");
      return botaoCompra ? { kind: "buy", el: botaoCompra } : null;
    },
    resolve: (resultadoEncontrado) => ({ next: resultadoEncontrado.kind === "login" ? "buy_btc_click" : "browse" }),
    perform: (resultadoEncontrado) => resultadoEncontrado.el.click(),
  },
  // Usa a mesma navegação da etapa browse de research.js para não ficar parado uma hora e ser
  // desconectado por inatividade. Um prazo absoluto garante o retorno a goto_list.
  browse: {
    timeout: 15000,
    find: () => document.body,
    resolve: (corpoPagina, estado) => ({ next: Date.now() >= estado.collectDeadline ? "goto_list" : "browse" }),
    perform: async (corpoPagina, estado) => {
      const msRestantes = estado.collectDeadline - Date.now();
      if (msRestantes <= 0) return;
      const pagina = RESEARCH_BROWSE_PAGES[Math.floor(Math.random() * RESEARCH_BROWSE_PAGES.length)];
      const tempoEspera = Math.min(randomBetween(RESEARCH_BROWSE_MIN_MS, RESEARCH_BROWSE_MAX_MS), msRestantes);
      await pausar(Math.max(tempoEspera, 0));
      location.href = pagina;
    },
  },
};
