// 端到端自动处理任务：接受、读取受害者/文件信息、入侵、操作、完成、循环。网站除了
// 接受/完成任务（JS/弹窗的 <span>）以外都是整页跳转——引擎在每次操作后总会尝试在当前页面
// 继续，真正的页面跳转会把这次尝试打断，交给新页面的 main() 从存好的步骤接着跑。

// 把任务列表链接的文字映射成后面用来分支的内部类型。摧毁服务器（Destroy Server）不在这里
// 处理——那是单独的、简单得多的 Rep Kill 模块（repkill.js）。
const 任务标题映射 = {
  "delete software": "delete",
  "steal software": "steal",
  "check bank status": "bank",
  "transfer money": "transfer",
};

const 任务类型优先级 = ["transfer", "bank", "steal", "delete"];

function 查找任务链接(已启用类型) {
  const 类型列表 = 已启用类型 && 已启用类型.length > 0 ? 已启用类型 : 任务类型优先级;
  const 链接列表 = [...document.querySelectorAll('a[href*="?id="]')];
  for (const 类型 of 任务类型优先级) {
    if (!类型列表.includes(类型)) continue;
    const 匹配 = 链接列表.find((链接) => 任务标题映射[链接.textContent.trim().toLowerCase()] === 类型);
    if (匹配) return { el: 匹配, missionType: 类型 };
  }
  return null;
}

function 查找任务不存在错误() {
  for (const 元素 of document.querySelectorAll(".alert-danger")) {
    if (元素.textContent.includes("This mission does not exist")) return 元素;
  }
  return null;
}

function 解析任务信息() {
  const 信息 = {};
  for (const 标签 of document.querySelectorAll("td .item")) {
    const 标签文字 = 标签.textContent.trim();
    const 值单元格 = 标签.closest("td")?.nextElementSibling;
    if (!值单元格) continue;
    if (标签文字 === "Victim") {
      const 链接 = 值单元格.querySelector('a[href*="ip="]');
      信息.victimIp = 链接 ? new URL(链接.href, location.href).searchParams.get("ip") : null;
    } else if (标签文字 === "File") {
      const 版本元素 = 值单元格.querySelector(".small");
      信息.fileVersion = 版本元素 ? 版本元素.textContent.trim() : "";
      const 克隆 = 值单元格.cloneNode(true);
      克隆.querySelector(".small")?.remove();
      信息.fileName = 克隆.textContent.trim();
    } else if (标签文字 === "Reward") {
      const 数字 = 值单元格.textContent.replace(/[^0-9]/g, "");
      信息.reward = 数字 ? Number(数字) : null;
    } else if (标签文字 === "Hirer") {
      const 链接 = 值单元格.querySelector('a[href*="ip="]');
      信息.hirerIp = 链接 ? new URL(链接.href, location.href).searchParams.get("ip") : null;
    } else if (标签文字 === "Bank Account") {
      const 克隆 = 值单元格.cloneNode(true);
      克隆.querySelector("a")?.remove();
      信息.bankAccount = 克隆.textContent.trim().replace(/^#/, "");
    } else if (标签文字 === "Account From") {
      const 链接 = 值单元格.querySelector('a[href*="ip="]');
      const 克隆 = 值单元格.cloneNode(true);
      克隆.querySelector("a")?.remove();
      信息.accountFrom = 克隆.textContent.trim().replace(/^#/, "");
      信息.accountFromIp = 链接 ? new URL(链接.href, location.href).searchParams.get("ip") : null;
    } else if (标签文字 === "Account To") {
      const 链接 = 值单元格.querySelector('a[href*="ip="]');
      const 克隆 = 值单元格.cloneNode(true);
      克隆.querySelector("a")?.remove();
      信息.accountTo = 克隆.textContent.trim().replace(/^#/, "");
      信息.accountToIp = 链接 ? new URL(链接.href, location.href).searchParams.get("ip") : null;
    }
  }
  return 信息;
}

function 查找银行破解链接() {
  return document.querySelector('a[href*="action=hack"][href*="type=bank"]');
}

function 查找银行账号表单() {
  const 输入框 = document.querySelector('input[name="acc"][placeholder="Account to hack"]');
  const 按钮 = 输入框?.closest("form")?.querySelector('button[type="submit"]');
  return 输入框 && 按钮 ? { input: 输入框, button: 按钮 } : null;
}

function 查找银行转账表单() {
  const 金额输入框 = document.querySelector("input#money");
  const 转账输入框 = document.querySelector('input[name="acc"][placeholder="Transfer to..."]');
  const IP输入框 = document.querySelector('input[name="ip"][placeholder="IP of the receiver account"]');
  const 按钮 = [...document.querySelectorAll('button[type="submit"]')].find(
    (按钮元素) => 按钮元素.textContent.trim().toLowerCase() === "transfer money"
  );
  return 金额输入框 && 转账输入框 && IP输入框 && 按钮
    ? { moneyInput: 金额输入框, transferInput: 转账输入框, ipInput: IP输入框, button: 按钮 }
    : null;
}

// 和全站导航的登出（?view=logout）不同——这是"已入侵银行账号"专用的登出链接
// （?bAction=logout），用来在入侵下一个账号之前先退出当前这个。
function 查找银行登出链接() {
  return document.querySelector('a[href*="bAction=logout"]');
}

function 查找软件重置剩余分钟() {
  const 匹配 = document.body.innerText.match(/Next software reset:?\s*(\d+)\s*minutes?/i);
  return 匹配 ? Number(匹配[1]) : null;
}

function 查找新任务刷新剩余分钟() {
  const 匹配 = document.body.innerText.match(/New missions will be generated in\s*(\d+)\s*minutes?/i);
  return 匹配 ? Number(匹配[1]) : null;
}

// "$" 完成徽章固定挂在 Missions 导航链接下面（每个页面都有）。
function 查找完成徽章() {
  const 任务链接 = document.querySelector('a[href="missions"]');
  if (!任务链接) return null;
  for (const 标签 of 任务链接.querySelectorAll(".label")) {
    if (标签.textContent.trim() === "$") return 标签;
  }
  return null;
}

function 查找购买比特币链接() {
  for (const 链接 of document.querySelectorAll("a")) {
    if (链接.querySelector(".he32-btc-buy")) return 链接;
    if (链接.textContent.replace(/\s+/g, " ").trim().toLowerCase().startsWith("buy bitcoins")) return 链接;
  }
  return null;
}

// `resolve` 只负责算出下一个状态，没有副作用；`perform` 负责真正的点击/跳转。
// runStepEngine 会在调用 perform() 之前先把算好的状态写入存储，这样一次很快的页面跳转
// 就不会抢在写入前面发生，导致刷新后又把同一个旧步骤点一遍。
const MISSION_STEPS = {
  find_mission: {
    timeout: 15000,
    find: (state) => 查找任务链接(state.enabledTypes),
    resolve: (found) => ({ next: "accept1", patch: { missionType: found.missionType, stage: "victim" } }),
    perform: (found) => found.el.click(),
    // 不是卡住，只是暂时没有可接的任务——等出"N分钟后有新任务"的倒计时（多留30秒缓冲），
    // 没有的话就固定等2分钟。
    onNotFound: () => {
      const 分钟数 = 查找新任务刷新剩余分钟();
      if (分钟数 != null) {
        const 上限后数值 = Math.min(分钟数, 20);
        return {
          retryDelayMs: 上限后数值 * 60000 + 30000,
          reason: `no missions available, waiting ~${上限后数值}m + 30s for new missions`,
        };
      }
      return {
        retryDelayMs: 2 * 60000,
        reason: "no missions available, waiting 2m and refreshing",
      };
    },
  },
  accept1: {
    timeout: 15000,
    find: () => document.querySelector(".mission-accept"),
    resolve: () => ({ next: "accept2" }),
    perform: (元素) => 元素.click(),
    // 点击前任务可能已经失效（被抢走/过期）——按"没有任务"处理，重新开始搜索，而不是卡住。
    onNotFound: () => {
      if (!查找任务不存在错误()) return null;
      return {
        retryDelayMs: 0,
        reason: "mission no longer exists, restarting search",
        next: "find_mission",
        href: "https://hackerwars.io/missions",
      };
    },
  },
  accept2: {
    timeout: 10000,
    find: () => 按值查找提交按钮("Accept"),
    resolve: () => ({ next: "read_info" }),
    perform: (元素) => 元素.click(),
  },
  read_info: {
    timeout: 15000,
    find: () => {
      const 信息 = 解析任务信息();
      return 信息.victimIp && (信息.fileName || 信息.bankAccount || 信息.accountFrom) ? 信息 : null;
    },
    resolve: (信息, state) => ({
      next: state.missionType === "bank" || state.missionType === "transfer" ? "bank_hack" : "hack",
      patch: {
        victimIp: 信息.victimIp,
        fileName: 信息.fileName,
        fileVersion: 信息.fileVersion,
        reward: 信息.reward,
        hirerIp: 信息.hirerIp,
        bankAccount: 信息.bankAccount,
        accountFrom: 信息.accountFrom,
        accountFromIp: 信息.accountFromIp,
        accountTo: 信息.accountTo,
        accountToIp: 信息.accountToIp,
        // currentAccount/transferPhase 决定下面 bank_hack_account/bank_transfer 的分支走向。
        currentAccount: state.missionType === "bank" ? 信息.bankAccount : 信息.accountFrom,
        transferPhase: state.missionType === "transfer" ? "initial" : undefined,
      },
    }),
    perform: (信息, state) => {
      const 目标IP = state.missionType === "transfer" ? state.accountFromIp : state.victimIp;
      location.href = `https://hackerwars.io/internet?ip=${目标IP}`;
    },
  },
  // 只是确认破解菜单能打开——下面的直连方法URL会跳过点它和它的爆破选项。
  hack: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?action=hack"]'),
    resolve: () => ({ next: "hack_bruteforce" }),
    perform: () => {},
  },
  // 直连URL技巧（实测有效，比打开破解菜单再点爆破选项更快）：不管最后是否真的需要爆破，
  // 直接访问方法URL都能生效——下面 await_login 没跳过倒计时检测，会照样等出可能出现的
  // 倒计时，然后一出现登录按钮就抓住它。
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
    find: () => 按值查找提交按钮("Login"),
    resolve: (元素, state) => ({ next: state.stage === "hirer" ? "hirer_software" : "software" }),
    perform: (元素) => 元素.click(),
  },
  software: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?view=software"]'),
    resolve: (元素, state) => ({ next: state.missionType === "steal" ? "steal_download" : "delete_file" }),
    perform: (元素) => 元素.click(),
  },
  delete_file: {
    timeout: 15000,
    find: (state) => 查找软件行链接(state.fileName, state.fileVersion, "cmd=del"),
    resolve: () => ({ next: "goto_own_software_for_reupload" }),
    perform: (元素) => 元素.click(),
    // "Next software reset: N minutes" 倒计时说明文件还没生成——先保留任务不放弃（放弃要扣
    // 5%声望）。
    onNotFound: () => {
      const 分钟数 = 查找软件重置剩余分钟();
      if (分钟数 == null) return null;
      const 上限后数值 = Math.min(分钟数, 20);
      return {
        retryDelayMs: 上限后数值 * 60000 + 30000,
        reason: `software not spawned yet, waiting ~${上限后数值}m + 30s for reset`,
      };
    },
  },
  // 删除软件类任务固定是 Basic Hasher.hash——删掉任务要求的那份之后，趁还连着这台机器，
  // 立刻重新上传我们自己的一份（和 steal 的 upload_file 一样用 cmd=up，只是传回受害者
  // 而不是雇主那边）。
  goto_own_software_for_reupload: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "reupload_deleted_file" }),
    perform: () => {
      location.href = "https://hackerwars.io/software";
    },
  },
  reupload_deleted_file: {
    timeout: 15000,
    find: (state) => 查找软件行链接(state.fileName, state.fileVersion, "cmd=up"),
    resolve: () => ({ next: "logout" }),
    perform: (元素) => 元素.click(),
  },
  steal_download: {
    timeout: 15000,
    find: (state) => 查找软件行链接(state.fileName, state.fileVersion, "cmd=dl"),
    resolve: () => ({ next: "logout" }),
    perform: (元素) => 元素.click(),
    onNotFound: () => {
      const 分钟数 = 查找软件重置剩余分钟();
      if (分钟数 == null) return null;
      const 上限后数值 = Math.min(分钟数, 20);
      return {
        retryDelayMs: 上限后数值 * 60000 + 30000,
        reason: `software not spawned yet, waiting ~${上限后数值}m + 30s for reset`,
      };
    },
  },
  logout: {
    timeout: 15000,
    find: () => document.body,
    // 偷取类任务的受害者环节完成后，还要去入侵雇主那边把文件交出去。
    resolve: (元素, state) => ({
      next: state.missionType === "steal" && state.stage === "victim" ? "goto_hirer" : "wait_for_dollar",
    }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?view=logout";
    },
  },
  goto_hirer: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "hack", patch: { stage: "hirer" } }),
    perform: (body, state) => {
      location.href = `https://hackerwars.io/internet?ip=${state.hirerIp}`;
    },
  },
  // 偷取类任务：交付之前先清掉雇主那边可能已有的同名旧文件。
  hirer_software: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?view=software"]'),
    resolve: () => ({ next: "check_hirer_existing_file" }),
    perform: (元素) => 元素.click(),
  },
  check_hirer_existing_file: {
    timeout: 15000,
    find: (state) => ({ link: 查找软件行链接(state.fileName, state.fileVersion, "cmd=del") }),
    resolve: ({ link }) => ({ next: link ? "delete_hirer_existing_file" : "goto_own_software" }),
    perform: () => {},
  },
  delete_hirer_existing_file: {
    timeout: 15000,
    find: (state) => 查找软件行链接(state.fileName, state.fileVersion, "cmd=del"),
    resolve: () => ({ next: "confirm_hirer_file_deleted" }),
    perform: (元素) => 元素.click(),
    onNotFound: () => {
      const 分钟数 = 查找软件重置剩余分钟();
      if (分钟数 == null) return null;
      const 上限后数值 = Math.min(分钟数, 20);
      return {
        retryDelayMs: 上限后数值 * 60000 + 30000,
        reason: `software not spawned yet, waiting ~${上限后数值}m + 30s for reset`,
      };
    },
  },
  confirm_hirer_file_deleted: {
    timeout: 15000,
    find: (state) => (查找软件行链接(state.fileName, state.fileVersion, "cmd=del") ? null : true),
    resolve: () => ({ next: "goto_own_software" }),
    perform: () => {},
  },
  goto_own_software: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "upload_file" }),
    perform: () => {
      location.href = "https://hackerwars.io/software";
    },
  },
  upload_file: {
    timeout: 15000,
    find: (state) => 查找软件行链接(state.fileName, state.fileVersion, "cmd=up"),
    resolve: () => ({ next: "logout_hirer" }),
    perform: (元素) => 元素.click(),
  },
  logout_hirer: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "goto_own_software_2" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?view=logout";
    },
  },
  goto_own_software_2: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "delete_own_file" }),
    perform: () => {
      location.href = "https://hackerwars.io/software";
    },
  },
  delete_own_file: {
    timeout: 15000,
    find: (state) => 查找软件行链接(state.fileName, state.fileVersion, "action=del"),
    resolve: () => ({ next: "wait_for_dollar" }),
    perform: (元素) => 元素.click(),
  },
  // 银行类任务：没有破解/登录/软件流程——直接入侵账号，再把钱转出去。
  bank_hack: {
    timeout: 15000,
    find: 查找银行破解链接,
    resolve: () => ({ next: "bank_hack_account" }),
    perform: (元素) => 元素.click(),
  },
  bank_hack_account: {
    timeout: 15000,
    find: 查找银行账号表单,
    // 转账类任务的第一次入侵目标是任务指定的收款账号；其余情况（普通银行任务、转账任务
    // 完成后的清扫）都是入侵我们自己的账号。
    resolve: (found, state) => ({
      next: "bank_login",
      patch: {
        bankLoginNext: state.missionType === "transfer" && state.transferPhase === "initial" ? "transfer_to_designated_account" : "bank_transfer",
      },
    }),
    perform: ({ input, button }, state) => {
      设置输入框值(input, state.currentAccount);
      button.click();
    },
  },
  bank_login: {
    // 有些账号入侵提交后还需要一步登录；有些直接进转账表单。
    timeout: 90000,
    find: () => {
      const 登录按钮 = 按值查找提交按钮("Login");
      if (登录按钮) return { kind: "login", el: 登录按钮 };
      if (查找银行转账表单()) return { kind: "skip" };
      return null;
    },
    resolve: (found, state) => ({ next: state.bankLoginNext }),
    perform: ({ kind, el }) => {
      if (kind === "login") el.click();
    },
  },
  // 转账类任务：把受害者的余额转到任务指定的"收款账号"。
  transfer_to_designated_account: {
    timeout: 90000,
    find: 查找银行转账表单,
    resolve: () => ({ next: "wait_for_dollar" }),
    perform: ({ transferInput, ipInput, button }, state) => {
      设置输入框值(transferInput, state.accountTo);
      设置输入框值(ipInput, state.accountToIp);
      button.click();
    },
  },
  bank_transfer: {
    timeout: 90000,
    find: 查找银行转账表单,
    // 普通银行任务还需要收款并完成；转账任务的清扫环节直接去买比特币然后循环。
    resolve: (found, state) => ({
      next: state.transferPhase === "sweep" ? "goto_btc" : "wait_for_dollar",
      patch: { transferAmount: found.moneyInput.value, postBtcNext: "goto_missions" },
    }),
    // 目的地是玩家在设置里配置的"自转账"目标，存在运行器状态里。
    perform: ({ transferInput, ipInput, button }, state) => {
      设置输入框值(transferInput, state.selfTransferAccount);
      设置输入框值(ipInput, state.selfTransferIp);
      button.click();
    },
  },
  wait_for_dollar: {
    timeout: 60000,
    find: 查找完成徽章,
    resolve: () => ({ next: "complete1" }),
    perform: (元素) => 元素.click(),
  },
  complete1: {
    timeout: 30000,
    find: () => document.querySelector(".mission-complete"),
    resolve: () => ({ next: "complete2" }),
    // 银行任务需要在点完成前把查到的余额填进 #amount-input。
    perform: (元素, state) => {
      if (state.missionType === "bank") {
        const 金额输入框 = document.querySelector("#amount-input");
        if (金额输入框) 设置输入框值(金额输入框, state.transferAmount);
      }
      元素.click();
    },
  },
  complete2: {
    timeout: 10000,
    find: () => document.querySelector("#modal-submit"),
    // 转账类任务完成后，把"收款账号"里的钱清扫回我们自己的账号；不管哪种都要买比特币，
    // 之后去哪由 postBtcNext 决定。
    resolve: (元素, state) => ({
      next: "goto_btc",
      patch: { postBtcNext: state.missionType === "transfer" ? "goto_account_to" : "goto_missions" },
      complete: true,
    }),
    perform: (元素) => 元素.click(),
  },
  goto_account_to: {
    timeout: 15000,
    find: () => document.body,
    resolve: (body, state) => ({
      next: "bank_hack",
      patch: { transferPhase: "sweep", currentAccount: state.accountTo },
    }),
    perform: (body, state) => {
      location.href = `https://hackerwars.io/internet?ip=${state.accountToIp}`;
    },
  },
  goto_btc: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "buy_btc_click" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?redirect=btc";
    },
  },
  buy_btc_click: {
    timeout: 15000,
    find: 查找购买比特币链接,
    resolve: () => ({ next: "buy_btc_submit" }),
    perform: (元素) => 元素.click(),
  },
  // BTC市场会话没登录时会出现 #btc-login 而不是 #btc-submit——登录后回去再点一次
  // Buy Bitcoins，而不是卡在这里。
  buy_btc_submit: {
    timeout: 15000,
    find: () => {
      const 登录按钮 = document.querySelector("#btc-login");
      if (登录按钮) return { kind: "login", el: 登录按钮 };
      const 购买按钮 = document.querySelector("#btc-submit");
      return 购买按钮 ? { kind: "buy", el: 购买按钮 } : null;
    },
    resolve: (found, state) => ({ next: found.kind === "login" ? "buy_btc_click" : state.postBtcNext || "goto_missions" }),
    perform: (found) => found.el.click(),
  },
  goto_missions: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "find_mission" }),
    perform: () => {
      location.href = "https://hackerwars.io/missions";
    },
  },
};
