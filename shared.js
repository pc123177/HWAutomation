// Utilitários compartilhados de DOM, temporização e armazenamento; carregados primeiro.

function obterIdDaAba() {
  return new Promise((concluir) => {
    chrome.runtime.sendMessage({ action: "getTabId" }, (resposta) => concluir(resposta?.tabId));
  });
}

// Interpreta o cronômetro da página "<div class="elapsed">0h:1m:38s</div>" (hack/instalação/upload).
function encontrarMsRestantesDoCronometro() {
  const elemento = document.querySelector(".elapsed");
  if (!elemento) return null;
  const match = elemento.textContent.trim().match(/(\d+)\s*h\s*:\s*(\d+)\s*m\s*:\s*(\d+)\s*s/i);
  if (!match) return null;
  const [, h, m, s] = match.map(Number);
  return ((h * 60 + m) * 60 + s) * 1000;
}

function esperarCondicao(funcaoBusca, timeoutMs, estado, pularVerificacaoCronometro) {
  return new Promise((concluir) => {
    const inicio = Date.now();
    let usouEsperaCronometro = false;
    (function poll() {
      const decorridoMs = Date.now() - inicio;
      if (decorridoMs >= timeoutMs) return concluir(null);

      // O cronômetro .elapsed costuma ser mais confiável que o DOM durante recargas, mas
      // pularVerificacaoCronometro atende etapas que precisam capturar algo imediatamente.
      if (!pularVerificacaoCronometro && !usouEsperaCronometro) {
        const cronometroMs = encontrarMsRestantesDoCronometro();
        if (cronometroMs != null) {
          usouEsperaCronometro = true;
          const atraso = Math.min(cronometroMs + 2000, timeoutMs - decorridoMs);
          console.log("[HWAuto] elapsed timer found, pausing", atraso, "ms before continuing");
          return setTimeout(poll, atraso);
        }
      }

      const resultado = funcaoBusca(estado);
      if (resultado) return concluir(resultado);

      setTimeout(poll, 400);
    })();
  });
}

function encontrarBotaoSubmitPorValor(valorAlvo) {
  for (const inputItem of document.querySelectorAll('input[type="submit"]')) {
    if (inputItem.value.trim().toLowerCase() === valorAlvo.toLowerCase()) return inputItem;
  }
  return null;
}

function definirValorDoCampo(elemento, valor) {
  elemento.value = valor;
  elemento.dispatchEvent(new Event("input", { bubbles: true }));
  elemento.dispatchEvent(new Event("change", { bubbles: true }));
}

// versaoArquivo pode ser omitida para corresponder apenas pelo nome, por exemplo, vDDoS configurado pelo usuário.
function encontrarLinkDaLinhaDoSoftware(nomeArquivo, versaoArquivo, trechoLink) {
  for (const linha of document.querySelectorAll("tr[id]")) {
    const celulas = linha.querySelectorAll("td");
    if (celulas.length < 3) continue;
    if (celulas[1].textContent.trim() === nomeArquivo && (versaoArquivo == null || celulas[2].textContent.trim() === versaoArquivo)) {
      return linha.querySelector(`a[href*="${trechoLink}"]`);
    }
  }
  return null;
}

function encontrarLinhaDoSoftware(nomeArquivo, versaoArquivo) {
  for (const linha of document.querySelectorAll("tr[id]")) {
    const celulas = linha.querySelectorAll("td");
    if (celulas.length < 3) continue;
    if (celulas[1].textContent.trim() === nomeArquivo && (versaoArquivo == null || celulas[2].textContent.trim() === versaoArquivo)) return linha;
  }
  return null;
}

// O botão "Copy IPs" de /hdb só grava na área de transferência do sistema, inacessível ao content
// script; os IPs já estão na tabela, então são coletados diretamente dela.
function encontrarListaDeIpsDoHDB() {
  const conjuntoIps = new Set();
  for (const link of document.querySelectorAll('a[href*="ip="]')) {
    const endereco = new URL(link.href, location.href).searchParams.get("ip");
    if (endereco) conjuntoIps.add(endereco);
  }
  if (conjuntoIps.size === 0) {
    const regexIp = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
    let match;
    while ((match = regexIp.exec(document.body.innerText))) conjuntoIps.add(match[0]);
  }
  return [...conjuntoIps];
}

// Interpreta o espaço livre na página de software; o valor verde representa espaço disponível. Retorna MB.
function encontrarEspacoLivreMB() {
  const container = [...document.querySelectorAll("span.small")].find(
    (elemento) => elemento.querySelector("span.green") && elemento.querySelector("span.red")
  );
  if (!container) return null;
  const match = container.querySelector("span.green").textContent.trim().match(/([\d.]+)\s*(GB|MB)/i);
  if (!match) return null;
  const valorNumerico = parseFloat(match[1]);
  return match[2].toUpperCase() === "GB" ? valorNumerico * 1024 : valorNumerico;
}

// Interpreta a velocidade de upload no segundo valor MB/s; ela é metade da velocidade de download.
function encontrarVelocidadeUploadMBps() {
  for (const elemento of document.querySelectorAll("span.small")) {
    const textoNegrito = elemento.querySelector("strong");
    if (!textoNegrito || !/Mbit/i.test(textoNegrito.textContent)) continue;
    const match = elemento.textContent.match(/([\d.]+)\s*MB\/s\s*-\s*([\d.]+)\s*MB\/s/i);
    if (match) return parseFloat(match[2]);
  }
  return null;
}

function encontrarErroVirusDuplicado() {
  return encontrarAlertaDeErroComTexto("You already have installed a virus of this type");
}

function encontrarErroSemEspacoEmDisco() {
  return encontrarAlertaDeErroComTexto("You do not have enough disk space");
}

// A frase exata varia; qualquer ocorrência independente de "ram" em alert-danger é aceita,
// sem distinguir maiúsculas/minúsculas.
function encontrarErroMemoriaInsuficiente() {
  for (const elemento of document.querySelectorAll(".alert-danger")) {
    if (/\bram\b/i.test(elemento.textContent)) return elemento;
  }
  return null;
}

function encontrarAlertaDeErroComTexto(texto) {
  for (const elemento of document.querySelectorAll(".alert-danger")) {
    if (elemento.textContent.includes(texto)) return elemento;
  }
  return null;
}

// Registra o texto visível de .alert-danger quando uma etapa trava, como "not enough money",
// permitindo identificar a causa sem executar novamente.
function encontrarTextoDeQualquerErro() {
  const elemento = document.querySelector(".alert-danger");
  return elemento ? elemento.textContent.trim() : null;
}

// Também registra o texto .elapsed, distinguindo a ausência do elemento de um formato de tempo inválido.
function encontrarTextoDeQualquerCronometro() {
  const elemento = document.querySelector(".elapsed");
  return elemento ? elemento.textContent.trim() : null;
}

// Select2 v3 mantém o <select> real no DOM, embora oculto. O id de .select2-container começa
// com "s2id_", permitindo operar o elemento real sem tocar no componente visual.
function encontrarSelect2DaConta(conta) {
  // Prioriza componentes visíveis para evitar instâncias ocultas residuais.
  const listaContainers = [...document.querySelectorAll(".select2-container")].sort(
    (a, b) => (b.offsetParent !== null) - (a.offsetParent !== null)
  );
  for (const container of listaContainers) {
    if (!container.id) continue;
    const select = document.getElementById(container.id.replace(/^s2id_/, ""));
    if (!select) continue;
    const temMatch = [...select.options].some((opcao) => opcao.value === conta || opcao.textContent.includes(conta));
    if (temMatch) return select;
  }
  return null;
}

function definirValorDoSelect2(select, valor) {
  const opcao = [...select.options].find((item) => item.value === valor || item.textContent.includes(valor));
  if (!opcao) return false;
  select.value = opcao.value;
  // Select2 atualiza ao ouvir change no select subjacente; usa trigger do jQuery quando disponível,
  // caso contrário despacha um evento change comum.
  if (window.jQuery) {
    window.jQuery(select).trigger("change");
  } else {
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
  return true;
}

function adicionarHistorico(executor, entrada) {
  const historico = [{ ...entrada, at: Date.now() }, ...(executor.history || [])].slice(0, 15);
  return historico;
}

function pausar(ms) {
  return new Promise((concluir) => setTimeout(concluir, ms));
}

// Uma execução anterior pode deixar um processo de edição de log travado que consome o próximo
// envio; cancele-o antes de enviar outro.
async function cancelarProcessosAntigosDeEdicaoDeLog() {
  try {
    const resposta = await fetch("/processes");
    const html = await resposta.text();
    const documento = new DOMParser().parseFromString(html, "text/html");
    const idsProcessos = [];
    for (const item of documento.querySelectorAll("li")) {
      if (!/Edit log/i.test(item.textContent)) continue;
      const matchItem = item.innerHTML.match(/processBlock(\d+)/);
      if (matchItem) idsProcessos.push(matchItem[1]);
    }
    for (const idProcesso of idsProcessos) {
      await fetch(`/processes?pid=${idProcesso}&del=1`);
    }
    if (idsProcessos.length > 0) console.log("[HWAuto] canceled", idsProcessos.length, "stale log-edit process(es)");
  } catch (erro) {
    console.log("[HWAuto] cancelStaleLogEditProcesses failed", erro);
  }
}

// Remove apenas linhas com o IP próprio; preservar o restante é menos chamativo que limpar tudo.
function removerLinhaComIpProprio(texto, ipProprio) {
  if (!ipProprio) return "";
  return texto
    .split(/\r?\n/)
    .filter((linha) => !linha.includes(ipProprio))
    .join("\n");
}

// Dá tempo para a página/painel AJAX recém-carregado inicializar antes de consultar o DOM.
const atrasoEstabilizacaoEtapaMs = 1000;

// Abaixo deste limite, repete com setTimeout; acima, usa chrome.alarms pois timers longos em
// abas em segundo plano são pouco confiáveis.
const limiteAlarmeTentativaMs = 60000;

// Motor compartilhado dos executores de etapas. `tabelaEtapas[etapa].resolve` retorna
// { next, patch, complete, stop }; `onNotFound` retorna uma instrução de repetição/pausa.
async function executarMotorDeEtapas(chaveStorage, tabelaEtapas) {
  // Após recarregar/atualizar a extensão, o contexto do content script é invalidado e
  // chrome.runtime.id vira undefined. Saímos silenciosamente e aguardamos a aba recarregar.
  if (!chrome.runtime?.id) return;

  const { [chaveStorage]: executor } = await chrome.storage.local.get(chaveStorage);
  if (!executor || !executor.running) return;

  const idAba = await obterIdDaAba();
  if (idAba == null || executor.tabId !== idAba) return;

  const definicaoEtapa = tabelaEtapas[executor.step];
  if (!definicaoEtapa) return;

  await pausar(atrasoEstabilizacaoEtapaMs);

  // Verifica novamente após o atraso de estabilização; página ou estado podem ter mudado.
  const { [chaveStorage]: executorAtual } = await chrome.storage.local.get(chaveStorage);
  if (!executorAtual || !executorAtual.running || executorAtual.tabId !== idAba || executorAtual.step !== executor.step) return;

  console.log(`[HWAuto] ${chaveStorage}: step`, executor.step, "on", location.href);
  // timeout pode ser um número ou (estado) => número, para etapas cujo orçamento depende da configuração.
  const timeoutMs = typeof definicaoEtapa.timeout === "function" ? definicaoEtapa.timeout(executor) : definicaoEtapa.timeout;
  const resultadoEncontrado = await esperarCondicao(definicaoEtapa.find, timeoutMs, executor, definicaoEtapa.skipElapsedGate);
  if (!resultadoEncontrado) {
    const instrucaoRepeticao = definicaoEtapa.onNotFound?.(executor);
    if (instrucaoRepeticao) {
      // Pausa intencional, por exemplo aguardando o usuário: não marca stuckAt nem recarrega; o pop-up
      // reativa running.
      if (instrucaoRepeticao.pause) {
        console.log(`[HWAuto] ${chaveStorage}: pausing -`, instrucaoRepeticao.reason);
        await chrome.storage.local.set({
          [chaveStorage]: {
            ...executor,
            ...(instrucaoRepeticao.patch || {}),
            running: false,
            stuckAt: null,
            pausedReason: instrucaoRepeticao.reason,
            lastAction: Date.now(),
            history: adicionarHistorico(executor, { msg: `${executor.step}: paused - ${instrucaoRepeticao.reason}`, url: location.href }),
          },
        });
        return;
      }

      console.log(`[HWAuto] ${chaveStorage}:`, instrucaoRepeticao.reason, "- retrying in", instrucaoRepeticao.retryDelayMs, "ms");
      const proximaEtapa = instrucaoRepeticao.next || executor.step;
      await chrome.storage.local.set({
        [chaveStorage]: {
          ...executor,
          ...(instrucaoRepeticao.patch || {}),
          step: proximaEtapa,
          lastAction: Date.now(),
          history: adicionarHistorico(executor, { msg: `${executor.step}: ${instrucaoRepeticao.reason}`, url: location.href }),
        },
      });
      if (instrucaoRepeticao.retryDelayMs < limiteAlarmeTentativaMs) {
        setTimeout(async () => {
          const { [chaveStorage]: executorMaisRecente } = await chrome.storage.local.get(chaveStorage);
          if (executorMaisRecente && executorMaisRecente.running && executorMaisRecente.tabId === idAba && executorMaisRecente.step === proximaEtapa) {
            if (instrucaoRepeticao.href) {
              location.href = instrucaoRepeticao.href;
            } else {
              location.reload();
            }
          }
        }, instrucaoRepeticao.retryDelayMs);
      } else {
        chrome.runtime.sendMessage({
          action: "scheduleReload",
          payload: { tabId: idAba, storageKey: chaveStorage, step: proximaEtapa, href: instrucaoRepeticao.href || null, delayMs: instrucaoRepeticao.retryDelayMs },
        });
      }
      return;
    }

    console.log(`[HWAuto] ${chaveStorage}: stuck at`, executor.step, "on", location.href);
    const textoErroPagina = encontrarTextoDeQualquerErro();
    const textoCronometroPagina = encontrarTextoDeQualquerCronometro();
    const detalhesTravamento = [textoErroPagina && `page shows: "${textoErroPagina}"`, textoCronometroPagina && `.elapsed on page reads: "${textoCronometroPagina}"`]
      .filter(Boolean)
      .join(", ");
    await chrome.storage.local.set({
      [chaveStorage]: {
        ...executor,
        running: false,
        stuckAt: executor.step,
        lastAction: Date.now(),
        history: adicionarHistorico(executor, {
          msg: detalhesTravamento ? `stuck: no element found for "${executor.step}" (${detalhesTravamento})` : `stuck: no element found for "${executor.step}"`,
          url: location.href,
        }),
      },
    });
    return;
  }

  const resultadoProcessamento = definicaoEtapa.resolve(resultadoEncontrado, executor) || {};
  const patch = resultadoProcessamento.patch || {};
  const concluiu = !!resultadoProcessamento.complete;
  const parou = !!resultadoProcessamento.stop;
  // note acrescenta informações ao histórico, por exemplo o texto .elapsed de research.js.
  const mensagemHistorico = `${executor.step}: found + clicked -> ${resultadoProcessamento.next}${concluiu ? " (complete)" : ""}${resultadoProcessamento.note ? ` — ${resultadoProcessamento.note}` : ""}`;

  const executorAtualizado = {
    ...executor,
    ...patch,
    step: resultadoProcessamento.next,
    stuckAt: null,
    pausedReason: null,
    running: !parou,
    lastAction: Date.now(),
    completedCount: concluiu ? (executor.completedCount || 0) + 1 : executor.completedCount || 0,
    history: adicionarHistorico(executor, { msg: mensagemHistorico, url: location.href }),
  };

  // Persiste o estado antes do clique/navegação, impedindo que uma navegação rápida vença a gravação.
  await chrome.storage.local.set({ [chaveStorage]: executorAtualizado });

  await definicaoEtapa.perform(resultadoEncontrado, executorAtualizado);

  if (parou) {
    console.log(`[HWAuto] ${chaveStorage}: finished, stopping`);
    return;
  }

  // Não use await: se perform() navegar, esta chamada é interrompida e main() continua na nova página.
  executarMotorDeEtapas(chaveStorage, tabelaEtapas);
}
