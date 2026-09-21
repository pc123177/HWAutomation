// Enquanto ativo, o coletor obtém a lista de softwares do alvo assim que a conexão é estabelecida.
// Armazena por IP, atualiza visitas repetidas e exporta tudo em formato semelhante a CSV.

// O campo só aparece em uma página realmente conectada ao alvo; não existe na nossa página /software.
function encontrarIpConectado() {
  const input = document.querySelector('input.browser-bar[name="ip"]');
  return input ? input.value.trim() : null;
}

function temOpcaoDeDownload(linha) {
  return !!linha.querySelector(".he16-download");
}

// Mantém os mesmos índices de célula de shared.js: 0 ícone, 1 nome, 2 versão, 3 tamanho, 4 ações.
function coletarTabelaDeSoftwares() {
  const listaItens = [];
  for (const linha of document.querySelectorAll("table.table-software tbody tr[id]")) {
    if (!temOpcaoDeDownload(linha)) continue;
    const celulas = linha.querySelectorAll("td");
    if (celulas.length < 4) continue;
    const nome = celulas[1].textContent.trim();
    const versao = celulas[2].textContent.trim();
    const tamanho = celulas[3].textContent.trim();
    if (!nome) continue;
    listaItens.push({ name: nome, version: versao, size: tamanho });
  }
  return listaItens;
}

async function coletarCatalogoDeSoftwares() {
  const { softwareGather: configColeta } = await chrome.storage.local.get("softwareGather");
  if (!configColeta || !configColeta.running) return;

  const enderecoIp = encontrarIpConectado();
  if (!enderecoIp) return;

  const listaItens = coletarTabelaDeSoftwares();
  if (listaItens.length === 0) return;

  const { softwareGatherEntries: itensColetados = {} } = await chrome.storage.local.get("softwareGatherEntries");
  itensColetados[enderecoIp] = { items: listaItens, gatheredAt: Date.now() };
  await chrome.storage.local.set({ softwareGatherEntries: itensColetados });
  console.log("[HWAuto] gathered", listaItens.length, "software item(s) from", enderecoIp);
}
