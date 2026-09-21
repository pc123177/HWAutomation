// Ponto de entrada: inicia cada executor quando a página carrega. A lógica está em
// shared.js/logs.js/missions.js/infection2.js/research.js/puzzle.js/masshack.js etc.
(async function main() {
  try {
    // Colete primeiro para que "limpar e enviar" do monitor não apague os IPs antes da leitura.
    await coletarIpsDoLog();
    await coletarCatalogoDeSoftwares();
    await processarMonitorLog();
    await processarMonitoramentoLogRapido();
    await executarMotorDeEtapas("missionRunner", MISSION_STEPS);
    await executarMotorDeEtapas("infection2Runner", INFECTION2_STEPS);
    await executarMotorDeEtapas("researchRunner", RESEARCH_STEPS);
    await executarMotorDeEtapas("puzzleRunner", PUZZLE_STEPS);
    await executarMotorDeEtapas("massHackRunner", MASSHACK_STEPS);
    await executarMotorDeEtapas("collectRunner", COLLECT_STEPS);
    await executarMotorDeEtapas("repKillRunner", REP_KILL_STEPS);
  } catch (erro) {
    // Após recarregar/atualizar a extensão, o contexto do content script é invalidado.
    // Aguarde a própria aba recarregar; aqui saímos silenciosamente.
    if (!/Extension context invalidated/i.test(erro?.message || "")) throw erro;
  }
})();
