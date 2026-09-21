function encontrarFormularioPesquisa() {
  const selectCiclo = document.querySelector("select#cycles");
  const checkboxExcluir = document.querySelector('input[type="checkbox"][name="delete"]');
  const botaoEnviar = document.querySelector("#research-price-btn")?.closest("button[type='submit']");
  return selectCiclo && checkboxExcluir && botaoEnviar ? { cyclesSelect: selectCiclo, deleteCheckbox: checkboxExcluir, submitBtn: botaoEnviar } : null;
}

function encontrarBotaoSubmitLogin() {
  return document.querySelector("#login-submit");
}

function encontrarAvisoSucessoPesquisa() {
  for (const elemento of document.querySelectorAll(".alert-success")) {
    if (/researched/i.test(elemento.textContent)) return elemento;
  }
  return null;
}

function aleatorioEntre(minMs, maxMs) {
  return minMs + Math.random() * (maxMs - minMs);
}

const paginasNavegacaoPesquisa = [
  "https://hackerwars.io/finances",
  "https://hackerwars.io/internet",
  "https://hackerwars.io/software",
  "https://hackerwars.io/log",
  "https://hackerwars.io/hardware",
  "https://hackerwars.io/hdb",
  "https://hackerwars.io/missions",
  "https://hackerwars.io/utilities",
  "https://hackerwars.io/clan",
  "https://hackerwars.io/ranking",
  "https://hackerwars.io/fame",
];
const antecipacaoPaginaProcessosPesquisaMs = 2 * 60 * 1000;
const minNavegacaoPesquisaMs = 5 * 60 * 1000;
const maxNavegacaoPesquisaMs = 10 * 60 * 1000;

function encontrarLinkCompletarProcesso() {
  for (const item of document.querySelectorAll("li")) {
    const descricao = item.querySelector(".proc-desc");
    if (!descricao || !/research/i.test(descricao.textContent)) continue;
    for (const link of item.querySelectorAll('a[href*="pid="]')) {
      if (link.textContent.trim().toLowerCase() === "complete") return link;
    }
  }
  return null;
}

function nomeOpcaoPesquisa(texto) {
  return texto.trim().replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function encontrarOpcaoPesquisa(nome) {
  const alvo = (nome || "").trim().toLowerCase();
  if (!alvo) return null;
  for (const container of document.querySelectorAll(".select2-container")) {
    if (!container.id) continue;
    const select = document.getElementById(container.id.replace(/^s2id_/, ""));
    if (!select) continue;
    const opcao = [...select.options].find((item) => nomeOpcaoPesquisa(item.textContent).toLowerCase() === alvo);
    if (opcao) return { select: select, option: opcao };
  }
  return null;
}

function selecionarOpcaoPesquisa({ select, option }) {
  select.value = option.value;
  if (window.jQuery) window.jQuery(select).trigger("change");
  else select.dispatchEvent(new Event("change", { bubbles: true }));
}

function resultadoLoopPesquisaCompleto(state) {
  const ciclosConcluidosNestaVez = (state.loopsThisRun || 0) + 1;
  return {
    next: state.researchCollectMoney ? "goto_collect" : "goto_own_log",
    complete: true,
    patch: { loopsThisRun: ciclosConcluidosNestaVez, researchDone: ciclosConcluidosNestaVez >= (state.researchLoopCount || 1) },
  };
}

const RESEARCH_STEPS = {
  goto_university_list: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "pick_software" }),
    perform: () => {
      location.href = "https://hackerwars.io/university.php";
    },
  },
  pick_software: {
    timeout: 15000,
    skipElapsedGate: true,
    find: (state) => encontrarOpcaoPesquisa(state.researchSoftwareName),
    resolve: () => ({ next: "submit_research" }),
    perform: (resultadoEncontrado) => selecionarOpcaoPesquisa(resultadoEncontrado),
    onNotFound: () => ({
      pause: true,
      reason: "couldn't find that software in the university.php list — check the name/extension and hit Start again",
    }),
  },
  goto_university: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "submit_research" }),
    perform: (body, state) => {
      if (location.href !== state.universityUrl) location.href = state.universityUrl;
    },
  },
  submit_research: {
    timeout: 15000,
    find: () => {
      const botaoLogin = encontrarBotaoSubmitLogin();
      if (botaoLogin) return { kind: "login", el: botaoLogin };
      const formulario = encontrarFormularioPesquisa();
      return formulario ? { kind: "research", form: formulario } : null;
    },
    resolve: (found) => ({
      next: found.kind === "login" ? "goto_university" : "await_elapsed_start",
      patch: found.kind === "research" ? { universityUrl: location.href } : {},
    }),
    perform: (found, state) => {
      if (found.kind === "login") {
        found.el.click();
        return;
      }
      const { cyclesSelect, deleteCheckbox, submitBtn } = found.form;
      definirValorDoCampo(cyclesSelect, String(state.researchCycles || 1));
      const querExcluir = !!state.researchDeleteOldVersion;
      if (deleteCheckbox.checked !== querExcluir) {
        deleteCheckbox.checked = querExcluir;
        deleteCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
      submitBtn.click();
    },
  },
  await_elapsed_start: {
    timeout: 15000,
    find: () => {
      const botaoLogin = encontrarBotaoSubmitLogin();
      if (botaoLogin) return { kind: "login", el: botaoLogin };
      if (encontrarAvisoSucessoPesquisa()) return { kind: "success" };
      const msRestantes = findElapsedWaitMs();
      return msRestantes != null ? { kind: "elapsed", waitMs: msRestantes, raw: document.querySelector(".elapsed")?.textContent.trim() } : null;
    },
    resolve: (found, state) => {
      if (found.kind === "login") return { next: "goto_university" };
      if (found.kind === "success") return resultadoLoopPesquisaCompleto(state);
      return { next: "browse", patch: { researchDeadline: Date.now() + found.waitMs }, note: `elapsed timer read: ${found.raw}` };
    },
    perform: (found) => {
      if (found.kind === "login") found.el.click();
    },
  },
  browse: {
    timeout: 1000,
    skipElapsedGate: true,
    find: () => null,
    resolve: () => ({}),
    perform: () => {},
    onNotFound: (state) => {
      const msRestantes = state.researchDeadline - Date.now();
      if (msRestantes <= antecipacaoPaginaProcessosPesquisaMs) {
        return { retryDelayMs: 0, next: "goto_processes", reason: "close enough to the deadline, heading to /processes" };
      }
      const pagina = paginasNavegacaoPesquisa[Math.floor(Math.random() * paginasNavegacaoPesquisa.length)];
      const tempoEspera = Math.max(Math.min(aleatorioEntre(minNavegacaoPesquisaMs, maxNavegacaoPesquisaMs), msRestantes - antecipacaoPaginaProcessosPesquisaMs), 0);
      return { retryDelayMs: tempoEspera, next: "browse", href: pagina, reason: `browsing to ${pagina} to look active` };
    },
  },
  goto_processes: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "wait_for_complete" }),
    perform: () => {
      location.href = "https://hackerwars.io/processes";
    },
  },
  wait_for_complete: {
    timeout: 20 * 60 * 1000, // A antecipação de 2 minutos é apenas margem; dê espaço extra.
    find: () => {
      const botaoLogin = encontrarBotaoSubmitLogin();
      if (botaoLogin) return { kind: "login", el: botaoLogin };
      const link = encontrarLinkCompletarProcesso();
      return link ? { kind: "complete", el: link } : null;
    },
    resolve: (found, state) => (found.kind === "login" ? { next: "goto_processes" } : resultadoLoopPesquisaCompleto(state)),
    perform: async (found) => {
      found.el.click();
      if (found.kind === "complete") await pausar(2000);
    },
  },
  goto_collect: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "click_collect" }),
    perform: () => {
      location.href = "https://hackerwars.io/list.php?action=collect";
    },
  },
  click_collect: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => encontrarBotaoSubmitPorValor("Collect my money!"),
    resolve: () => ({ next: "goto_own_log" }),
    perform: (elemento) => elemento.click(),
    onNotFound: () => ({ retryDelayMs: 0, reason: "nothing to collect, continuing", next: "goto_own_log" }),
  },
  goto_own_log: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "clear_own_log" }),
    perform: () => {
      location.href = "https://hackerwars.io/log";
    },
  },
  clear_own_log: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => {
      const textarea = obterTextareaDoLog();
      const botao = obterBotaoEditarLog();
      return textarea && botao ? { textarea: textarea, button: botao } : null;
    },
    resolve: () => ({ next: "wait_clear_own_log" }),
    perform: async ({ textarea, button }) => {
      await cancelarProcessosAntigosDeEdicaoDeLog();
      textarea.value = "";
      button.click();
    },
    onNotFound: (state) => ({
      retryDelayMs: 0,
      reason: "no log form found (already empty?), continuing",
      next: state.researchDone ? "loops_complete" : "goto_university",
    }),
  },
  wait_clear_own_log: {
    timeout: 30000,
    find: () => (document.querySelector(".elapsed") ? null : true),
    resolve: (found, state) => ({ next: state.researchDone ? "loops_complete" : "goto_university", stop: !!state.researchDone }),
    perform: () => {},
  },
  loops_complete: {
    timeout: 5000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "loops_complete", stop: true }),
    perform: () => {},
  },
};
