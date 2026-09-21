chrome.runtime.onMessage.addListener((requisicao, remetente, enviarResposta) => {
  if (requisicao.action === "getTabId") {
    enviarResposta({ tabId: remetente.tab?.id });
    return;
  }
  // Em abas em segundo plano, setTimeout pode ser limitado ou interrompido; atrasos longos usam
  // chrome.alarms, que desperta o service worker mesmo que a aba não esteja visível.
  if (requisicao.action === "scheduleReload") {
    const { tabId: idAba, storageKey: chaveStorage, step: etapa, href: link, delayMs: atrasoMs } = requisicao.payload;
    const nomeAlarme = JSON.stringify({ tabId: idAba, storageKey: chaveStorage, step: etapa, href: link || null });
    chrome.alarms.create(nomeAlarme, { delayInMinutes: Math.max(atrasoMs / 60000, 0.5) });
    enviarResposta({ ok: true });
    return;
  }
  // Content scripts não podem chamar chrome.tabs.create diretamente.
  if (requisicao.action === "openTab") {
    chrome.tabs.create({ url: requisicao.payload.url });
    enviarResposta({ ok: true });
    return;
  }
  // O overlay (popup.js injetado por overlay.js como content script) não tem chrome.alarms,
  // chrome.action nem chrome.downloads; estas chamadas são encaminhadas por aqui.
  if (requisicao.action === "createAlarm") {
    chrome.alarms.create(requisicao.payload.name, requisicao.payload.options);
    enviarResposta({ ok: true });
    return;
  }
  if (requisicao.action === "clearAlarm") {
    chrome.alarms.clear(requisicao.payload.name);
    enviarResposta({ ok: true });
    return;
  }
  if (requisicao.action === "setBadgeText") {
    chrome.action.setBadgeText({ text: requisicao.payload.text });
    enviarResposta({ ok: true });
    return;
  }
  if (requisicao.action === "download") {
    chrome.downloads.download({ url: requisicao.payload.url, filename: requisicao.payload.filename });
    enviarResposta({ ok: true });
  }
});

// Busca /log diretamente do service worker (credentials: "include" envia o cookie de sessão),
// sem manter uma aba em /log. Marca somente linhas novas desde o último snapshot; a primeira
// verificação apenas cria a linha de base e não alerta sobre entradas já existentes.
const nomeAlarmeMonitorLogFundo = "bgLogMonitor";

function decodificarEntidadesHtmlDoLog(texto) {
  return texto
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&");
}

// Uma entrada de invasão real é como "2026-08-23 18:29 - [240.53.223.156] logged in as root":
// um IP externo entrou na nossa máquina. Outras linhas novas são ruído normal, como nossas
// próprias ações ("localhost logged in to [1.2.3.4] as root") e receitas de servidores.
// Corresponder diretamente ao login root evita esses falsos alertas.
function ehLinhaDeIntrusao(linha) {
  return /\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\]\s*logged in as root/i.test(linha);
}

async function verificarLogProprioEmSegundoPlano() {
  const { bgLogMonitor: executor } = await chrome.storage.local.get("bgLogMonitor");
  if (!executor || !executor.running) return;

  try {
    const resposta = await fetch("https://hackerwars.io/log", { credentials: "include" });
    const html = await resposta.text();
    const match = html.match(/<textarea[^>]*name="log"[^>]*>([\s\S]*?)<\/textarea>/i);
    const texto = match ? decodificarEntidadesHtmlDoLog(match[1]) : "";
    const linhas = texto
      .split(/\r?\n/)
      .map((linha) => linha.trim())
      .filter(Boolean);

    const temLinhaBase = (executor.knownLines || []).length > 0;
    const conjuntoConhecido = new Set(executor.knownLines || []);
    const linhasNovas = linhas.filter((linha) => !conjuntoConhecido.has(linha));
    const linhasIntrusao = linhasNovas.filter(ehLinhaDeIntrusao);

    const estadoAtualizado = { ...executor, lastCheck: Date.now(), knownLines: linhas.slice(0, 200) };
    if (temLinhaBase && linhasIntrusao.length > 0) {
      estadoAtualizado.lastAlertAt = Date.now();
      estadoAtualizado.alertLines = linhasIntrusao.slice(0, 20);
      chrome.action.setBadgeText({ text: String(linhasIntrusao.length) });
      chrome.action.setBadgeBackgroundColor({ color: "#d33" });
    }

    await chrome.storage.local.set({ bgLogMonitor: estadoAtualizado });
  } catch (erro) {
    console.log("[HWAuto] background log monitor check failed", erro);
  }
}

chrome.alarms.onAlarm.addListener((alarme) => {
  if (alarme.name === nomeAlarmeMonitorLogFundo) {
    verificarLogProprioEmSegundoPlano();
    return;
  }

  let info;
  try {
    info = JSON.parse(alarme.name);
  } catch {
    return;
  }
  const { tabId: idAba, storageKey: chaveStorage, step: etapa, href: link } = info;
  chrome.storage.local.get(chaveStorage, (dados) => {
    const executor = dados[chaveStorage];
    // Ignore estados obsoletos: parados, em outra etapa ou cuja aba foi reutilizada após o agendamento.
    if (!executor || !executor.running || executor.tabId !== idAba || executor.step !== etapa) return;
    chrome.tabs.get(idAba, (aba) => {
      if (chrome.runtime.lastError || !aba) return;
      if (link) {
        chrome.tabs.update(idAba, { url: link });
      } else {
        chrome.tabs.reload(idAba);
      }
    });
  });
});

// Marca executores de abas fechadas como parados, evitando status obsoleto no pop-up.
chrome.tabs.onRemoved.addListener((idAba) => {
  chrome.storage.local.get(
    [
      "logMonitor",
      "logWatcherRunner",
      "missionRunner",
      "infection2Runner",
      "researchRunner",
      "puzzleRunner",
      "massHackRunner",
      "collectRunner",
      "repKillRunner",
    ],
    ({
      logMonitor,
      logWatcherRunner,
      missionRunner,
      infection2Runner,
      researchRunner,
      puzzleRunner,
      massHackRunner,
      collectRunner,
      repKillRunner,
    }) => {
      const atualizacoes = {};
      if (logMonitor && logMonitor.tabId === idAba && logMonitor.running) {
        atualizacoes.logMonitor = { ...logMonitor, running: false };
      }
      if (logWatcherRunner && logWatcherRunner.tabId === idAba && logWatcherRunner.running) {
        atualizacoes.logWatcherRunner = { ...logWatcherRunner, running: false };
      }
      if (missionRunner && missionRunner.tabId === idAba && missionRunner.running) {
        atualizacoes.missionRunner = { ...missionRunner, running: false };
      }
      if (infection2Runner && infection2Runner.tabId === idAba && infection2Runner.running) {
        atualizacoes.infection2Runner = { ...infection2Runner, running: false };
      }
      if (researchRunner && researchRunner.tabId === idAba && researchRunner.running) {
        atualizacoes.researchRunner = { ...researchRunner, running: false };
      }
      if (puzzleRunner && puzzleRunner.tabId === idAba && puzzleRunner.running) {
        atualizacoes.puzzleRunner = { ...puzzleRunner, running: false };
      }
      if (massHackRunner && massHackRunner.tabId === idAba && massHackRunner.running) {
        atualizacoes.massHackRunner = { ...massHackRunner, running: false };
      }
      if (collectRunner && collectRunner.tabId === idAba && collectRunner.running) {
        atualizacoes.collectRunner = { ...collectRunner, running: false };
      }
      if (repKillRunner && repKillRunner.tabId === idAba && repKillRunner.running) {
        atualizacoes.repKillRunner = { ...repKillRunner, running: false };
      }
      if (Object.keys(atualizacoes).length) chrome.storage.local.set(atualizacoes);
    }
  );
});
