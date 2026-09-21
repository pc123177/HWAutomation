
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
    resolve: () => ({ next: "goto_software" }),
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
    resolve: (resultadoEncontrado) => ({ next: "await_download", patch: { crcFileName: resultadoEncontrado.name, crcFileVersion: resultadoEncontrado.version } }),
    perform: (resultadoEncontrado) => resultadoEncontrado.dlLink.click(),
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
      return ipFixo
        ? { next: "logout", patch: { ...patch, nextIp: ipFixo, puzzleNumber: estado.puzzleNumber + 1 } }
        : { next: "find_riddle", patch: patch };
    },
    perform: (resultadoEncontrado) => {
      if (resultadoEncontrado && resultadoEncontrado.link) resultadoEncontrado.link.click();
    },
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
      next: "logout",
      patch: { nextIp: endereco, puzzleNumber: estado.puzzleNumber + 1 },
      complete: true,
    }),
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
