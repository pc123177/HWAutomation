// Reduz a reputação de propósito: aceita e abandona repetidamente uma missão de destroy server,
// delete software, steal software, transfer money ou check bank status. Não invade vítimas nem bancos.
const REP_KILL_TITLES = ["destroy server", "delete software", "steal software", "transfer money", "check bank status"];

function encontrarLinkMissaoLimpezaReputacao() {
  for (const elementoLink of document.querySelectorAll('a[href*="?id="]')) {
    if (REP_KILL_TITLES.includes(elementoLink.textContent.trim().toLowerCase())) return elementoLink;
  }
  return null;
}

const REP_KILL_STEPS = {
  goto_missions: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "find_mission" }),
    perform: () => {
      if (location.pathname !== "/missions") location.href = "https://hackerwars.io/missions";
    },
  },
  find_mission: {
    timeout: 15000,
    find: () => encontrarLinkMissaoLimpezaReputacao(),
    resolve: () => ({ next: "accept1" }),
    perform: (elemento) => elemento.click(),
    onNotFound: () => ({
      retryDelayMs: 2 * 60000,
      reason: "no destroy/delete/steal mission available, waiting 2m and refreshing",
    }),
  },
  accept1: {
    timeout: 15000,
    find: () => document.querySelector(".mission-accept"),
    resolve: () => ({ next: "accept2" }),
    perform: (elemento) => elemento.click(),
    // Uma missão pode expirar antes do clique; recomece a busca em vez de travar.
    onNotFound: () => {
      if (!encontrarErroMissaoInexistente()) return null;
      return {
        retryDelayMs: 0,
        reason: "mission no longer exists, restarting search",
        next: "find_mission",
        href: "https://hackerwars.io/missions",
      };
    },
  },
  accept2: {
    timeout: 10000,
    find: () => encontrarBotaoSubmitPorValor("Accept"),
    resolve: () => ({ next: "abort1" }),
    perform: (elemento) => elemento.click(),
  },
  abort1: {
    timeout: 15000,
    find: () => document.querySelector(".mission-abort"),
    resolve: () => ({ next: "abort2" }),
    perform: (elemento) => elemento.click(),
  },
  abort2: {
    timeout: 10000,
    find: () => encontrarBotaoSubmitPorValor("Abort"),
    resolve: () => ({ next: "goto_missions", complete: true }),
    perform: (elemento) => elemento.click(),
  },
};
