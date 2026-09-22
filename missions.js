
const mapaTitulosMissoes = {
  "delete software": "delete",
  "steal software": "steal",
  "check bank status": "bank",
  "transfer money": "transfer",
};

const prioridadeTiposMissao = ["transfer", "bank", "steal", "delete"];

function encontrarLinkDaMissao(tiposAtivos) {
  const listaTipos = tiposAtivos && tiposAtivos.length > 0 ? tiposAtivos : prioridadeTiposMissao;
  const listaLinks = [...document.querySelectorAll('a[href*="?id="]')];
  for (const tipo of prioridadeTiposMissao) {
    if (!listaTipos.includes(tipo)) continue;
    const match = listaLinks.find((link) => mapaTitulosMissoes[link.textContent.trim().toLowerCase()] === tipo);
    if (match) return { el: match, missionType: tipo };
  }
  return null;
}

function encontrarErroMissaoInexistente() {
  for (const elemento of document.querySelectorAll(".alert-danger")) {
    if (elemento.textContent.includes("This mission does not exist")) return elemento;
  }
  return null;
}

function analisarDadosDaMissao() {
  const info = {};
  for (const rotulo of document.querySelectorAll("td .item")) {
    const textoRotulo = rotulo.textContent.trim();
    const celulaValor = rotulo.closest("td")?.nextElementSibling;
    if (!celulaValor) continue;
    if (textoRotulo === "Victim") {
      const link = celulaValor.querySelector('a[href*="ip="]');
      info.victimIp = link ? new URL(link.href, location.href).searchParams.get("ip") : null;
    } else if (textoRotulo === "File") {
      const elementoVersao = celulaValor.querySelector(".small");
      info.fileVersion = elementoVersao ? elementoVersao.textContent.trim() : "";
      const clone = celulaValor.cloneNode(true);
      clone.querySelector(".small")?.remove();
      info.fileName = clone.textContent.trim();
    } else if (textoRotulo === "Reward") {
      const numero = celulaValor.textContent.replace(/[^0-9]/g, "");
      info.reward = numero ? Number(numero) : null;
    } else if (textoRotulo === "Hirer") {
      const link = celulaValor.querySelector('a[href*="ip="]');
      info.hirerIp = link ? new URL(link.href, location.href).searchParams.get("ip") : null;
    } else if (textoRotulo === "Bank Account") {
      const clone = celulaValor.cloneNode(true);
      clone.querySelector("a")?.remove();
      info.bankAccount = clone.textContent.trim().replace(/^#/, "");
    } else if (textoRotulo === "Account From") {
      const link = celulaValor.querySelector('a[href*="ip="]');
      const clone = celulaValor.cloneNode(true);
      clone.querySelector("a")?.remove();
      info.accountFrom = clone.textContent.trim().replace(/^#/, "");
      info.accountFromIp = link ? new URL(link.href, location.href).searchParams.get("ip") : null;
    } else if (textoRotulo === "Account To") {
      const link = celulaValor.querySelector('a[href*="ip="]');
      const clone = celulaValor.cloneNode(true);
      clone.querySelector("a")?.remove();
      info.accountTo = clone.textContent.trim().replace(/^#/, "");
      info.accountToIp = link ? new URL(link.href, location.href).searchParams.get("ip") : null;
    }
  }
  return info;
}

function encontrarLinkHackBanco() {
  return document.querySelector('a[href*="action=hack"][href*="type=bank"]');
}

function encontrarFormularioContaBanco() {
  const input = document.querySelector('input[name="acc"][placeholder="Account to hack"]');
  const botao = input?.closest("form")?.querySelector('button[type="submit"]');
  return input && botao ? { input: input, button: botao } : null;
}

function encontrarFormularioTransferenciaBanco() {
  const inputValor = document.querySelector("input#money");
  const inputTransferencia = document.querySelector('input[name="acc"][placeholder="Transfer to..."]');
  const inputIp = document.querySelector('input[name="ip"][placeholder="IP of the receiver account"]');
  const botao = [...document.querySelectorAll('button[type="submit"]')].find(
    (elementoBotao) => elementoBotao.textContent.trim().toLowerCase() === "transfer money"
  );
  return inputValor && inputTransferencia && inputIp && botao
    ? { moneyInput: inputValor, transferInput: inputTransferencia, ipInput: inputIp, button: botao }
    : null;
}

function encontrarLinkLogoutBanco() {
  return document.querySelector('a[href*="bAction=logout"]');
}

function encontrarMinutosAteResetSoftware() {
  const match = document.body.innerText.match(/Next software reset:?\s*(\d+)\s*minutes?/i);
  return match ? Number(match[1]) : null;
}

function encontrarMinutosAteNovasMissoes() {
  const match = document.body.innerText.match(/New missions will be generated in\s*(\d+)\s*minutes?/i);
  return match ? Number(match[1]) : null;
}

function encontrarSeloConcluido() {
  const linkMissao = document.querySelector('a[href="missions"]');
  if (!linkMissao) return null;
  for (const rotulo of linkMissao.querySelectorAll(".label")) {
    if (rotulo.textContent.trim() === "$") return rotulo;
  }
  return null;
}

function encontrarLinkComprarBitcoin() {
  for (const link of document.querySelectorAll("a")) {
    if (link.querySelector(".he32-btc-buy")) return link;
    if (link.textContent.replace(/\s+/g, " ").trim().toLowerCase().startsWith("buy bitcoins")) return link;
  }
  return null;
}

const MISSION_STEPS = {
  find_mission: {
    timeout: 15000,
    find: (state) => encontrarLinkDaMissao(state.enabledTypes),
    resolve: (found) => ({ next: "accept1", patch: { missionType: found.missionType, stage: "victim" } }),
    perform: (found) => found.el.click(),
    onNotFound: () => {
      const minutos = encontrarMinutosAteNovasMissoes();
      if (minutos != null) {
        const valorLimitado = Math.min(minutos, 20);
        return {
          retryDelayMs: valorLimitado * 60000 + 30000,
          reason: `no missions available, waiting ~${valorLimitado}m + 30s for new missions`,
        };
      }
      return {
        retryDelayMs: 2 * 60000,
        reason: "no missions available, waiting 2m and refreshing",
      };
    },
  },
  accept1: {
    timeout: 15000,
    find: () => document.querySelector(".mission-accept"),
    resolve: () => ({ next: "accept2" }),
    perform: (elemento) => elemento.click(),
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
    resolve: () => ({ next: "read_info" }),
    perform: (elemento) => elemento.click(),
  },
  read_info: {
    timeout: 15000,
    find: () => {
      const info = analisarDadosDaMissao();
      return info.victimIp && (info.fileName || info.bankAccount || info.accountFrom) ? info : null;
    },
    resolve: (info, state) => ({
      next: state.missionType === "bank" || state.missionType === "transfer" ? "bank_hack" : "hack",
      patch: {
        victimIp: info.victimIp,
        fileName: info.fileName,
        fileVersion: info.fileVersion,
        reward: info.reward,
        hirerIp: info.hirerIp,
        bankAccount: info.bankAccount,
        accountFrom: info.accountFrom,
        accountFromIp: info.accountFromIp,
        accountTo: info.accountTo,
        accountToIp: info.accountToIp,
        currentAccount: state.missionType === "bank" ? info.bankAccount : info.accountFrom,
        transferPhase: state.missionType === "transfer" ? "initial" : undefined,
      },
    }),
    perform: (info, state) => {
      const ipAlvo = state.missionType === "transfer" ? state.accountFromIp : state.victimIp;
      location.href = `https://hackerwars.io/internet?ip=${ipAlvo}`;
    },
  },
  hack: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?action=hack"]'),
    resolve: () => ({ next: "hack_bruteforce" }),
    perform: () => {},
  },
  hack_bruteforce: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "await_login" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?action=hack&method=bf";
    },
  },
  await_login: {
    timeout: 120000,
    find: () => encontrarBotaoSubmitPorValor("Login"),
    resolve: (elemento, state) => ({ next: state.stage === "hirer" ? "hirer_software" : "software" }),
    perform: (elemento) => elemento.click(),
  },
  software: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?view=software"]'),
    resolve: (elemento, state) => ({ next: state.missionType === "steal" ? "steal_download" : "delete_file" }),
    perform: (elemento) => elemento.click(),
  },
  // Navegação absoluta (não um clique relativo): esta etapa às vezes é alcançada a partir da nossa
  // própria página /software, que não tem um link "?view=logs" para o alvo conectado.
  goto_logs: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "clear_logs" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?view=logs";
    },
  },
  clear_logs: {
    timeout: 15000,
    find: () => {
      const textarea = obterTextareaDoLog();
      const botao = obterBotaoEditarLog();
      return textarea && botao ? { textarea: textarea, button: botao } : null;
    },
    resolve: () => ({ next: "wait_logs_clear" }),
    perform: async ({ textarea, button }) => {
      await cancelarProcessosAntigosDeEdicaoDeLog();
      textarea.value = removerLinhaComIpProprio(textarea.value, obterIpProprio());
      button.click();
    },
  },
  wait_logs_clear: {
    timeout: 30000,
    find: () => (document.querySelector(".elapsed") ? null : true),
    resolve: (elemento, state) => ({ next: state.stage === "hirer" ? "logout_hirer" : "logout" }),
    perform: () => {},
  },
  delete_file: {
    timeout: 15000,
    find: (state) => encontrarLinkDaLinhaDoSoftware(state.fileName, state.fileVersion, "cmd=del"),
    resolve: () => ({ next: "goto_own_software_for_reupload" }),
    perform: (elemento) => elemento.click(),
    onNotFound: () => {
      const minutos = encontrarMinutosAteResetSoftware();
      if (minutos == null) return null;
      const valorLimitado = Math.min(minutos, 20);
      return {
        retryDelayMs: valorLimitado * 60000 + 30000,
        reason: `software not spawned yet, waiting ~${valorLimitado}m + 30s for reset`,
      };
    },
  },
  goto_own_software_for_reupload: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "reupload_deleted_file" }),
    perform: () => {
      location.href = "https://hackerwars.io/software";
    },
  },
  reupload_deleted_file: {
    timeout: 15000,
    find: (state) => encontrarLinkDaLinhaDoSoftware(state.fileName, state.fileVersion, "cmd=up"),
    resolve: () => ({ next: "goto_logs" }),
    perform: (elemento) => elemento.click(),
  },
  steal_download: {
    timeout: 15000,
    find: (state) => encontrarLinkDaLinhaDoSoftware(state.fileName, state.fileVersion, "cmd=dl"),
    resolve: () => ({ next: "grab_loot" }),
    perform: (elemento) => elemento.click(),
    onNotFound: () => {
      const minutos = encontrarMinutosAteResetSoftware();
      if (minutos == null) return null;
      const valorLimitado = Math.min(minutos, 20);
      return {
        retryDelayMs: valorLimitado * 60000 + 30000,
        reason: `software not spawned yet, waiting ~${valorLimitado}m + 30s for reset`,
      };
    },
  },
  // Já estamos logados no alvo prestes a ter o log limpo; aproveita para baixar qualquer outro
  // software disponível ali, um por vez, antes de sair.
  grab_loot: {
    timeout: 15000,
    find: (state) => state.lootQueue || encontrarLinhasDeDownloadRestantes([{ name: state.fileName, version: state.fileVersion }]),
    resolve: (fila) =>
      fila.length > 0 ? { next: "grab_loot", patch: { lootQueue: fila.slice(1) } } : { next: "goto_logs", patch: { lootQueue: undefined } },
    perform: (fila) => {
      if (fila.length === 0) return;
      const link = encontrarLinkDaLinhaDoSoftware(fila[0].name, fila[0].version, "cmd=dl");
      if (link) link.click();
    },
  },
  logout: {
    timeout: 15000,
    find: () => document.body,
    resolve: (elemento, state) => ({
      next: state.missionType === "steal" && state.stage === "victim" ? "goto_hirer" : "wait_for_dollar",
    }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?view=logout";
    },
  },
  goto_hirer: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "hack", patch: { stage: "hirer" } }),
    perform: (body, state) => {
      location.href = `https://hackerwars.io/internet?ip=${state.hirerIp}`;
    },
  },
  hirer_software: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?view=software"]'),
    resolve: () => ({ next: "check_hirer_existing_file" }),
    perform: (elemento) => elemento.click(),
  },
  check_hirer_existing_file: {
    timeout: 15000,
    find: (state) => ({ link: encontrarLinkDaLinhaDoSoftware(state.fileName, state.fileVersion, "cmd=del") }),
    resolve: ({ link }) => ({ next: link ? "delete_hirer_existing_file" : "goto_own_software" }),
    perform: () => {},
  },
  delete_hirer_existing_file: {
    timeout: 15000,
    find: (state) => encontrarLinkDaLinhaDoSoftware(state.fileName, state.fileVersion, "cmd=del"),
    resolve: () => ({ next: "confirm_hirer_file_deleted" }),
    perform: (elemento) => elemento.click(),
    onNotFound: () => {
      const minutos = encontrarMinutosAteResetSoftware();
      if (minutos == null) return null;
      const valorLimitado = Math.min(minutos, 20);
      return {
        retryDelayMs: valorLimitado * 60000 + 30000,
        reason: `software not spawned yet, waiting ~${valorLimitado}m + 30s for reset`,
      };
    },
  },
  confirm_hirer_file_deleted: {
    timeout: 15000,
    find: (state) => (encontrarLinkDaLinhaDoSoftware(state.fileName, state.fileVersion, "cmd=del") ? null : true),
    resolve: () => ({ next: "goto_own_software" }),
    perform: () => {},
  },
  goto_own_software: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "upload_file" }),
    perform: () => {
      location.href = "https://hackerwars.io/software";
    },
  },
  upload_file: {
    timeout: 15000,
    find: (state) => encontrarLinkDaLinhaDoSoftware(state.fileName, state.fileVersion, "cmd=up"),
    resolve: () => ({ next: "goto_logs" }),
    perform: (elemento) => elemento.click(),
  },
  logout_hirer: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "goto_own_software_2" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?view=logout";
    },
  },
  goto_own_software_2: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "delete_own_file" }),
    perform: () => {
      location.href = "https://hackerwars.io/software";
    },
  },
  delete_own_file: {
    timeout: 15000,
    find: (state) => encontrarLinkDaLinhaDoSoftware(state.fileName, state.fileVersion, "action=del"),
    resolve: () => ({ next: "wait_for_dollar" }),
    perform: (elemento) => elemento.click(),
  },
  bank_hack: {
    timeout: 15000,
    find: encontrarLinkHackBanco,
    resolve: () => ({ next: "bank_hack_account" }),
    perform: (elemento) => elemento.click(),
  },
  bank_hack_account: {
    timeout: 15000,
    find: encontrarFormularioContaBanco,
    resolve: (found, state) => ({
      next: "bank_login",
      patch: {
        bankLoginNext: state.missionType === "transfer" && state.transferPhase === "initial" ? "transfer_to_designated_account" : "bank_transfer",
      },
    }),
    perform: ({ input, button }, state) => {
      definirValorDoCampo(input, state.currentAccount);
      button.click();
    },
  },
  bank_login: {
    timeout: 90000,
    find: () => {
      const botaoLogin = encontrarBotaoSubmitPorValor("Login");
      if (botaoLogin) return { kind: "login", el: botaoLogin };
      if (encontrarFormularioTransferenciaBanco()) return { kind: "skip" };
      return null;
    },
    resolve: (found, state) => ({ next: state.bankLoginNext }),
    perform: ({ kind, el }) => {
      if (kind === "login") el.click();
    },
  },
  transfer_to_designated_account: {
    timeout: 90000,
    find: encontrarFormularioTransferenciaBanco,
    resolve: () => ({ next: "wait_for_dollar" }),
    perform: ({ transferInput, ipInput, button }, state) => {
      definirValorDoCampo(transferInput, state.accountTo);
      definirValorDoCampo(ipInput, state.accountToIp);
      button.click();
    },
  },
  bank_transfer: {
    timeout: 90000,
    find: encontrarFormularioTransferenciaBanco,
    resolve: (found, state) => ({
      next: state.transferPhase === "sweep" ? "goto_btc" : "wait_for_dollar",
      patch: { transferAmount: found.moneyInput.value, postBtcNext: "goto_missions" },
    }),
    perform: ({ transferInput, ipInput, button }, state) => {
      definirValorDoCampo(transferInput, state.selfTransferAccount);
      definirValorDoCampo(ipInput, state.selfTransferIp);
      button.click();
    },
  },
  wait_for_dollar: {
    timeout: 60000,
    find: encontrarSeloConcluido,
    resolve: () => ({ next: "complete1" }),
    perform: (elemento) => elemento.click(),
  },
  complete1: {
    timeout: 30000,
    find: () => document.querySelector(".mission-complete"),
    resolve: () => ({ next: "complete2" }),
    perform: (elemento, state) => {
      if (state.missionType === "bank") {
        const inputValor = document.querySelector("#amount-input");
        if (inputValor) definirValorDoCampo(inputValor, state.transferAmount);
      }
      elemento.click();
    },
  },
  complete2: {
    timeout: 10000,
    find: () => document.querySelector("#modal-submit"),
    resolve: (elemento, state) => ({
      next: "goto_btc",
      patch: { postBtcNext: state.missionType === "transfer" ? "goto_account_to" : "goto_missions" },
      complete: true,
    }),
    perform: (elemento) => elemento.click(),
  },
  goto_account_to: {
    timeout: 15000,
    find: () => document.body,
    resolve: (body, state) => ({
      next: "bank_hack",
      patch: { transferPhase: "sweep", currentAccount: state.accountTo },
    }),
    perform: (body, state) => {
      location.href = `https://hackerwars.io/internet?ip=${state.accountToIp}`;
    },
  },
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
  buy_btc_submit: {
    timeout: 15000,
    find: () => {
      const botaoLogin = document.querySelector("#btc-login");
      if (botaoLogin) return { kind: "login", el: botaoLogin };
      const botaoCompra = document.querySelector("#btc-submit");
      return botaoCompra ? { kind: "buy", el: botaoCompra } : null;
    },
    resolve: (found, state) => ({ next: found.kind === "login" ? "buy_btc_click" : state.postBtcNext || "goto_missions" }),
    perform: (found) => found.el.click(),
  },
  goto_missions: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "find_mission" }),
    perform: () => {
      location.href = "https://hackerwars.io/missions";
    },
  },
};
