// encontrarListaDeIpsDoHDB、cancelarProcessosAntigosDeEdicaoDeLog、obterTextareaDoLog、obterBotaoEditarLog、obterIpProprio、

function i2ResolverLinksDaPagina(listaOpcoesVirus, arquivoVDDoS) {
  const listaVirusResolvidos = [];
  for (const opcao of listaOpcoesVirus) {
    const link = encontrarLinkDaLinhaDoSoftware(opcao.name, null, "cmd=up");
    if (link) listaVirusResolvidos.push({ ...opcao, uploadUrl: link.href });
  }
  let vDDoSResolvido = null;
  if (arquivoVDDoS) {
    const link = encontrarLinkDaLinhaDoSoftware(arquivoVDDoS.name, null, "cmd=up");
    if (link) vDDoSResolvido = { ...arquivoVDDoS, uploadUrl: link.href };
  }
  return { resolvedVirus: listaVirusResolvidos, resolvedVddos: vDDoSResolvido };
}

function i2MesclarListaVirusResolvidos(listaExistente, listaNova) {
  const indicePorNome = new Map(listaExistente.map((item) => [item.name, item]));
  for (const opcao of listaNova) {
    if (!indicePorNome.has(opcao.name)) indicePorNome.set(opcao.name, opcao);
  }
  return [...indicePorNome.values()];
}

const INFECTION2_STEPS = {
  goto_link_resolve_ip: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "link_resolve_login1" }),
    perform: (body, state) => {
      location.href = `https://hackerwars.io/internet?ip=${state.downloadCenterIp}`;
    },
  },
  link_resolve_login1: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.querySelector('a[href="?action=login"]'),
    resolve: () => ({ next: "link_resolve_login2" }),
    perform: (elemento) => elemento.click(),
  },
  link_resolve_login2: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => encontrarBotaoSubmitPorValor("Login"),
    resolve: () => ({ next: "link_resolve_software" }),
    perform: (elemento) => elemento.click(),
  },
  link_resolve_software: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "resolve_links_base" }),
    perform: () => {
      location.href = "https://hackerwars.io/software";
    },
  },
  resolve_links_base: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: (body, state) => {
      const { resolvedVirus, resolvedVddos } = i2ResolverLinksDaPagina(state.virusOptions, state.vddosFile);
      return {
        next: state.folderUrl ? "link_resolve_folder" : "check_links_resolved",
        patch: {
          virusOptionsResolved: i2MesclarListaVirusResolvidos(state.virusOptionsResolved || [], resolvedVirus),
          vddosFileResolved: state.vddosFileResolved || resolvedVddos,
        },
      };
    },
    perform: () => {},
  },
  link_resolve_folder: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "resolve_links_folder" }),
    perform: (body, state) => {
      location.href = state.folderUrl;
    },
  },
  resolve_links_folder: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: (body, state) => {
      const { resolvedVirus, resolvedVddos } = i2ResolverLinksDaPagina(state.virusOptions, state.vddosFile);
      return {
        next: "check_links_resolved",
        patch: {
          virusOptionsResolved: i2MesclarListaVirusResolvidos(state.virusOptionsResolved || [], resolvedVirus),
          vddosFileResolved: state.vddosFileResolved || resolvedVddos,
        },
      };
    },
    perform: () => {},
  },
  check_links_resolved: {
    timeout: 5000,
    skipElapsedGate: true,
    find: (state) => (state.virusOptionsResolved && state.virusOptionsResolved.length > 0 ? true : null),
    resolve: () => ({ next: "link_resolve_return" }),
    perform: async (found, state) => {
      const optionsKey = JSON.stringify({
        options: state.virusOptions || [],
        vddosFile: state.vddosFile || null,
        folderUrl: state.folderUrl || "",
      });
      await chrome.storage.local.set({
        infection2LinkCache: {
          optionsKey,
          resolvedVirus: state.virusOptionsResolved,
          resolvedVddos: state.vddosFileResolved,
        },
      });
    },
  },
  link_resolve_return: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "link_resolve_logout" }),
    perform: (body, state) => {
      location.href = `https://hackerwars.io/internet?ip=${state.downloadCenterIp}`;
    },
  },
  link_resolve_logout: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: (elemento, state) => ({ next: state.ipQueue && state.ipQueue.length > 0 ? "goto_target" : "goto_hdb" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?view=logout";
    },
  },
  goto_hdb: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "hdb_export" }),
    perform: () => {
      location.href = "https://hackerwars.io/hdb";
    },
  },
  hdb_export: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.querySelector("#hdb-export"),
    resolve: () => ({ next: "hdb_collect" }),
    perform: (elemento) => elemento.click(),
  },
  hdb_collect: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => {
      const listaIps = encontrarListaDeIpsDoHDB();
      return listaIps.length > 0 ? listaIps : null;
    },
    resolve: (listaIps) => ({ next: "goto_target", patch: { ipQueue: listaIps, totalIpCount: listaIps.length } }),
    perform: () => {},
  },
  goto_target: {
    timeout: 15000,
    skipElapsedGate: true,
    find: (state) => (state.ipQueue && state.ipQueue.length > 0 ? state.ipQueue[0] : "done"),
    resolve: (found, state) =>
      found === "done"
        ? { next: "goto_final_log" }
        : {
            next: "login1",
            patch: { currentIp: found, ipQueue: state.ipQueue.slice(1), excludedVirusSizes: [] },
          },
    perform: (found) => {
      if (found !== "done") location.href = `https://hackerwars.io/internet?ip=${found}`;
    },
  },
  login1: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.querySelector('a[href="?action=login"]'),
    resolve: () => ({ next: "login2" }),
    perform: (elemento) => elemento.click(),
  },
  login2: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => encontrarBotaoSubmitPorValor("Login"),
    resolve: () => ({ next: "goto_software" }),
    perform: (elemento) => elemento.click(),
  },
  goto_software: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.querySelector('a[href="?view=software"]'),
    resolve: () => ({ next: "check_space" }),
    perform: (elemento) => elemento.click(),
  },
  check_space: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => {
      const espacoLivreMB = encontrarEspacoLivreMB();
      return espacoLivreMB != null ? { freeMb: espacoLivreMB, uploadMBps: encontrarVelocidadeUploadMBps() } : null;
    },
    resolve: ({ freeMb, uploadMBps }, state) => {
      const maxSegundos = (state.vddosMaxMinutes || 5) * 60;
      const tamanhosExcluidos = new Set(state.excludedVirusSizes || []);
      const itemSelecionado = [...state.virusOptionsResolved]
        .filter((item) => !tamanhosExcluidos.has(item.sizeMb))
        .sort((a, b) => b.sizeMb - a.sizeMb)
        .find((item) => item.sizeMb <= freeMb && (uploadMBps == null || item.sizeMb / uploadMBps <= maxSegundos));
      return itemSelecionado
        ? { next: "upload_virus", patch: { virusChoice: itemSelecionado } }
        : { next: "goto_logs", patch: { targetSkip: true } };
    },
    perform: () => {},
  },
  upload_virus: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "click_install_virus" }),
    perform: (body, state) => {
      location.href = state.virusChoice.uploadUrl;
    },
  },
  click_install_virus: {
    timeout: 90000,
    skipElapsedGate: true,
    find: (state) => {
      if (encontrarErroSemEspacoEmDisco()) return { kind: "no_space" };
      if (encontrarErroMemoriaInsuficiente()) return { kind: "no_ram" };
      const link = encontrarLinkDaLinhaDoSoftware(state.virusChoice.name, state.virusChoice.version, "cmd=install");
      return link ? { kind: "install", el: link } : null;
    },
    resolve: (found, state) => {
      if (found.kind === "no_space") {
        return {
          next: "check_space",
          patch: { excludedVirusSizes: [...(state.excludedVirusSizes || []), state.virusChoice.sizeMb] },
        };
      }
      if (found.kind === "no_ram") return { next: "goto_logs", patch: { targetSkip: true } };
      return { next: "wait_virus_done" };
    },
    perform: (found) => {
      if (found.kind === "install") found.el.click();
    },
  },
  wait_virus_done: {
    timeout: 120000,
    skipElapsedGate: true,
    find: (state) => {
      if (encontrarErroVirusDuplicado()) return { kind: "duplicate" };
      if (encontrarErroMemoriaInsuficiente()) return { kind: "no_ram" };
      if (document.querySelector(".elapsed")) return null;
      const linha = encontrarLinhaDoSoftware(state.virusChoice.name, state.virusChoice.version);
      if (!linha) return null;
      return linha.classList.contains("installed") || linha.querySelector('a[href*="cmd=uninstall"]') ? { kind: "installed" } : null;
    },
    resolve: (found, state) => {
      if (found.kind !== "installed") {
        return { next: "goto_logs", patch: { targetSkip: true } };
      }
      const querVDDoS = !!state.vddosFileResolved;
      return { next: querVDDoS ? "check_vddos_space" : "goto_logs" };
    },
    perform: () => {},
  },
  check_vddos_space: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => {
      const espacoLivreMB = encontrarEspacoLivreMB();
      return espacoLivreMB != null ? { freeMb: espacoLivreMB, uploadMBps: encontrarVelocidadeUploadMBps() } : null;
    },
    resolve: ({ freeMb, uploadMBps }, state) => {
      const maxSegundos = (state.vddosMaxMinutes || 5) * 60;
      const { sizeMb } = state.vddosFileResolved;
      const cabe = sizeMb <= freeMb && (uploadMBps == null || sizeMb / uploadMBps <= maxSegundos);
      return cabe
        ? { next: "upload_vddos" }
        : { next: "goto_logs", patch: { vddosFailedCount: (state.vddosFailedCount || 0) + 1 } };
    },
    perform: () => {},
  },
  upload_vddos: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "click_install_vddos" }),
    perform: (body, state) => {
      location.href = state.vddosFileResolved.uploadUrl;
    },
  },
  click_install_vddos: {
    timeout: 90000,
    skipElapsedGate: true,
    find: (state) => {
      if (encontrarErroSemEspacoEmDisco()) return { kind: "no_space" };
      if (encontrarErroMemoriaInsuficiente()) return { kind: "no_ram" };
      const link = encontrarLinkDaLinhaDoSoftware(state.vddosFileResolved.name, state.vddosFileResolved.version, "cmd=install");
      return link ? { kind: "install", el: link } : null;
    },
    resolve: (found, state) => {
      if (found.kind === "no_space" || found.kind === "no_ram") {
        return { next: "goto_logs", patch: { vddosFailedCount: (state.vddosFailedCount || 0) + 1 } };
      }
      return { next: "wait_vddos_done" };
    },
    perform: (found) => {
      if (found.kind === "install") found.el.click();
    },
  },
  wait_vddos_done: {
    timeout: 120000,
    skipElapsedGate: true,
    find: (state) => {
      if (encontrarErroVirusDuplicado()) return { kind: "duplicate" };
      if (encontrarErroMemoriaInsuficiente()) return { kind: "no_ram" };
      if (document.querySelector(".elapsed")) return null;
      const linha = encontrarLinhaDoSoftware(state.vddosFileResolved.name, state.vddosFileResolved.version);
      if (!linha) return null;
      return linha.classList.contains("installed") || linha.querySelector('a[href*="cmd=uninstall"]') ? { kind: "installed" } : null;
    },
    resolve: (found, state) => ({
      next: "goto_logs",
      patch:
        found.kind === "installed"
          ? { vddosInstalledCount: (state.vddosInstalledCount || 0) + 1 }
          : { vddosFailedCount: (state.vddosFailedCount || 0) + 1 },
    }),
    perform: () => {},
  },
  goto_logs: {
    timeout: 15000,
    skipElapsedGate: true,
    find: (state) => (state.currentIp === state.downloadCenterIp ? true : document.querySelector('a[href="?view=logs"]')),
    resolve: (found, state) => (state.currentIp === state.downloadCenterIp ? { next: "logout" } : { next: "clear_logs" }),
    perform: (found) => {
      if (found !== true) found.click();
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
    resolve: () => ({ next: "logout" }),
    perform: () => {},
  },
  logout: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: (elemento, state) => ({ next: "goto_target", complete: !state.targetSkip }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?view=logout";
    },
  },
  goto_final_log: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "clear_final_log" }),
    perform: () => {
      location.href = "https://hackerwars.io/log";
    },
  },
  clear_final_log: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => {
      const textarea = obterTextareaDoLog();
      const botao = obterBotaoEditarLog();
      return textarea && botao ? { textarea: textarea, button: botao } : null;
    },
    resolve: () => ({ next: "wait_final_log_clear" }),
    perform: async ({ textarea, button }) => {
      await cancelarProcessosAntigosDeEdicaoDeLog();
      textarea.value = "";
      button.click();
    },
  },
  wait_final_log_clear: {
    timeout: 30000,
    find: () => (document.querySelector(".elapsed") ? null : true),
    resolve: () => ({ next: "done", stop: true }),
    perform: () => {},
  },
};
