// /university?id=...：把 cycles 设成配置值，勾选"delete"，提交。按钮价格每次都会变，所以是
// 靠稳定的 #research-price-btn 这个 span 找到它，而不是靠按钮上的文字。
function 查找研究表单() {
  const 周期下拉框 = document.querySelector("select#cycles");
  const 删除复选框 = document.querySelector('input[type="checkbox"][name="delete"]');
  const 提交按钮 = document.querySelector("#research-price-btn")?.closest("button[type='submit']");
  return 周期下拉框 && 删除复选框 && 提交按钮 ? { cyclesSelect: 周期下拉框, deleteCheckbox: 删除复选框, submitBtn: 提交按钮 } : null;
}

// 跑了几个小时的周期有时会被服务端登出，落到只有这一个按钮的 /index 页。凭据是浏览器保存
// 的，光点这个按钮就能重新认证。
function 查找登录提交按钮() {
  return document.querySelector("#login-submit");
}

// 有些研究提交会同步直接完成——根本不会出现 .elapsed 倒计时，只在提交后弹出这条横幅。
// await_elapsed_start 原本只认得"login"或"elapsed"这两种情况，导致它会卡住，一直轮询一个
// 永远不会出现的倒计时。
function 查找研究成功提示() {
  for (const 元素 of document.querySelectorAll(".alert-success")) {
    if (/researched/i.test(元素.textContent)) return 元素;
  }
  return null;
}

function 随机区间取值(最小毫秒, 最大毫秒) {
  return 最小毫秒 + Math.random() * (最大毫秒 - 最小毫秒);
}

// 每隔5-10分钟换一个页面逛逛，这样一个跑好几个小时的周期看起来不会像挂机不动，直到快到
// 点了才蹲守 /processes 等真正完成。
const 研究浏览页面列表 = [
  "https://hackerwars.io/finances",
  "https://hackerwars.io/internet",
  "https://hackerwars.io/software",
  "https://hackerwars.io/log",
  "https://hackerwars.io/hardware",
  "https://hackerwars.io/hdb",
  "https://hackerwars.io/missions",
  "https://hackerwars.io/utilities",
  "https://hackerwars.io/clan",
  "https://hackerwars.io/ranking",
  "https://hackerwars.io/fame",
];
const 研究提前进入进程页毫秒 = 2 * 60 * 1000;
const 研究浏览最短毫秒 = 5 * 60 * 1000;
const 研究浏览最长毫秒 = 10 * 60 * 1000;

// 专门限定在研究这一条记录上（它的 .proc-desc 里会提到"research"）。旧版本是随便匹配
// /processes 页面上任意一个"Complete"链接：结果点到了一个完全无关、早就跑完的进程（残留
// 的病毒/安装之类），运行状态误以为研究已经完成，其实倒计时还没走完——因为那个残留进程
// 自己没有 .elapsed，倒计时检测根本拦不住它，find() 立刻命中、抓错了链接。这就是之前
// "明明完成了研究却没有重新开始"的真正原因：submit_research 之后卡在原地，一直等一个
// 根本不可能出现的表单，而页面其实还在倒计时中途。
function 查找完成进程链接() {
  for (const 项 of document.querySelectorAll("li")) {
    const 描述 = 项.querySelector(".proc-desc");
    if (!描述 || !/research/i.test(描述.textContent)) continue;
    for (const 链接 of 项.querySelectorAll('a[href*="pid="]')) {
      if (链接.textContent.trim().toLowerCase() === "complete") return 链接;
    }
  }
  return null;
}

// 把 university.php 上 Select2 在每个选项名称后面加的 "(版本号)" 去掉（例如
// "BBHMM.vcol                                (14.1)"），只留名称，这样输入搜索时只会匹配到
// 名称本身——不会匹配到版本号，也不会匹配到"名称里恰好包含这段文字"的更长条目。
function 研究选项名称(文字) {
  return 文字.trim().replace(/\s*\([^)]*\)\s*$/, "").trim();
}

// Select2 v3 始终会把真正的 <select> 留在 DOM 里（只是隐藏）——和 shared.js 的
// 查找账号对应的Select2下拉框 用来找 BTC/银行选择器是同一个技巧——这样就能直接找到并选中
// 目标选项，不用打开下拉框，也不用往搜索框里打字。
function 查找研究选项(名称) {
  const 目标 = (名称 || "").trim().toLowerCase();
  if (!目标) return null;
  for (const 容器 of document.querySelectorAll(".select2-container")) {
    if (!容器.id) continue;
    const 下拉框 = document.getElementById(容器.id.replace(/^s2id_/, ""));
    if (!下拉框) continue;
    const 选项 = [...下拉框.options].find((项) => 研究选项名称(项.textContent).toLowerCase() === 目标);
    if (选项) return { select: 下拉框, option: 选项 };
  }
  return null;
}

// 设置 .value 再派发 change 事件，就是真正手动操作 Select2 选中时底层发生的事——页面自己的
// onchange 处理器会据此跳转到对应软件的研究页面。
function 选择研究选项({ select, option }) {
  select.value = option.value;
  if (window.jQuery) window.jQuery(select).trigger("change");
  else select.dispatchEvent(new Event("change", { bubbles: true }));
}

// 两条完成路径共用——await_elapsed_start 遇到的那种没有任何倒计时、直接弹出"Software
// researched"提示的情况，和 wait_for_complete 正常蹲守 /processes 的情况，循环计数的记账
// 方式是一样的。loopsThisRun 是本次运行专用的计数器，popup.js 每次点 Start 都会清零——和
// completedCount（由 runStepEngine 自己累加，是跨越多次 Start、只用于展示的终身统计）是分开
// 的两回事。如果用 completedCount 来判断，只要终身次数已经超过这次设的循环上限，第二次
// Start 就会立刻停下。researchDone 会被 wait_clear_own_log 读取，用来在本轮的收款/清日志走完
// 之后决定是就此停下还是再来一轮——日志每一轮都会清，包括最后一轮。
function 研究循环完成结果(state) {
  const 本次已完成轮数 = (state.loopsThisRun || 0) + 1;
  return {
    next: state.researchCollectMoney ? "goto_collect" : "goto_own_log",
    complete: true,
    patch: { loopsThisRun: 本次已完成轮数, researchDone: 本次已完成轮数 >= (state.researchLoopCount || 1) },
  };
}

// 每次都是从 university.php 的选择器重新开始定位（条目自己的 /university?id=... 链接每次运行
// 不保证一样）——按名称搜索，让站点自己的 onchange 跳转到匹配的条目，然后 submit_research
// 把落地的那个 URL 记下来，这样后面几轮 goto_university 就能直接回到那里，不用重新搜索。
const RESEARCH_STEPS = {
  goto_university_list: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "pick_software" }),
    perform: () => {
      location.href = "https://hackerwars.io/university.php";
    },
  },
  pick_software: {
    timeout: 15000,
    skipElapsedGate: true,
    find: (state) => 查找研究选项(state.researchSoftwareName),
    resolve: () => ({ next: "submit_research" }),
    perform: (找到结果) => 选择研究选项(找到结果),
    onNotFound: () => ({
      pause: true,
      reason: "couldn't find that software in the university.php list — check the name/extension and hit Start again",
    }),
  },
  // pick_software 自动跳转之后会直接走到这一步，之后每一轮 goto_university 循环回来时也会
  // 经过这里——不管哪种情况，universityUrl 都会在这里（重新）记录下来，始终对应这一步实际
  // 找到表单的那个页面。
  goto_university: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "submit_research" }),
    perform: (body, state) => {
      if (location.href !== state.universityUrl) location.href = state.universityUrl;
    },
  },
  submit_research: {
    timeout: 15000,
    find: () => {
      const 登录按钮 = 查找登录提交按钮();
      if (登录按钮) return { kind: "login", el: 登录按钮 };
      const 表单 = 查找研究表单();
      return 表单 ? { kind: "research", form: 表单 } : null;
    },
    resolve: (found) => ({
      next: found.kind === "login" ? "goto_university" : "await_elapsed_start",
      patch: found.kind === "research" ? { universityUrl: location.href } : {},
    }),
    perform: (found, state) => {
      if (found.kind === "login") {
        found.el.click();
        return;
      }
      const { cyclesSelect, deleteCheckbox, submitBtn } = found.form;
      设置输入框值(cyclesSelect, String(state.researchCycles || 1));
      const 想要删除 = !!state.researchDeleteOldVersion;
      if (deleteCheckbox.checked !== 想要删除) {
        deleteCheckbox.checked = 想要删除;
        deleteCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
      submitBtn.click();
    },
  },
  // 确认倒计时确实出现了，记下截止时间，然后开始到处逛而不是死盯着它。success-alert 这条分支
  // 是给那种完全没有倒计时就直接完成的提交兜底的——大多数提交这里都会有真正的倒计时
  // （findElapsedWaitMs 能读到），所以这不是常见情况。
  await_elapsed_start: {
    timeout: 15000,
    find: () => {
      const 登录按钮 = 查找登录提交按钮();
      if (登录按钮) return { kind: "login", el: 登录按钮 };
      if (查找研究成功提示()) return { kind: "success" };
      const 剩余毫秒 = findElapsedWaitMs();
      // 连同解析出的毫秒数一起把原始文字也记下来，这样下面的历史记录条目能显示页面上到底
      // 读到了什么——用来确认倒计时检测在实际运行中确实生效。
      return 剩余毫秒 != null ? { kind: "elapsed", waitMs: 剩余毫秒, raw: document.querySelector(".elapsed")?.textContent.trim() } : null;
    },
    resolve: (found, state) => {
      if (found.kind === "login") return { next: "goto_university" };
      if (found.kind === "success") return 研究循环完成结果(state);
      return { next: "browse", patch: { researchDeadline: Date.now() + found.waitMs }, note: `elapsed timer read: ${found.raw}` };
    },
    perform: (found) => {
      if (found.kind === "login") found.el.click();
    },
  },
  // find() 故意永远返回 null——真正的5-10分钟等待完全是靠 onNotFound 的 retryDelayMs 实现
  // 的（远超过 重试闹钟阈值毫秒），会走 chrome.alarms（background.js），而不是页面内的
  // setTimeout。这里以前是在 perform() 里直接 `await 休眠(5-10分钟)`，正好是
  // 重试闹钟阈值毫秒 自己注释里提醒过的那种不可靠写法——放在后台的标签页里，这么长的计时器
  // 可能被节流或卡住，而这正是实际发生过的问题（browse 一整晚都没往下推进）。其他模块里类似
  // 的长时间等待也遇到过同样的坑，用的是同一种修法。
  browse: {
    timeout: 1000,
    skipElapsedGate: true,
    find: () => null,
    resolve: () => ({}),
    perform: () => {},
    onNotFound: (state) => {
      const 剩余毫秒 = state.researchDeadline - Date.now();
      if (剩余毫秒 <= 研究提前进入进程页毫秒) {
        return { retryDelayMs: 0, next: "goto_processes", reason: "close enough to the deadline, heading to /processes" };
      }
      const 页面 = 研究浏览页面列表[Math.floor(Math.random() * 研究浏览页面列表.length)];
      const 等待时长 = Math.max(Math.min(随机区间取值(研究浏览最短毫秒, 研究浏览最长毫秒), 剩余毫秒 - 研究提前进入进程页毫秒), 0);
      return { retryDelayMs: 等待时长, next: "browse", href: 页面, reason: `browsing to ${页面} to look active` };
    },
  },
  goto_processes: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "wait_for_complete" }),
    perform: () => {
      location.href = "https://hackerwars.io/processes";
    },
  },
  wait_for_complete: {
    timeout: 20 * 60 * 1000, // 2分钟的提前量只是缓冲，不是保证——多给点空间让它能跑久一些
    find: () => {
      const 登录按钮 = 查找登录提交按钮();
      if (登录按钮) return { kind: "login", el: 登录按钮 };
      const 链接 = 查找完成进程链接();
      return 链接 ? { kind: "complete", el: 链接 } : null;
    },
    resolve: (found, state) => (found.kind === "login" ? { next: "goto_processes" } : 研究循环完成结果(state)),
    perform: async (found) => {
      found.el.click();
      if (found.kind === "complete") await 休眠(2000);
    },
  },
  // 可选项（researchCollectMoney，弹窗上的 $ 开关）——在清日志之前先收一次挂机收入，这样下一轮
  // 的升级不会因为钱还没收就卡住。
  goto_collect: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "click_collect" }),
    perform: () => {
      location.href = "https://hackerwars.io/list.php?action=collect";
    },
  },
  click_collect: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => 按值查找提交按钮("Collect my money!"),
    resolve: () => ({ next: "goto_own_log" }),
    perform: (元素) => 元素.click(),
    onNotFound: () => ({ retryDelayMs: 0, reason: "nothing to collect, continuing", next: "goto_own_log" }),
  },
  // 每一轮都清空自己的 /log（不只是中间轮次）——不然上面的收款操作（以及每次研究提交）都会
  // 明晃晃地留在日志里，谁入侵了这个账号都能看到。
  goto_own_log: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "clear_own_log" }),
    perform: () => {
      location.href = "https://hackerwars.io/log";
    },
  },
  clear_own_log: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => {
      const 文本框 = 获取日志文本框();
      const 按钮 = 获取编辑日志按钮();
      return 文本框 && 按钮 ? { textarea: 文本框, button: 按钮 } : null;
    },
    resolve: () => ({ next: "wait_clear_own_log" }),
    perform: async ({ textarea, button }) => {
      await 取消陈旧日志编辑进程();
      textarea.value = "";
      button.click();
    },
    // 日志本来就是空的也是合理结果——直接走到 wait_clear_own_log 本该走到的那个
    // 停止/继续分支，而不是一个实际上永远不会跑到的步骤名。
    onNotFound: (state) => ({
      retryDelayMs: 0,
      reason: "no log form found (already empty?), continuing",
      next: state.researchDone ? "loops_complete" : "goto_university",
    }),
  },
  wait_clear_own_log: {
    timeout: 30000,
    find: () => (document.querySelector(".elapsed") ? null : true),
    resolve: (found, state) => ({ next: state.researchDone ? "loops_complete" : "goto_university", stop: !!state.researchDone }),
    perform: () => {},
  },
  loops_complete: {
    timeout: 5000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "loops_complete", stop: true }),
    perform: () => {},
  },
};
