
const tabelaRespostasPuzzle = {
  2: "3",
  3: "Eyjafjallajökull",
  4: "12, 4",
  5: "24",
  6: "Area 51",
  7: "4",
  8: "Hacker Wars",
  9: "Too Many Secrets",
  12: "Stay Hungry, Stay Foolish",
  13: "Aramis",
  14: "62.5",
  15: "50",
  16: "5, 1, 94",
  18: "Phoebe, Milena, Naomy",
  19: "4, 3",
  20: "a, d, c",
  21: "3, 3, 9",
  22: "5, 2",
  23: "99+99/99",
  24: "49, 35",
  25: "Every player who buys premium is awesome",
  26: "9, 18",
  27: "To be or not to be",
  28: "Hacker Experience",
  30: "Enigma",
  31: "Penny",
  32: "Nishiyama Onsen Keiunkan",
  33: "Hack The Planet",
  34: "password123",
  35: "47",
  36: "show no remorse",
  37: "Despacito",
  38: "1, 2, 3",
  39: "Diamond, Ruby, Sapphire",
  40: "Kung Fury",
  41: "Morpheus",
  42: "HACKER",
  43: "LCM+L",
  44: "Burj Khalifa",
  45: "Satoshi Nakamoto",
  46: "SHA256",
  47: "10/11/2019",
};

const configMiniJogoPuzzleManual = {
  1: { name: "Tic-Tac-Toe", gotchaMessage: "func=tictactoe&status=1" },
  11: { name: "the 2048 tile game", gotchaMessage: "func=2048&type=5" },
  17: { name: "Minesweeper", gotchaMessage: "func=minesweeper", solverUrl: "https://www.logigames.com/minesweeper/solver" },
  29: { name: "Lights Out", gotchaMessage: "func=lightsout", solverUrl: "https://scintilla.dev/lightsout-solver/" },
};

const registroTentativasPuzzleAutomatico = {};

async function tentarResolverPuzzleAutomaticamente(mensagem) {
  try {
    const resposta = await fetch("/gotcha.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
      body: mensagem,
      credentials: "same-origin",
    });
    const dados = await resposta.json();
    return dados.status === "OK";
  } catch (erro) {
    console.log("[HWAuto] gotcha.php auto-solve failed", erro);
    return false;
  }
}

const tabelaIpsFixosPuzzle = {
  10: "1.2.3.4",
};

function encontrarLinkPrimeiroPuzzle() {
  for (const elementoLink of document.querySelectorAll('a[href*="internet?ip="]')) {
    const elementoRotulo = elementoLink.querySelector(".whois-member");
    if (elementoRotulo && elementoRotulo.textContent.trim() === "First Puzzle") return elementoLink;
  }
  return null;
}

function encontrarLinhaCRC() {
  for (const linha of document.querySelectorAll("tr[id]")) {
    const celulas = linha.querySelectorAll("td");
    if (celulas.length < 3) continue;
    const name = celulas[1].textContent.trim();
    if (!/\.crc$/i.test(name)) continue;
    const dlLink = linha.querySelector('a[href*="cmd=dl"]');
    if (!dlLink) continue;
    return { name, version: celulas[2].textContent.trim(), dlLink };
  }
  return null;
}

function encontrarFormularioRespostaQA() {
  const input = document.querySelector('input[name="qa-answer"]');
  const botao = input?.closest("form")?.querySelector('input[type="submit"][value="Submit answer"]');
  return input && botao ? { input: input, button: botao } : null;
}

function encontrarProximoIpPuzzle() {
  const elementoLink = document.querySelector("#puzzle-next a");
  if (!elementoLink) return null;
  return new URL(elementoLink.href, location.href).searchParams.get("ip");
}

const PUZZLE_STEPS = {
  find_first_puzzle: {
    timeout: 15000,
    find: () => encontrarLinkPrimeiroPuzzle(),
    resolve: (elemento, estado) => ({ next: "hack", patch: { puzzleNumber: estado.puzzleNumber || 1 } }),
    perform: (elemento) => elemento.click(),
  },
  hack: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?action=hack"]'),
    resolve: () => ({ next: "hack_bruteforce", patch: { currentIp: new URLSearchParams(location.search).get("ip") } }),
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
    resolve: () => ({ next: "goto_logs", patch: { logsReturnStep: "goto_software" } }),
    perform: (elemento) => elemento.click(),
  },
  goto_software: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?view=software"]'),
    resolve: () => ({ next: "find_crc" }),
    perform: (elemento) => elemento.click(),
  },
  find_crc: {
    timeout: 15000,
    find: () => encontrarLinhaCRC(),
    resolve: (resultadoEncontrado) => ({
      next: "goto_logs",
      patch: { crcFileName: resultadoEncontrado.name, crcFileVersion: resultadoEncontrado.version, logsReturnStep: "grab_puzzle_loot" },
    }),
    perform: (resultadoEncontrado) => resultadoEncontrado.dlLink.click(),
  },
  // Ainda conectados ao alvo: aproveita para baixar qualquer outro software (exceto vírus)
  // disponível ali, um por vez, antes de ir instalar o CRC.
  grab_puzzle_loot: {
    timeout: 15000,
    skipElapsedGate: true,
    find: (estado) => estado.lootQueue || encontrarLinhasDeDownloadRestantes([{ name: estado.crcFileName, version: estado.crcFileVersion }]),
    resolve: (fila, estado) => {
      if (fila.length > 0) {
        return {
          next: "await_puzzle_loot_download",
          patch: { lootQueue: fila.slice(1), lootDownloaded: [...(estado.lootDownloaded || []), fila[0]] },
        };
      }
      return { next: "await_download", patch: { lootQueue: undefined } };
    },
    perform: (fila) => {
      if (fila.length === 0) return;
      const link = encontrarLinkDaLinhaDoSoftware(fila[0].name, fila[0].version, "cmd=dl");
      if (link) link.click();
    },
  },
  // Baixar software (diferente do .crc, que é instantâneo) tem cronômetro real; espera sumir antes
  // de tentar o próximo item, senão o clique seguinte acha a página em transição.
  // Depois limpa o log (uma ação = um rastro novo) antes de seguir pro próximo item.
  await_puzzle_loot_download: {
    timeout: 30000,
    skipElapsedGate: true,
    find: () => (document.querySelector(".elapsed") ? null : true),
    resolve: () => ({ next: "goto_logs", patch: { logsReturnStep: "grab_puzzle_loot" } }),
    perform: () => {},
  },
  await_download: {
    timeout: 60000,
    find: () => document.body,
    resolve: () => ({ next: "install_crc" }),
    perform: () => {
      location.href = "https://hackerwars.io/software";
    },
  },
  install_crc: {
    timeout: 15000,
    find: (estado) => encontrarLinkDaLinhaDoSoftware(estado.crcFileName, estado.crcFileVersion, "action=install"),
    resolve: () => ({ next: "await_install" }),
    perform: (elemento) => elemento.click(),
  },
  await_install: {
    timeout: 60000,
    find: (estado) => {
      const linha = encontrarLinhaDoSoftware(estado.crcFileName, estado.crcFileVersion);
      return linha && linha.classList.contains("installed") ? true : null;
    },
    resolve: () => ({ next: "delete_old_crc" }),
    perform: () => {},
  },
  delete_old_crc: {
    timeout: 15000,
    find: (estado) => {
      if (!estado.installedCrcFileName) return true;
      if (estado.installedCrcFileName === estado.crcFileName && estado.installedCrcFileVersion === estado.crcFileVersion) return true;
      const link = encontrarLinkDaLinhaDoSoftware(estado.installedCrcFileName, estado.installedCrcFileVersion, "action=del");
      return link ? { link: link } : true;
    },
    resolve: (resultadoEncontrado, estado) => {
      const patch = { installedCrcFileName: estado.crcFileName, installedCrcFileVersion: estado.crcFileVersion };
      const ipFixo = tabelaIpsFixosPuzzle[estado.puzzleNumber];
      const postLootNext = ipFixo ? "logout" : "find_riddle";
      const postLootPatch = ipFixo ? { nextIp: ipFixo, puzzleNumber: estado.puzzleNumber + 1 } : {};
      const temLoot = (estado.lootDownloaded || []).length > 0;
      return temLoot
        ? { next: "install_loot", patch: { ...patch, postLootNext: postLootNext, postLootPatch: postLootPatch } }
        : { next: postLootNext, patch: { ...patch, ...postLootPatch } };
    },
    perform: (resultadoEncontrado) => {
      if (resultadoEncontrado && resultadoEncontrado.link) resultadoEncontrado.link.click();
    },
  },
  // Já estamos em /software (própria); instala cada item baixado só se for melhor que a versão já
  // instalada (mesmo nome), apagando a antiga depois — mesma regra usada no CRC acima.
  install_loot: {
    timeout: 15000,
    find: (estado) => {
      const fila = estado.lootDownloaded || [];
      if (fila.length === 0) return "done";
      const linha = encontrarLinhaDoSoftware(fila[0].name, fila[0].version);
      return linha ? { linha: linha, instalada: encontrarVersaoInstaladaPorNome(fila[0].name) } : "not_found";
    },
    resolve: (resultado, estado) => {
      if (resultado === "done") {
        return {
          next: estado.postLootNext || "find_riddle",
          patch: { lootDownloaded: undefined, postLootNext: undefined, ...(estado.postLootPatch || {}), postLootPatch: undefined },
        };
      }
      const fila = estado.lootDownloaded;
      if (resultado === "not_found" || !versaoEhMelhor(fila[0].version, resultado.instalada)) {
        return { next: "install_loot", patch: { lootDownloaded: fila.slice(1) } };
      }
      return { next: "await_loot_install", patch: { lootInstallOldVersion: resultado.instalada } };
    },
    perform: (resultado) => {
      if (resultado === "done" || resultado === "not_found") return;
      resultado.linha.querySelector('a[href*="action=install"]')?.click();
    },
  },
  await_loot_install: {
    timeout: 60000,
    find: (estado) => {
      const linha = encontrarLinhaDoSoftware(estado.lootDownloaded[0].name, estado.lootDownloaded[0].version);
      return linha && linha.classList.contains("installed") ? true : null;
    },
    resolve: (encontrado, estado) => {
      const item = estado.lootDownloaded[0];
      const versaoAntiga = estado.lootInstallOldVersion;
      if (versaoAntiga != null && versaoAntiga !== item.version) return { next: "delete_old_loot" };
      return { next: "install_loot", patch: { lootDownloaded: estado.lootDownloaded.slice(1), lootInstallOldVersion: undefined } };
    },
    perform: () => {},
  },
  delete_old_loot: {
    timeout: 15000,
    find: (estado) => encontrarLinkDaLinhaDoSoftware(estado.lootDownloaded[0].name, estado.lootInstallOldVersion, "action=del"),
    resolve: (elemento, estado) => ({
      next: "install_loot",
      patch: { lootDownloaded: estado.lootDownloaded.slice(1), lootInstallOldVersion: undefined },
    }),
    perform: (elemento) => elemento.click(),
  },
  find_riddle: {
    timeout: 120000,
    find: () => document.body,
    resolve: () => ({ next: "answer_qa" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?view=software&cmd=riddle";
    },
  },
  answer_qa: {
    timeout: 15000,
    find: encontrarFormularioRespostaQA,
    resolve: (resultadoEncontrado, estado) => ({ next: tabelaRespostasPuzzle[estado.puzzleNumber] != null ? "grab_next_ip" : "await_puzzle_solve" }),
    perform: ({ input, button }, estado) => {
      const respostaPuzzle = tabelaRespostasPuzzle[estado.puzzleNumber];
      if (respostaPuzzle == null) return;
      definirValorDoCampo(input, respostaPuzzle);
      button.click();
    },
    onNotFound: () => ({
      retryDelayMs: 0,
      reason: "no Q&A gate found, trying auto-solve",
      next: "auto_solve_puzzle",
    }),
  },
  auto_solve_puzzle: {
    timeout: 20000,
    find: (estado) => {
      const jogo = configMiniJogoPuzzleManual[estado.puzzleNumber];
      if (!jogo?.gotchaMessage) return "skip";
      if (!(estado.puzzleNumber in registroTentativasPuzzleAutomatico)) {
        registroTentativasPuzzleAutomatico[estado.puzzleNumber] = "pending";
        tentarResolverPuzzleAutomaticamente(jogo.gotchaMessage).then((sucesso) => {
          registroTentativasPuzzleAutomatico[estado.puzzleNumber] = sucesso ? "ok" : "failed";
        });
      }
      const estadoResolucao = registroTentativasPuzzleAutomatico[estado.puzzleNumber];
      return estadoResolucao === "pending" ? null : estadoResolucao;
    },
    resolve: (estadoResolucao) => ({ next: estadoResolucao === "ok" ? "solved_reload" : "await_puzzle_solve" }),
    perform: () => {},
  },
  solved_reload: {
    timeout: 5000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "grab_next_ip" }),
    perform: () => {
      location.reload();
    },
  },
  await_puzzle_solve: {
    timeout: 50,
    find: (estado) => (estado.continueRequested ? true : null),
    onNotFound: (estado) => {
      const jogo = configMiniJogoPuzzleManual[estado.puzzleNumber];
      if (jogo) {
        const solucionadorAberto = estado.solverTabOpenedFor === estado.puzzleNumber;
        if (jogo.solverUrl && !solucionadorAberto) {
          chrome.runtime.sendMessage({ action: "openTab", payload: { url: jogo.solverUrl } });
        }
        return {
          pause: true,
          reason: `Waiting for you to solve ${jogo.name}`,
          patch: jogo.solverUrl ? { solverTabOpenedFor: estado.puzzleNumber } : undefined,
        };
      }
      return {
        pause: true,
        reason: `Puzzle ${estado.puzzleNumber} has no saved answer — solve it manually, then hit Continue (or add it to PUZZLE_ANSWERS).`,
      };
    },
    resolve: () => ({ next: "grab_next_ip", patch: { continueRequested: false } }),
    perform: () => {},
  },
  grab_next_ip: {
    timeout: 15000,
    find: encontrarProximoIpPuzzle,
    resolve: (endereco, estado) => ({
      next: "goto_logs",
      patch: { nextIp: endereco, puzzleNumber: estado.puzzleNumber + 1, logsReturnStep: "logout" },
      complete: true,
    }),
    perform: () => {},
  },
  // Limpa o log após CADA ação no alvo (login, download) - não só uma vez no final - pra
  // minimizar o tempo em que nosso rastro fica visível. `logsReturnStep` guarda pra onde voltar
  // depois de limpar; quem chama goto_logs sempre define esse campo antes.
  //
  // Prefere clicar no link relativo já presente na página (preserva o alvo conectado); só cai
  // para navegação absoluta com ip= explícito quando a página atual não tem esse link (ex: após
  // resolver um mini-jogo/riddle).
  goto_logs: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.querySelector('a[href="?view=logs"]') || true,
    resolve: () => ({ next: "clear_logs" }),
    perform: (encontrado, estado) => {
      if (encontrado !== true) return encontrado.click();
      location.href = `https://hackerwars.io/internet?ip=${estado.currentIp}&view=logs`;
    },
  },
  clear_logs: {
    timeout: 15000,
    skipElapsedGate: true,
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
    resolve: (elemento, estado) => ({ next: estado.logsReturnStep, patch: { logsReturnStep: undefined } }),
    perform: () => {},
  },
  logout: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "goto_next_target" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?view=logout";
    },
  },
  goto_next_target: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "hack" }),
    perform: (corpoPagina, estado) => {
      location.href = `https://hackerwars.io/internet?ip=${estado.nextIp}`;
    },
  },
};
