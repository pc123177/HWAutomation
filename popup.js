// Este código roda só depois que o DOM do cartão existe. Se carregado pelo popup.html,
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
function inicializarInterfacePopup() {
const elementoLog = document.getElementById("log");

function registrarLog(mensagem) {
  const tempo = new Date().toLocaleTimeString();
  elementoLog.textContent = `[${tempo}] ${mensagem}\n` + elementoLog.textContent;
}

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
const elementoMenuPrincipal = document.getElementById("mainMenu");
let idSubmenuAtual = null;

function ocultarTudo() {
  elementoMenuPrincipal.classList.add("hidden");
  for (const submenu of document.querySelectorAll(".submenu")) submenu.classList.remove("active");
  for (const painel of document.querySelectorAll(".module-panel")) painel.classList.remove("active");
}

function mostrarMenuPrincipal() {
  ocultarTudo();
  elementoMenuPrincipal.classList.remove("hidden");
  idSubmenuAtual = null;
}

function mostrarSubmenu(idSubmenu) {
  ocultarTudo();
  document.getElementById(idSubmenu).classList.add("active");
  idSubmenuAtual = idSubmenu;
}

function mostrarPainel(idPainel) {
  ocultarTudo();
  for (const painel of document.querySelectorAll(".module-panel")) {
    painel.classList.toggle("active", painel.id === idPainel);
  }
}

for (const botaoGrupo of document.querySelectorAll("#mainMenu [data-group]")) {
  botaoGrupo.addEventListener("click", () => mostrarSubmenu(botaoGrupo.dataset.group));
}
for (const itemMenu of document.querySelectorAll(".submenu .menu-item[data-target]")) {
  itemMenu.addEventListener("click", () => mostrarPainel(itemMenu.dataset.target));
}
for (const botaoVoltarMenuPrincipal of document.querySelectorAll("[data-back-to-main]")) {
  botaoVoltarMenuPrincipal.addEventListener("click", mostrarMenuPrincipal);
}
for (const botaoVoltar of document.querySelectorAll(".module-panel [data-back]")) {
  botaoVoltar.addEventListener("click", () => {
    if (botaoVoltar.dataset.backTarget) {
      mostrarPainel(botaoVoltar.dataset.backTarget);
    } else {
      idSubmenuAtual ? mostrarSubmenu(idSubmenuAtual) : mostrarMenuPrincipal();
    }
  });
}

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
document.getElementById("setupBtn").addEventListener("click", () => {
  idSubmenuAtual = null;
  mostrarPainel("panel-setup");
});

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
const elementoCartao = document.getElementById("hwauto-card");
const elementoBotaoRecolher = document.getElementById("hwauto-collapse-toggle");
elementoBotaoRecolher.addEventListener("click", () => {
  const estaRecolhido = elementoCartao.classList.toggle("collapsed");
  elementoBotaoRecolher.innerHTML = estaRecolhido ? "&#9650;" : "&#9660;";
});

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
document.getElementById("hwauto-hide-toggle").addEventListener("click", async () => {
  await chrome.storage.local.set({ overlayHidden: true });
  const raizOverlay = document.getElementById("hwauto-overlay-root");
  if (raizOverlay) raizOverlay.style.display = "none";
});

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
const temApiTabs = typeof chrome !== "undefined" && !!chrome.tabs;

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
if (temApiTabs) {
  chrome.storage.local.set({ overlayHidden: false });
}

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
const todasChavesExecutores = [
  "researchRunner",
  "collectRunner",
  "repKillRunner",
  "logMonitor",
  "bgLogMonitor",
  "logWatcherRunner",
  "softwareGather",
  "missionRunner",
  "infection2Runner",
  "puzzleRunner",
  "massHackRunner",
];

const rotulosExecutores = {
  researchRunner: "Pesquisa",
  collectRunner: "Coleta",
  repKillRunner: "Limpeza de reputação",
  logMonitor: "Monitor de log",
  bgLogMonitor: "Monitor de log em segundo plano",
  logWatcherRunner: "Observador de log",
  softwareGather: "Coletor",
  missionRunner: "Missões",
  infection2Runner: "Infecção",
  puzzleRunner: "Quebra-cabeças",
  massHackRunner: "Invasão em massa",
};

async function renderizarStatusScriptsEmExecucao() {
  const elemento = document.getElementById("runningScriptsStatus");
  const dadosArmazenados = await chrome.storage.local.get(todasChavesExecutores);
  const listaEmExecucao = todasChavesExecutores.filter((chave) => dadosArmazenados[chave] && dadosArmazenados[chave].running).map((chave) => rotulosExecutores[chave]);
  elemento.textContent = listaEmExecucao.length > 0 ? `Em execução: \n${listaEmExecucao.join("\n")}` : "Nenhuma tarefa está em execução";
}

document.getElementById("stopAllBtn").addEventListener("click", async () => {
  const dadosArmazenados = await chrome.storage.local.get(todasChavesExecutores);
  const atualizacoes = {};
  let quantidadeParada = 0;
  for (const chave of todasChavesExecutores) {
    const executor = dadosArmazenados[chave];
    if (executor && executor.running) {
      atualizacoes[chave] = { ...executor, running: false };
      quantidadeParada++;
    }
  }
  if (Object.keys(atualizacoes).length > 0) {
    await chrome.storage.local.set(atualizacoes);
  }
  limparAlarmeFundo("bgLogMonitor");
  registrarLog(quantidadeParada > 0 ? `Paradas: ${quantidadeParada} tarefa(s).` : "Nenhuma tarefa está em execução.");
  renderizarStatusPesquisa();
  renderizarStatusColeta();
  renderizarStatusLimpezaReputacao();
  renderizarStatusMonitorLog();
  renderizarStatusMonitorLogFundo();
  renderizarStatusVigiaLog();
  renderizarStatusColetor();
  renderizarStatusMissoes();
  renderizarStatusPuzzle();
  renderizarStatusMassHack();
  renderizarStatusInfeccao();
  renderizarStatusScriptsEmExecucao();
});

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
async function obterAbaAtual() {
  if (temApiTabs) {
    const [aba] = await chrome.tabs.query({ active: true, currentWindow: true });
    return aba;
  }
  const idAba = await new Promise((concluir) => {
    chrome.runtime.sendMessage({ action: "getTabId" }, (resposta) => concluir(resposta?.tabId));
  });
  return { id: idAba, url: location.href };
}

function irParaAba(idAba, url) {
  if (temApiTabs) {
    chrome.tabs.update(idAba, { url: url });
  } else {
    location.href = url;
  }
}

function recarregarAba(idAba) {
  if (temApiTabs) {
    chrome.tabs.reload(idAba);
  } else {
    location.reload();
  }
}

function criarAlarmeFundo(nome, opcao) {
  if (temApiTabs) {
    chrome.alarms.create(nome, opcao);
  } else {
    chrome.runtime.sendMessage({ action: "createAlarm", payload: { name: nome, options: opcao } });
  }
}

function limparAlarmeFundo(nome) {
  if (temApiTabs) {
    chrome.alarms.clear(nome);
  } else {
    chrome.runtime.sendMessage({ action: "clearAlarm", payload: { name: nome } });
  }
}

function definirTextoBadgeToolbar(texto) {
  if (temApiTabs) {
    chrome.action.setBadgeText({ text: texto });
  } else {
    chrome.runtime.sendMessage({ action: "setBadgeText", payload: { text: texto } });
  }
}

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
function baixarArquivoTexto(texto, tipoMime, nomeArquivo) {
  const url = `data:${tipoMime};charset=utf-8,${encodeURIComponent(texto)}`;
  if (temApiTabs) {
    chrome.downloads.download({ url: url, filename: nomeArquivo });
  } else {
    chrome.runtime.sendMessage({ action: "download", payload: { url: url, filename: nomeArquivo } });
  }
}

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
function analisarListaIps(texto) {
  return texto
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
function analisarTamanhoComoMB(texto) {
  const match = texto.trim().match(/([\d.]+)\s*(GB|MB)/i);
  if (!match) return null;
  const valorNumerico = parseFloat(match[1]);
  return match[2].toUpperCase() === "GB" ? valorNumerico * 1024 : valorNumerico;
}

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
function analisarOpcoesVirus(texto) {
  const listaOpcoes = [];
  for (const linhaOriginal of texto.split("\n")) {
    const linha = linhaOriginal.trim();
    if (!linha) continue;
    const match = linha.match(/^(.*\S)\s+([\d.]+\s*(?:mb|gb))$/i);
    if (!match) continue;
    const tamanhoMB = analisarTamanhoComoMB(match[2]);
    if (tamanhoMB == null) continue;
    listaOpcoes.push({ name: match[1], sizeMb: tamanhoMB });
  }
  return listaOpcoes;
}

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
const campoIpsIniciais = [
  { key: "downloadCenter", id: "setupIpDownloadCenter", label: "Download Center" },
  { key: "firstInternational", id: "setupIpFirstInternational", label: "First International Bank" },
  { key: "hebc", id: "setupIpHebc", label: "HEBC" },
  { key: "americanExpense", id: "setupIpAmericanExpense", label: "American Expense" },
  { key: "swissInternationalBank", id: "setupIpSwissInternationalBank", label: "Swiss International Bank" },
  { key: "ultimateBank", id: "setupIpUltimateBank", label: "Ultimate Bank" },
];
const rotuloBanco = Object.fromEntries(
  campoIpsIniciais.filter((campo) => campo.key !== "downloadCenter").map((campo) => [campo.key, campo.label])
);

async function carregarIpsIniciais() {
  const { setupIps } = await chrome.storage.local.get("setupIps");
  const mapaIps = setupIps || {};
  for (const campo of campoIpsIniciais) {
    document.getElementById(campo.id).value = mapaIps[campo.key] || "";
  }
  const quantidadeConfigurada = campoIpsIniciais.filter((campo) => mapaIps[campo.key]).length;
  document.getElementById("setupStatus").textContent = `Configurados: ${quantidadeConfigurada}/${campoIpsIniciais.length} IPs`;
}

document.getElementById("setupSaveBtn").addEventListener("click", async () => {
  const mapaIps = {};
  for (const campo of campoIpsIniciais) {
    const valorNumerico = document.getElementById(campo.id).value.trim();
    if (valorNumerico) mapaIps[campo.key] = valorNumerico;
  }
  await chrome.storage.local.set({ setupIps: mapaIps });
  registrarLog("Configuração inicial salva.");
  carregarIpsIniciais();
});

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
function formatarHistorico(historico) {
  if (!historico || historico.length === 0) return "";
  // Esta etapa atualiza a interface e preserva o comportamento da extensão.
  // Esta etapa atualiza a interface e preserva o comportamento da extensão.
  const linhas = historico.slice(0, 15).map((entrada) => `[${new Date(entrada.at).toLocaleTimeString()}] ${entrada.msg}`);
  return "\n\nRegistros recentes:\n" + linhas.join("\n");
}

async function renderizarStatusPesquisa() {
  const { researchRunner: executor } = await chrome.storage.local.get("researchRunner");
  const elemento = document.getElementById("researchStatus");
  if (!executor) {
    elemento.textContent = "Parado";
    return;
  }
  const linhas = [];
  if (executor.running) {
    linhas.push(`Em execução: ${executor.step}`);
  } else if (executor.pausedReason) {
    linhas.push(`pausado: ${executor.pausedReason}`);
  } else if (executor.stuckAt) {
    linhas.push(`Travado em: ${executor.stuckAt}`);
  } else {
    linhas.push(`Parado (${executor.step || "Parado"})`);
  }
  linhas.push(`Ciclos concluídos: ${executor.loopsThisRun || 0}/${executor.researchLoopCount || 1}`);
  elemento.textContent = linhas.join("\n") + formatarHistorico(executor.history);
}

const inputNomeSoftwarePesquisa = document.getElementById("researchSoftwareName");
const checkboxExcluirVersaoAntiga = document.getElementById("researchDeleteOldVersion");
const botaoAlternarColetaPesquisa = document.getElementById("researchCollectToggleBtn");

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
function configurarAlternanciaColetaPesquisa(ativado) {
  botaoAlternarColetaPesquisa.dataset.on = ativado ? "1" : "";
  botaoAlternarColetaPesquisa.textContent = ativado ? "✅" : "$";
}
botaoAlternarColetaPesquisa.addEventListener("click", () => {
  configurarAlternanciaColetaPesquisa(botaoAlternarColetaPesquisa.dataset.on !== "1");
});

async function carregarConfiguracoesPesquisa() {
  const { researchConfig } = await chrome.storage.local.get("researchConfig");
  inputNomeSoftwarePesquisa.value = researchConfig?.name || "";
  document.getElementById("researchCycles").value = researchConfig?.cycles || "1";
  document.getElementById("researchLoopCount").value = researchConfig?.loopCount || "1";
  checkboxExcluirVersaoAntiga.checked = !!researchConfig?.deleteOldVersion;
  configurarAlternanciaColetaPesquisa(!!researchConfig?.collectMoney);
  document.getElementById("researchConfigStatus").textContent = researchConfig?.name
    ? `Salvo: ${researchConfig.name}`
    : "Não configurado";
}

document.getElementById("researchSaveBtn").addEventListener("click", async () => {
  const nome = inputNomeSoftwarePesquisa.value.trim();
  await chrome.storage.local.set({
    researchConfig: {
      name: nome,
      cycles: document.getElementById("researchCycles").value,
      loopCount: document.getElementById("researchLoopCount").value,
      deleteOldVersion: checkboxExcluirVersaoAntiga.checked,
      collectMoney: botaoAlternarColetaPesquisa.dataset.on === "1",
    },
  });
  registrarLog("Configurações de pesquisa salvas.");
  carregarConfiguracoesPesquisa();
});

document.getElementById("researchStartBtn").addEventListener("click", async () => {
  const nomeSoftwarePesquisa = inputNomeSoftwarePesquisa.value.trim();
  if (!nomeSoftwarePesquisa) {
    registrarLog("Preencha o nome do software a pesquisar antes de iniciar.");
    return;
  }
  const ciclosPesquisa = parseFloat(document.getElementById("researchCycles").value) || 1;
  const repeticoesPesquisa = parseFloat(document.getElementById("researchLoopCount").value) || 1;
  const excluirVersaoAntigaPesquisa = checkboxExcluirVersaoAntiga.checked;
  const coletaPesquisa = botaoAlternarColetaPesquisa.dataset.on === "1";
  const aba = await obterAbaAtual();
  const { researchRunner: executorAnterior } = await chrome.storage.local.get("researchRunner");
  await chrome.storage.local.set({
    researchRunner: {
      running: true,
      tabId: aba.id,
      step: "goto_university_list",
      stuckAt: null,
      researchSoftwareName: nomeSoftwarePesquisa,
      researchCycles: ciclosPesquisa,
      researchLoopCount: repeticoesPesquisa,
      researchDeleteOldVersion: excluirVersaoAntigaPesquisa,
      researchCollectMoney: coletaPesquisa,
      loopsThisRun: 0,
      completedCount: executorAnterior?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  irParaAba(aba.id, "https://hackerwars.io/university.php");
  registrarLog(`Pesquisa iniciada — procurando "${nomeSoftwarePesquisa}" (total de ${repeticoesPesquisa} ciclo(s)).`);
  renderizarStatusPesquisa();
});

document.getElementById("researchStopBtn").addEventListener("click", async () => {
  const { researchRunner: executor } = await chrome.storage.local.get("researchRunner");
  if (!executor) return;
  await chrome.storage.local.set({ researchRunner: { ...executor, running: false } });
  registrarLog("Pesquisa parada.");
  renderizarStatusPesquisa();
});

async function renderizarStatusColeta() {
  const { collectRunner: executor } = await chrome.storage.local.get("collectRunner");
  const elemento = document.getElementById("collectStatus");
  if (!executor) {
    elemento.textContent = "Parado";
    return;
  }
  const linhas = [];
  if (executor.running) {
    linhas.push(`Em execução: ${executor.step}`);
  } else if (executor.stuckAt) {
    linhas.push(`Travado em: ${executor.stuckAt}`);
  } else {
    linhas.push(`Parado (${executor.step || "Parado"})`);
  }
  linhas.push(`Coletas concluídas: ${executor.completedCount || 0}`);
  elemento.textContent = linhas.join("\n") + formatarHistorico(executor.history);
}

const intervaloMinimoColetaMin = 10.5;
const intervaloPadraoColetaMin = 60;
const inputIntervaloColeta = document.getElementById("collectIntervalMinutes");

async function carregarIntervaloColeta() {
  const { collectIntervalMinutes } = await chrome.storage.local.get("collectIntervalMinutes");
  inputIntervaloColeta.value = collectIntervalMinutes || intervaloPadraoColetaMin;
}

document.getElementById("collectStartBtn").addEventListener("click", async () => {
  let minutos = parseFloat(inputIntervaloColeta.value);
  if (!minutos || minutos < intervaloMinimoColetaMin) {
    minutos = intervaloMinimoColetaMin;
    inputIntervaloColeta.value = minutos;
    registrarLog(`O intervalo de coleta não pode ser inferior a ${intervaloMinimoColetaMin} minuto(limite do site) — esse valor foi aplicado.`);
  }
  await chrome.storage.local.set({ collectIntervalMinutes: minutos });

  const aba = await obterAbaAtual();
  const { collectRunner: executorAnterior } = await chrome.storage.local.get("collectRunner");
  await chrome.storage.local.set({
    collectRunner: {
      running: true,
      tabId: aba.id,
      step: "goto_list",
      stuckAt: null,
      collectIntervalMs: minutos * 60 * 1000,
      completedCount: executorAnterior?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  irParaAba(aba.id, "https://hackerwars.io/list.php?action=collect");
  registrarLog(`Coleta iniciada (a cada ${minutos} minuto(s)).`);
  renderizarStatusColeta();
});

document.getElementById("collectStopBtn").addEventListener("click", async () => {
  const { collectRunner: executor } = await chrome.storage.local.get("collectRunner");
  if (!executor) return;
  await chrome.storage.local.set({ collectRunner: { ...executor, running: false } });
  registrarLog("Coleta parada.");
  renderizarStatusColeta();
});

async function renderizarStatusLimpezaReputacao() {
  const { repKillRunner: executor } = await chrome.storage.local.get("repKillRunner");
  const elemento = document.getElementById("repKillStatus");
  if (!executor) {
    elemento.textContent = "Parado";
    return;
  }
  const linhas = [];
  if (executor.running) {
    linhas.push(`Em execução: ${executor.step}`);
  } else if (executor.stuckAt) {
    linhas.push(`Travado em: ${executor.stuckAt}`);
  } else {
    linhas.push(`Parado (${executor.step || "Parado"})`);
  }
  linhas.push(`Tarefas canceladas: ${executor.completedCount || 0}`);
  elemento.textContent = linhas.join("\n") + formatarHistorico(executor.history);
}

document.getElementById("repKillStartBtn").addEventListener("click", async () => {
  const aba = await obterAbaAtual();
  const { repKillRunner: executorAnterior } = await chrome.storage.local.get("repKillRunner");
  await chrome.storage.local.set({
    repKillRunner: {
      running: true,
      tabId: aba.id,
      step: "goto_missions",
      stuckAt: null,
      completedCount: executorAnterior?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  irParaAba(aba.id, "https://hackerwars.io/missions");
  registrarLog("Limpeza de reputação iniciada.");
  renderizarStatusLimpezaReputacao();
});

document.getElementById("repKillStopBtn").addEventListener("click", async () => {
  const { repKillRunner: executor } = await chrome.storage.local.get("repKillRunner");
  if (!executor) return;
  await chrome.storage.local.set({ repKillRunner: { ...executor, running: false } });
  registrarLog("Limpeza de reputação parada.");
  renderizarStatusLimpezaReputacao();
});

async function renderizarStatusMonitorLog() {
  const { logMonitor: executor } = await chrome.storage.local.get("logMonitor");
  const elemento = document.getElementById("logMonitorStatus");
  if (!executor) {
    elemento.textContent = "Parado";
    return;
  }
  const textoStatus = executor.running ? "Em execução" : "Parado";
  const ultimaVerificacao = executor.lastCheck ? new Date(executor.lastCheck).toLocaleTimeString() : "nunca";
  elemento.textContent = `${textoStatus} (aba ${executor.tabId})\nÚltima verificação: ${ultimaVerificacao}\nLimpezas: ${executor.clearedCount || 0}`;
}

document.getElementById("logMonitorStartBtn").addEventListener("click", async () => {
  const aba = await obterAbaAtual();
  await chrome.storage.local.set({
    logMonitor: { running: true, tabId: aba.id, lastCheck: null, clearedCount: 0 },
  });
  irParaAba(aba.id, "https://hackerwars.io/log");
  registrarLog("Monitor de log iniciado.");
  renderizarStatusMonitorLog();
});

document.getElementById("logMonitorStopBtn").addEventListener("click", async () => {
  const { logMonitor: executor } = await chrome.storage.local.get("logMonitor");
  if (!executor) return;
  await chrome.storage.local.set({ logMonitor: { ...executor, running: false } });
  registrarLog("Parada do monitor de log solicitada (efeito em cerca de 30 segundos).");
  renderizarStatusMonitorLog();
});

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
const intervaloMonitorLogFundoMin = 1;

async function renderizarStatusMonitorLogFundo() {
  const { bgLogMonitor: executor } = await chrome.storage.local.get("bgLogMonitor");
  const elemento = document.getElementById("bgLogMonitorStatus");
  if (!executor) {
    elemento.textContent = "Parado";
    return;
  }
  const textoStatus = executor.running ? "Em execução" : "Parado";
  const ultimaVerificacao = executor.lastCheck ? new Date(executor.lastCheck).toLocaleTimeString() : "nunca";
  const linhasAlerta = executor.alertLines || [];
  const textoAlerta = linhasAlerta.length > 0 ? `\nEncontradas ${linhasAlerta.length}  nova(s) entrada(s):\n${linhasAlerta.slice(0, 5).join("\n")}` : "";
  elemento.textContent = `${textoStatus}\nÚltima verificação: ${ultimaVerificacao}${textoAlerta}`;
}

document.getElementById("bgLogMonitorStartBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({
    bgLogMonitor: { running: true, lastCheck: null, knownLines: [], alertLines: [] },
  });
  criarAlarmeFundo("bgLogMonitor", { periodInMinutes: intervaloMonitorLogFundoMin });
  definirTextoBadgeToolbar("");
  registrarLog("Monitor de log em segundo plano iniciado — consulta /log diretamente, sem manter uma aba aberta.");
  renderizarStatusMonitorLogFundo();
});

document.getElementById("bgLogMonitorStopBtn").addEventListener("click", async () => {
  const { bgLogMonitor: executor } = await chrome.storage.local.get("bgLogMonitor");
  if (!executor) return;
  limparAlarmeFundo("bgLogMonitor");
  await chrome.storage.local.set({ bgLogMonitor: { ...executor, running: false } });
  registrarLog("Monitor de log em segundo plano parado.");
  renderizarStatusMonitorLogFundo();
});

document.getElementById("bgLogMonitorClearAlertBtn").addEventListener("click", async () => {
  const { bgLogMonitor: executor } = await chrome.storage.local.get("bgLogMonitor");
  if (!executor) return;
  await chrome.storage.local.set({ bgLogMonitor: { ...executor, alertLines: [] } });
  definirTextoBadgeToolbar("");
  renderizarStatusMonitorLogFundo();
});

async function renderizarStatusVigiaLog() {
  const { logWatcherRunner: executor } = await chrome.storage.local.get("logWatcherRunner");
  const { gatheredIps: ipsColetados = [] } = await chrome.storage.local.get("gatheredIps");
  const elemento = document.getElementById("logWatcherStatus");
  if (!executor) {
    elemento.textContent = "Parado";
    return;
  }
  const textoStatus = executor.running ? "Em execução" : "Parado";
  const ultimaAtualizacao = executor.lastCheck ? new Date(executor.lastCheck).toLocaleTimeString() : "nunca";
  const coletadosNestaVez = ipsColetados.filter((entrada) => entrada.firstSeen >= executor.startedAt).length;
  elemento.textContent = `${textoStatus} (aba ${executor.tabId})\nÚltima atualização: ${ultimaAtualizacao}\nColetados nesta sessão: ${coletadosNestaVez}`;
}

document.getElementById("logWatcherStartBtn").addEventListener("click", async () => {
  const aba = await obterAbaAtual();
  await chrome.storage.local.set({
    logWatcherRunner: { running: true, tabId: aba.id, lastCheck: null, startedAt: Date.now() },
  });
  registrarLog("Observação de log iniciada na página atual.");
  renderizarStatusVigiaLog();
});

document.getElementById("logWatcherStopBtn").addEventListener("click", async () => {
  const { logWatcherRunner: executor } = await chrome.storage.local.get("logWatcherRunner");
  if (!executor) return;
  await chrome.storage.local.set({ logWatcherRunner: { ...executor, running: false } });
  registrarLog("Parada da observação de log solicitada (efeito em cerca de 3 segundos).");
  renderizarStatusVigiaLog();
});

async function renderizarStatusColetaLog() {
  const { gatheredIps: ipsColetados = [] } = await chrome.storage.local.get("gatheredIps");
  document.getElementById("gatherStatus").textContent = `Coletados: ${ipsColetados.length} IP(s)`;
}

document.getElementById("gatherExportBtn").addEventListener("click", async () => {
  const { gatheredIps: ipsColetados = [] } = await chrome.storage.local.get("gatheredIps");
  if (ipsColetados.length === 0) {
    registrarLog("Não há IPs coletados para exportar.");
    return;
  }
  baixarArquivoTexto(JSON.stringify(ipsColetados, null, 2), "application/json", `hackerwars-gathered-ips-${Date.now()}.json`);
  registrarLog(`Exportados: ${ipsColetados.length} IP(s) coletado(s).`);
});

document.getElementById("gatherClearBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({ gatheredIps: [] });
  registrarLog("IPs coletados removidos.");
  renderizarStatusColetaLog();
});

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
function montarCsvSoftwaresColetados(conjuntoItens) {
  const listaIps = Object.keys(conjuntoItens);
  const blocosDados = listaIps.map((enderecoIp) => {
    const linhas = [enderecoIp, ...conjuntoItens[enderecoIp].items.map((item) => `${item.name}, ${item.version}, ${item.size}`)];
    return linhas.join("\n");
  });
  return blocosDados.join("\n\n");
}

async function renderizarStatusColetor() {
  const { softwareGather: configColeta } = await chrome.storage.local.get("softwareGather");
  const { softwareGatherEntries: itensColetados = {} } = await chrome.storage.local.get("softwareGatherEntries");
  const textoStatus = configColeta?.running ? "Em execução" : "Parado";
  const quantidade = Object.keys(itensColetados).length;
  document.getElementById("softwareGatherStatus").textContent = `${textoStatus}\nColetados: ${quantidade} alvo(s)`;
}

document.getElementById("softwareGatherStartBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({ softwareGather: { running: true } });
  registrarLog("Coletor ativado — obterá a lista de softwares de cada alvo conectado.");
  renderizarStatusColetor();
});

document.getElementById("softwareGatherStopBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({ softwareGather: { running: false } });
  registrarLog("Coletor desativado.");
  renderizarStatusColetor();
});

document.getElementById("softwareGatherExportBtn").addEventListener("click", async () => {
  const { softwareGatherEntries: itensColetados = {} } = await chrome.storage.local.get("softwareGatherEntries");
  const listaIps = Object.keys(itensColetados);
  if (listaIps.length === 0) {
    registrarLog("Não há softwares coletados para exportar.");
    return;
  }
  const textoCsv = montarCsvSoftwaresColetados(itensColetados);
  baixarArquivoTexto(textoCsv, "text/csv", `hackerwars-software-gather-${Date.now()}.csv`);
  registrarLog(`Dados de software exportados de ${listaIps.length} alvo(s).`);
});

document.getElementById("softwareGatherClearBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({ softwareGatherEntries: {} });
  registrarLog("Softwares coletados removidos.");
  renderizarStatusColetor();
});

async function renderizarStatusMissoes() {
  const { missionRunner: executor } = await chrome.storage.local.get("missionRunner");
  const elemento = document.getElementById("missionStatus");
  if (!executor) {
    elemento.textContent = "Parado";
    return;
  }
  const linhas = [];
  if (executor.running) {
    linhas.push(`Em execução: ${executor.step}`);
  } else if (executor.stuckAt) {
    linhas.push(`Travado em: ${executor.stuckAt}`);
  } else {
    linhas.push(`Parado (${executor.step || "Parado"})`);
  }
  if (executor.missionType) linhas.push(`tipo: ${executor.missionType}`);
  if (executor.victimIp) linhas.push(`Vítima: ${executor.victimIp}`);
  if (executor.fileName) linhas.push(`arquivo: ${executor.fileName} ${executor.fileVersion || ""}`);
  if (executor.reward) linhas.push(`Recompensa: $${executor.reward}`);
  linhas.push(`Concluídas: ${executor.completedCount || 0}`);
  elemento.textContent = linhas.join("\n") + formatarHistorico(executor.history);
}

const checkboxesTipoMissao = {
  delete: document.getElementById("missionTypeDelete"),
  steal: document.getElementById("missionTypeSteal"),
  bank: document.getElementById("missionTypeBank"),
  transfer: document.getElementById("missionTypeTransfer"),
};

async function carregarFiltroTiposMissao() {
  const { missionTypeFilter } = await chrome.storage.local.get("missionTypeFilter");
  const listaAtivos = missionTypeFilter || ["delete", "steal", "bank", "transfer"];
  for (const [tipo, checkbox] of Object.entries(checkboxesTipoMissao)) {
    checkbox.checked = listaAtivos.includes(tipo);
  }
}

function obterTiposMissaoSelecionados() {
  return Object.entries(checkboxesTipoMissao)
    .filter(([, checkbox]) => checkbox.checked)
    .map(([tipo]) => tipo);
}

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
const inputContaAutotransferencia = document.getElementById("selfTransferAccount");
const selectBancoAutotransferencia = document.getElementById("selfTransferIp");
const elementoStatusAutotransferencia = document.getElementById("selfTransferStatus");

async function carregarContaAutotransferencia() {
  const { selfTransferAccount } = await chrome.storage.local.get("selfTransferAccount");
  if (selfTransferAccount) {
    inputContaAutotransferencia.value = selfTransferAccount.account || "";
    selectBancoAutotransferencia.value = selfTransferAccount.bankKey || "";
    const textoRotuloBanco = rotuloBanco[selfTransferAccount.bankKey] || "(nenhum banco selecionado)";
    const { setupIps } = await chrome.storage.local.get("setupIps");
    const ipAnalisado = setupIps?.[selfTransferAccount.bankKey];
    elementoStatusAutotransferencia.textContent = ipAnalisado
      ? `Salvo: ${selfTransferAccount.account} @ ${textoRotuloBanco}(${ipAnalisado})`
      : `Salvo: ${selfTransferAccount.account} @ ${textoRotuloBanco} —— Faça a configuração inicial primeiro`;
  } else {
    elementoStatusAutotransferencia.textContent = "Não configurado";
  }
}

document.getElementById("selfTransferSaveBtn").addEventListener("click", async () => {
  const conta = inputContaAutotransferencia.value.trim();
  const chaveBanco = selectBancoAutotransferencia.value;
  if (!conta || !chaveBanco) {
    registrarLog("Informe a conta e selecione o banco antes de salvar.");
    return;
  }
  await chrome.storage.local.set({ selfTransferAccount: { account: conta, bankKey: chaveBanco } });
  registrarLog(`Conta de autotransferência salva: ${conta} @ ${rotuloBanco[chaveBanco]}`);
  carregarContaAutotransferencia();
});

document.getElementById("missionStartBtn").addEventListener("click", async () => {
  const tiposAtivos = obterTiposMissaoSelecionados();
  if (tiposAtivos.length === 0) {
    registrarLog("Selecione pelo menos um tipo de missão.");
    return;
  }
  const precisaAutotransferencia = tiposAtivos.includes("bank") || tiposAtivos.includes("transfer");
  const { selfTransferAccount } = await chrome.storage.local.get("selfTransferAccount");
  if (precisaAutotransferencia && (!selfTransferAccount || !selfTransferAccount.bankKey)) {
    registrarLog("Configure e salve a conta de autotransferência (necessária para missões bancárias/de transferência).");
    return;
  }
  let ipAutotransferencia = null;
  if (precisaAutotransferencia) {
    const { setupIps } = await chrome.storage.local.get("setupIps");
    ipAutotransferencia = setupIps?.[selfTransferAccount.bankKey];
    if (!ipAutotransferencia) {
      registrarLog("Faça a configuração inicial primeiro");
      return;
    }
  }
  await chrome.storage.local.set({ missionTypeFilter: tiposAtivos });

  const aba = await obterAbaAtual();
  const { missionRunner: executorAnterior } = await chrome.storage.local.get("missionRunner");
  await chrome.storage.local.set({
    missionRunner: {
      running: true,
      tabId: aba.id,
      step: "find_mission",
      stuckAt: null,
      enabledTypes: tiposAtivos,
      selfTransferAccount: selfTransferAccount?.account,
      selfTransferIp: ipAutotransferencia,
      completedCount: executorAnterior?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  irParaAba(aba.id, "https://hackerwars.io/missions");
  registrarLog("Automação de missões iniciada.");
  renderizarStatusMissoes();
});

document.getElementById("missionStopBtn").addEventListener("click", async () => {
  const { missionRunner: executor } = await chrome.storage.local.get("missionRunner");
  if (!executor) return;
  await chrome.storage.local.set({ missionRunner: { ...executor, running: false } });
  registrarLog("Automação de missões parada.");
  renderizarStatusMissoes();
});

const maxUploadVirusPadraoMin = 5;

// --- Infection infeccao ---

async function renderizarStatusInfeccao() {
  const { infection2Runner: executor } = await chrome.storage.local.get("infection2Runner");
  const elemento = document.getElementById("infection2Status");
  if (!executor) {
    elemento.textContent = "Parado";
    return;
  }
  const linhas = [];
  if (executor.running) {
    linhas.push(`Em execução: ${executor.step}`);
  } else if (executor.stuckAt) {
    linhas.push(`Travado em: ${executor.stuckAt}`);
  } else {
    linhas.push(`Parado (${executor.step || "Parado"})`);
  }
  if (executor.currentIp) linhas.push(`Alvo: ${executor.currentIp}`);
  if (executor.ipQueue) linhas.push(`Restantes: ${executor.ipQueue.length}/${executor.totalIpCount || 0}`);
  linhas.push(`Infectados: ${executor.completedCount || 0}`);
  if (executor.vddosFile) {
    linhas.push(`vDDoS instalados: ${executor.vddosInstalledCount || 0}, falhas: ${executor.vddosFailedCount || 0}`);
  }
  elemento.textContent = linhas.join("\n") + formatarHistorico(executor.history);
}

const inputOpcoesVirusInfeccao = document.getElementById("infection2VirusOptions");
const elementoStatusOpcoesInfeccao = document.getElementById("infection2OptionsStatus");
const inputMaxUploadMinInfeccao = document.getElementById("infection2MaxMinutes");
const botaoMostrarVDDoS = document.getElementById("infection2VddosRevealBtn");
const boxArquivoVDDoS = document.getElementById("infection2VddosFileBox");
const inputArquivoVDDoS = document.getElementById("infection2VddosFile");
const botaoMostrarPasta = document.getElementById("infection2FolderRevealBtn");
const boxPasta = document.getElementById("infection2FolderBox");
const inputUrlPasta = document.getElementById("infection2FolderUrl");

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
botaoMostrarVDDoS.addEventListener("click", () => {
  botaoMostrarVDDoS.style.display = "none";
  boxArquivoVDDoS.style.display = "";
});
botaoMostrarPasta.addEventListener("click", () => {
  botaoMostrarPasta.style.display = "none";
  boxPasta.style.display = "";
});

async function carregarOpcoesInfeccao() {
  const { infection2VirusOptions, infection2MaxMinutes, infection2VddosFile, infection2FolderUrl } = await chrome.storage.local.get([
    "infection2VirusOptions",
    "infection2MaxMinutes",
    "infection2VddosFile",
    "infection2FolderUrl",
  ]);
  if (infection2VirusOptions && infection2VirusOptions.length > 0) {
    inputOpcoesVirusInfeccao.value = infection2VirusOptions.map((item) => `${item.name} ${item.sizeMb}mb`).join("\n");
    elementoStatusOpcoesInfeccao.textContent = `Salvo: ${infection2VirusOptions.length} opção(ões)`;
  } else {
    elementoStatusOpcoesInfeccao.textContent = "naoConfigurado——usarPadroesInternos";
  }
  inputMaxUploadMinInfeccao.value = infection2MaxMinutes || maxUploadVirusPadraoMin;
  // Esta etapa atualiza a interface e preserva o comportamento da extensão.
  inputArquivoVDDoS.value = infection2VddosFile ? `${infection2VddosFile.name} ${infection2VddosFile.sizeMb}mb` : "";
  boxArquivoVDDoS.style.display = infection2VddosFile ? "" : "none";
  botaoMostrarVDDoS.style.display = infection2VddosFile ? "none" : "";
  inputUrlPasta.value = infection2FolderUrl || "";
  boxPasta.style.display = infection2FolderUrl ? "" : "none";
  botaoMostrarPasta.style.display = infection2FolderUrl ? "none" : "";
}

document.getElementById("infection2SaveBtn").addEventListener("click", async () => {
  const listaOpcoes = analisarOpcoesVirus(inputOpcoesVirusInfeccao.value);
  if (listaOpcoes.length === 0) {
    registrarLog('Não foi possível interpretar opções de vírus válidas — cada linha precisa de nome e tamanho (por exemplo, "Small DDoS.vddos 50mb").');
    return;
  }
  const maxMinutos = parseInt(inputMaxUploadMinInfeccao.value, 10) || maxUploadVirusPadraoMin;

  // Esta etapa atualiza a interface e preserva o comportamento da extensão.
  // Esta etapa atualiza a interface e preserva o comportamento da extensão.
  const textoVDDoS = inputArquivoVDDoS.value.trim();
  let arquivoVDDoS = null;
  if (textoVDDoS) {
    const resultadoResolvido = analisarOpcoesVirus(textoVDDoS);
    if (resultadoResolvido.length === 0) {
      registrarLog('Não foi possível interpretar o arquivo vDDoS — é necessário informar nome e tamanho (por exemplo, "KnockKnockMF.vddos 25mb").');
      return;
    }
    arquivoVDDoS = resultadoResolvido[0];
  }
  const urlPasta = inputUrlPasta.value.trim();

  await chrome.storage.local.set({
    infection2VirusOptions: listaOpcoes,
    infection2MaxMinutes: maxMinutos,
    infection2VddosFile: arquivoVDDoS,
    infection2FolderUrl: urlPasta,
  });
  registrarLog(
    `Salvas: ${listaOpcoes.length} opção(ões) de vírus; tempo máximo de upload: ${maxMinutos} minuto` +
      `${arquivoVDDoS ? `, vDDoS: ${arquivoVDDoS.name}` : ""}${urlPasta ? ", URL da pasta configurada" : ""}.`
 );
  carregarOpcoesInfeccao();
});

function i2AplicarPredefinicao(nome, texto) {
  if (inputOpcoesVirusInfeccao.value.trim()) {
    registrarLog(`O campo de opções de vírus já contém dados — limpe-o antes de carregar a predefinição ${nome}..`);
    return;
  }
  inputOpcoesVirusInfeccao.value = texto;
  registrarLog(`Predefinição ${nome} carregada — clique em "Salvar opções de vírus" para aplicar.`);
}

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
const predefinicaoVirus = {
  spam: "Super Spam.vspam 1gb\nAdvanced Spam.vspam 236mb\nDecent Spam.vspam 36mb",
  warez: "Super Warez.vwarez 1gb\nAdvanced Warez.vwarez 236mb\nDecent Warez.vwarez 36mb",
  miner: "Super Miner.vminer 1.7gb\nAdvanced Miner.vminer 413mb\nDecent Miner.vminer 63mb",
};

document.getElementById("infection2PresetSpamBtn").addEventListener("click", () => i2AplicarPredefinicao("Spam", predefinicaoVirus.spam));
document.getElementById("infection2PresetWarezBtn").addEventListener("click", () => i2AplicarPredefinicao("Warez", predefinicaoVirus.warez));
document.getElementById("infection2PresetMinerBtn").addEventListener("click", () => i2AplicarPredefinicao("Miner", predefinicaoVirus.miner));

document.getElementById("infection2ClearCacheBtn").addEventListener("click", async () => {
  inputOpcoesVirusInfeccao.value = "";
  inputArquivoVDDoS.value = "";
  boxArquivoVDDoS.style.display = "none";
  botaoMostrarVDDoS.style.display = "";
  inputUrlPasta.value = "";
  boxPasta.style.display = "none";
  botaoMostrarPasta.style.display = "";
  await chrome.storage.local.remove([
    "infection2VirusOptions",
    "infection2VddosFile",
    "infection2FolderUrl",
    "infection2LinkCache",
  ]);
  carregarOpcoesInfeccao();
  const { setupIps } = await chrome.storage.local.get("setupIps");
  if (!setupIps?.downloadCenter) {
    registrarLog("Faça a configuração inicial primeiro");
  } else {
    registrarLog(`Opções de vírus e cache de links limpos — IP do Download Center configurado (${setupIps.downloadCenter}).`);
  }
});

document.getElementById("infection2StartBtn").addEventListener("click", async () => {
  const aba = await obterAbaAtual();
  const { infection2Runner: executorAnterior } = await chrome.storage.local.get("infection2Runner");
  const {
    infection2VirusOptions: opcoesVirus,
    infection2MaxMinutes: maxMinutosVDDoS,
    infection2VddosFile: arquivoVDDoS,
    infection2FolderUrl: urlPasta,
    infection2LinkCache: cacheLinks,
    setupIps,
  } = await chrome.storage.local.get([
    "infection2VirusOptions",
    "infection2MaxMinutes",
    "infection2VddosFile",
    "infection2FolderUrl",
    "infection2LinkCache",
    "setupIps",
  ]);
  const listaIpsManual = analisarListaIps(document.getElementById("infection2IpList").value);
  const etapaAposResolverLinks = listaIpsManual.length > 0 ? "goto_target" : "goto_hdb";

  // Esta etapa atualiza a interface e preserva o comportamento da extensão.
  // Esta etapa atualiza a interface e preserva o comportamento da extensão.
  // Esta etapa atualiza a interface e preserva o comportamento da extensão.
  const chaveOpcao = JSON.stringify({
    options: opcoesVirus || [],
    vddosFile: arquivoVDDoS || null,
    folderUrl: urlPasta || "",
  });
  const cacheReutilizavel = cacheLinks && cacheLinks.optionsKey === chaveOpcao;
  if (!cacheReutilizavel && !setupIps?.downloadCenter) {
    registrarLog("Faça a configuração inicial primeiro");
    return;
  }

  const statusBase = {
    running: true,
    tabId: aba.id,
    stuckAt: null,
    virusOptions: opcoesVirus || [],
    vddosMaxMinutes: maxMinutosVDDoS || maxUploadVirusPadraoMin,
    downloadCenterIp: setupIps?.downloadCenter,
    vddosFile: arquivoVDDoS || null,
    folderUrl: urlPasta || "",
    completedCount: executorAnterior?.completedCount || 0,
    vddosInstalledCount: executorAnterior?.vddosInstalledCount || 0,
    vddosFailedCount: executorAnterior?.vddosFailedCount || 0,
    startedAt: Date.now(),
  };
  if (listaIpsManual.length > 0) {
    statusBase.ipQueue = listaIpsManual;
    statusBase.totalIpCount = listaIpsManual.length;
  }

  if (cacheReutilizavel) {
    statusBase.step = etapaAposResolverLinks;
    statusBase.virusOptionsResolved = cacheLinks.resolvedVirus;
    statusBase.vddosFileResolved = cacheLinks.resolvedVddos;
    registrarLog(`Infecção iniciada (reutilizando links em cache)${listaIpsManual.length > 0 ? `, total de ${listaIpsManual.length} IP(s) manual(is)` : ", obtenção automática de /hdb"}.`);
  } else {
    statusBase.step = "goto_link_resolve_ip";
    statusBase.virusOptionsResolved = [];
    statusBase.vddosFileResolved = null;
    registrarLog(`Infecção iniciada (resolvendo links primeiro)${listaIpsManual.length > 0 ? `, total de ${listaIpsManual.length} IP(s) manual(is)` : ""}.`);
  }

  await chrome.storage.local.set({ infection2Runner: statusBase });
  irParaAba(aba.id, "https://hackerwars.io/internet");
  renderizarStatusInfeccao();
});

document.getElementById("infection2StopBtn").addEventListener("click", async () => {
  const { infection2Runner: executor } = await chrome.storage.local.get("infection2Runner");
  if (!executor) return;
  await chrome.storage.local.set({ infection2Runner: { ...executor, running: false } });
  registrarLog("Módulo de infecção parado.");
  renderizarStatusInfeccao();
});

async function renderizarStatusPuzzle() {
  const { puzzleRunner: executor } = await chrome.storage.local.get("puzzleRunner");
  const elemento = document.getElementById("puzzleStatus");
  if (!executor) {
    elemento.textContent = "Parado";
    return;
  }
  const linhas = [];
  if (executor.running) {
    linhas.push(`Em execução: ${executor.step}`);
  } else if (executor.pausedReason) {
    linhas.push(`pausado: ${executor.pausedReason}`);
  } else if (executor.stuckAt) {
    linhas.push(`Travado em: ${executor.stuckAt}`);
  } else {
    linhas.push(`Parado (${executor.step || "Parado"})`);
  }
  if (executor.puzzleNumber) linhas.push(`Número: ${executor.puzzleNumber}`);
  if (executor.currentIp) linhas.push(`Alvo: ${executor.currentIp}`);
  linhas.push(`Resolvidos: ${executor.completedCount || 0}`);
  elemento.textContent = linhas.join("\n") + formatarHistorico(executor.history);
}

document.getElementById("puzzleStartBtn").addEventListener("click", async () => {
  const aba = await obterAbaAtual();
  const { puzzleRunner: executorAnterior } = await chrome.storage.local.get("puzzleRunner");
  const inputNumeroPuzzleInicial = document.getElementById("puzzleStartNumber").value.trim();
  const numeroPuzzleInicial = inputNumeroPuzzleInicial === "" ? 1 : Math.max(1, parseInt(inputNumeroPuzzleInicial, 10) || 1);
  const ipContinuacao = document.getElementById("puzzleResumeIp").value.trim();
  await chrome.storage.local.set({
    puzzleRunner: {
      running: true,
      tabId: aba.id,
      // Esta etapa atualiza a interface e preserva o comportamento da extensão.
      // Esta etapa atualiza a interface e preserva o comportamento da extensão.
      step: ipContinuacao ? "hack" : "find_first_puzzle",
      stuckAt: null,
      pausedReason: null,
      puzzleNumber: numeroPuzzleInicial,
      completedCount: executorAnterior?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  if (ipContinuacao) {
    irParaAba(aba.id, `https://hackerwars.io/internet?ip=${ipContinuacao}`);
  } else {
    recarregarAba(aba.id);
  }
  registrarLog(`Resolução de puzzles iniciada no número ${numeroPuzzleInicial}${ipContinuacao ? `, alvo ${ipContinuacao}` : ""}.`);
  renderizarStatusPuzzle();
});

document.getElementById("puzzleStopBtn").addEventListener("click", async () => {
  const { puzzleRunner: executor } = await chrome.storage.local.get("puzzleRunner");
  if (!executor) return;
  await chrome.storage.local.set({ puzzleRunner: { ...executor, running: false } });
  registrarLog("Resolução de puzzles parada.");
  renderizarStatusPuzzle();
});

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
document.getElementById("puzzleContinueBtn").addEventListener("click", async () => {
  const { puzzleRunner: executor } = await chrome.storage.local.get("puzzleRunner");
  if (!executor || executor.running || (!executor.pausedReason && !executor.stuckAt)) {
    registrarLog("A resolução de puzzles não está aguardando continuação.");
    return;
  }
  await chrome.storage.local.set({
    puzzleRunner: { ...executor, running: true, continueRequested: true, pausedReason: null, stuckAt: null },
  });
  recarregarAba(executor.tabId);
  registrarLog("Continuando a resolução de puzzles.");
  renderizarStatusPuzzle();
});

async function renderizarStatusMassHack() {
  const { massHackRunner: executor } = await chrome.storage.local.get("massHackRunner");
  const elemento = document.getElementById("massHackStatus");
  if (!executor) {
    elemento.textContent = "Parado";
    return;
  }
  const linhas = [];
  if (executor.running) {
    linhas.push(`Em execução: ${executor.step}`);
  } else if (executor.stuckAt) {
    linhas.push(`Travado em: ${executor.stuckAt}`);
  } else {
    linhas.push(`Parado (${executor.step || "Parado"})`);
  }
  if (executor.currentIp) linhas.push(`Alvo: ${executor.currentIp}`);
  if (executor.ipQueue) linhas.push(`Restantes: ${executor.ipQueue.length}/${executor.totalIpCount || 0}`);
  linhas.push(`Invadidos: ${executor.completedCount || 0}`);
  elemento.textContent = linhas.join("\n") + formatarHistorico(executor.history);
}

document.getElementById("massHackStartBtn").addEventListener("click", async () => {
  const listaIps = analisarListaIps(document.getElementById("massHackIpList").value);
  if (listaIps.length === 0) {
    registrarLog("Informe pelo menos um IP.");
    return;
  }
  const aba = await obterAbaAtual();
  const { massHackRunner: executorAnterior } = await chrome.storage.local.get("massHackRunner");
  await chrome.storage.local.set({
    massHackRunner: {
      running: true,
      tabId: aba.id,
      step: "goto_target",
      stuckAt: null,
      ipQueue: listaIps,
      totalIpCount: listaIps.length,
      completedCount: executorAnterior?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  irParaAba(aba.id, "https://hackerwars.io/internet");
  registrarLog(`Mass hack iniciado, total de ${listaIps.length} IP(s).`);
  renderizarStatusMassHack();
});

document.getElementById("massHackStopBtn").addEventListener("click", async () => {
  const { massHackRunner: executor } = await chrome.storage.local.get("massHackRunner");
  if (!executor) return;
  await chrome.storage.local.set({ massHackRunner: { ...executor, running: false } });
  registrarLog("Mass hack parado.");
  renderizarStatusMassHack();
});

chrome.storage.onChanged.addListener((mudancas, area) => {
  // Esta etapa atualiza a interface e preserva o comportamento da extensão.
  // Esta etapa atualiza a interface e preserva o comportamento da extensão.
  // Esta etapa atualiza a interface e preserva o comportamento da extensão.
  if (!chrome.runtime?.id) return;
  if (area !== "local") return;
  if (mudancas.collectRunner) renderizarStatusColeta();
  if (mudancas.repKillRunner) renderizarStatusLimpezaReputacao();
  if (mudancas.logMonitor) renderizarStatusMonitorLog();
  if (mudancas.bgLogMonitor) renderizarStatusMonitorLogFundo();
  if (mudancas.logWatcherRunner) renderizarStatusVigiaLog();
  if (mudancas.gatheredIps) {
    renderizarStatusColetaLog();
    renderizarStatusVigiaLog();
  }
  if (mudancas.missionRunner) renderizarStatusMissoes();
  if (mudancas.infection2Runner) renderizarStatusInfeccao();
  if (mudancas.researchRunner) renderizarStatusPesquisa();
  if (mudancas.puzzleRunner) renderizarStatusPuzzle();
  if (mudancas.massHackRunner) renderizarStatusMassHack();
  if (mudancas.softwareGather || mudancas.softwareGatherEntries) renderizarStatusColetor();
  if (mudancas.setupIps) {
    carregarIpsIniciais();
    carregarContaAutotransferencia();
  }
  if (todasChavesExecutores.some((chave) => mudancas[chave])) renderizarStatusScriptsEmExecucao();
});

renderizarStatusColeta();
renderizarStatusLimpezaReputacao();
renderizarStatusMonitorLog();
renderizarStatusMonitorLogFundo();
renderizarStatusVigiaLog();
renderizarStatusColetaLog();
renderizarStatusColetor();
renderizarStatusMissoes();
renderizarStatusInfeccao();
carregarOpcoesInfeccao();
renderizarStatusPesquisa();
carregarConfiguracoesPesquisa();
renderizarStatusPuzzle();
renderizarStatusMassHack();
carregarFiltroTiposMissao();
carregarContaAutotransferencia();
carregarIntervaloColeta();
carregarIpsIniciais();
renderizarStatusScriptsEmExecucao();
}

// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
// Esta etapa atualiza a interface e preserva o comportamento da extensão.
if (document.getElementById("hwauto-card")) {
  inicializarInterfacePopup();
}
