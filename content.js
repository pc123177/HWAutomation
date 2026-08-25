// 入口文件：页面加载时启动每个运行器。具体逻辑在先加载的
// shared.js/logs.js/missions.js/infection2.js/research.js/puzzle.js/masshack.js 等文件里。
(async function 主流程() {
  try {
    // 先收集，这样日志监控的"清空并提交"不会在我们读到IP之前就把它们清掉。
    await 收集日志IP();
    await 收集软件清单();
    await 处理日志监控();
    await 处理日志监视();
    await 运行步骤引擎("missionRunner", MISSION_STEPS);
    await 运行步骤引擎("infection2Runner", INFECTION2_STEPS);
    await 运行步骤引擎("researchRunner", RESEARCH_STEPS);
    await 运行步骤引擎("puzzleRunner", PUZZLE_STEPS);
    await 运行步骤引擎("massHackRunner", MASSHACK_STEPS);
    await 运行步骤引擎("collectRunner", COLLECT_STEPS);
    await 运行步骤引擎("repKillRunner", REP_KILL_STEPS);
  } catch (错误) {
    // 扩展被重新加载/更新后，这个标签页的内容脚本上下文会失效——除了等标签页自己刷新，
    // 也没别的办法恢复，所以这里安静跳过，而不是抛一个没人接住的异常。
    if (!/Extension context invalidated/i.test(错误?.message || "")) throw 错误;
  }
})();
