// Processa uma lista de IPs do pop-up, invadindo cada um (com bruteforce se necessário). Não
// faz login: o aviso de login indica que a invasão terminou ou não precisava de bruteforce.
const MASSHACK_STEPS = {
  goto_target: {
    timeout: 15000,
    find: (estado) => (estado.ipQueue && estado.ipQueue.length > 0 ? estado.ipQueue[0] : "done"),
    resolve: (resultadoEncontrado, estado) =>
      resultadoEncontrado === "done"
        ? { next: "goto_target", stop: true }
        : { next: "hack", patch: { currentIp: resultadoEncontrado, ipQueue: estado.ipQueue.slice(1) } },
    perform: (resultadoEncontrado) => {
      if (resultadoEncontrado !== "done") location.href = `https://hackerwars.io/internet?ip=${resultadoEncontrado}`;
    },
  },
  // IPs coletados podem expirar; a página 404 é detectada no find() e ignorada sem esperar timeout.
  // Apenas confirma que o menu de hack abre; a URL direta abaixo pula o menu e a opção de bruteforce.
  hack: {
    timeout: 15000,
    find: () => {
      const link = document.querySelector('a[href="?action=hack"]');
      if (link) return { kind: "hack" };
      const naoEncontrado = [...document.querySelectorAll(".widget-content")].some((elemento) =>
        /404 - Page not found/.test(elemento.textContent)
      );
      return naoEncontrado ? { kind: "not_found" } : null;
    },
    resolve: ({ kind }) => ({ next: kind === "hack" ? "hack_bruteforce" : "goto_target", complete: kind === "not_found" }),
    perform: () => {},
    onNotFound: () => ({
      retryDelayMs: 0,
      reason: "no hack link found (already hacked or invalid ip?) - skipping",
      next: "goto_target",
    }),
  },
  // A URL direta é mais rápida que abrir o menu. await_bruteforce mantém a espera do cronômetro
  // e captura o aviso de login assim que ele aparece.
  hack_bruteforce: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "await_bruteforce" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?action=hack&method=bf";
    },
  },
  // Bruteforce em andamento: aguarda o aviso de login e passa ao próximo.
  await_bruteforce: {
    timeout: 120000,
    find: () => encontrarBotaoSubmitPorValor("Login"),
    resolve: () => ({ next: "goto_target", complete: true }),
    perform: () => {},
  },
};
