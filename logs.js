// Varre IPs entre colchetes no log (por exemplo, "[1.2.3.4] logged in as root"), ignora o próprio
// IP e acumula os novos para exportação.
const regexIpEntreColchetes = /\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/g;

function obterIpProprio() {
  return document.querySelector(".header-ip-show")?.textContent.trim() || null;
}

function extrairIpsDoLog(texto) {
  const conjuntoIps = new Set();
  let matchItem;
  while ((matchItem = regexIpEntreColchetes.exec(texto))) conjuntoIps.add(matchItem[1]);
  return [...conjuntoIps];
}

async function coletarIpsDoLog() {
  const textarea = obterTextareaDoLog();
  if (!textarea || !textarea.value.trim()) return;

  const ipProprio = obterIpProprio();
  const ipsEncontrados = extrairIpsDoLog(textarea.value).filter((endereco) => endereco !== ipProprio);
  if (ipsEncontrados.length === 0) return;

  const { gatheredIps: ipsColetados = [] } = await chrome.storage.local.get("gatheredIps");
  const vistos = new Set(ipsColetados.map((item) => item.ip));
  let quantidadeNova = 0;
  for (const endereco of ipsEncontrados) {
    if (vistos.has(endereco)) continue;
    ipsColetados.push({ ip: endereco, firstSeen: Date.now(), source: location.href });
    vistos.add(endereco);
    quantidadeNova++;
  }
  if (quantidadeNova > 0) {
    await chrome.storage.local.set({ gatheredIps: ipsColetados });
    console.log("[HWAuto] gathered", quantidadeNova, "new ip(s) from log");
  }
}

// Observa /log: se houver conteúdo, limpa e envia "Edit log file" e verifica novamente em cerca
// de 30 segundos, confirmando running/tabId a cada vez.
const intervaloVerificacaoLogMs = 30000;

// Recarrega rapidamente a página em que foi iniciado, coletando IPs antes que o atacante entre
// e limpe o próprio log.
const minMonitoramentoLogMs = 1000;
const maxMonitoramentoLogMs = 3000;

function agendarProximoMonitoramentoLog(idAba) {
  const atraso = minMonitoramentoLogMs + Math.random() * (maxMonitoramentoLogMs - minMonitoramentoLogMs);
  setTimeout(async () => {
    const { logWatcherRunner: executor } = await chrome.storage.local.get("logWatcherRunner");
    if (executor && executor.running && executor.tabId === idAba) {
      location.reload();
    }
  }, atraso);
}

async function processarMonitoramentoLogRapido() {
  const idAba = await obterIdDaAba();
  if (idAba == null) return;

  const { logWatcherRunner: executor } = await chrome.storage.local.get("logWatcherRunner");
  if (!executor || !executor.running || executor.tabId !== idAba) return;

  await chrome.storage.local.set({ logWatcherRunner: { ...executor, lastCheck: Date.now() } });
  agendarProximoMonitoramentoLog(idAba);
}

function obterTextareaDoLog() {
  return document.querySelector('textarea[name="log"]');
}

function obterBotaoEditarLog() {
  return document.querySelector('input[type="submit"][value="Edit log file"]');
}

function agendarProximaVerificacaoLog(idAba) {
  setTimeout(async () => {
    const { logMonitor: executor } = await chrome.storage.local.get("logMonitor");
    if (executor && executor.running && executor.tabId === idAba) {
      location.reload();
    }
  }, intervaloVerificacaoLogMs);
}

async function processarMonitorLog() {
  if (!location.pathname.startsWith("/log")) return;

  const idAba = await obterIdDaAba();
  if (idAba == null) return;

  const { logMonitor: executor } = await chrome.storage.local.get("logMonitor");
  if (!executor || !executor.running || executor.tabId !== idAba) return;

  const textarea = obterTextareaDoLog();
  const temConteudo = !!textarea && textarea.value.trim().length > 0;
  const proximoEstado = { ...executor, lastCheck: Date.now() };

  if (temConteudo) {
    console.log("[HWAuto] log has content, clearing and submitting");
    await cancelarProcessosAntigosDeEdicaoDeLog();
    textarea.value = "";
    proximoEstado.clearedCount = (executor.clearedCount || 0) + 1;
    await chrome.storage.local.set({ logMonitor: proximoEstado });
    const botao = obterBotaoEditarLog();
    if (botao) {
      botao.click();
    } else {
      console.log("[HWAuto] edit log button not found");
    }
  } else {
    console.log("[HWAuto] log empty, nothing to do");
    await chrome.storage.local.set({ logMonitor: proximoEstado });
  }

  // Recarregamento de segurança caso o envio AJAX não navegue; se navegar, o timer é descartado.
  agendarProximaVerificacaoLog(idAba);
}
