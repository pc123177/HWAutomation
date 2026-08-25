// 沿着"First Puzzle"这条主机链条一路推进：破解进入，从目标身上摘下最弱的.crc破解器，
// 带回家装好，再跳回去打开谜题。每台主机对应一道编号不同的谜题——大多数是带已知答案
// （谜题答案表）的简短问答关卡，少数是没有问答表单的嵌入式小游戏，这类会暂停，等弹窗上的
// "继续"按钮。

// 谜题编号 -> 填入"qa-answer"输入框的答案。没列出来的编号，要么根本没有问答关卡
// （见 谜题手动小游戏配置），要么只是还没记录下来——不管哪种，运行器都会暂停。
const 谜题答案表 = {
  2: "3",
  3: "Eyjafjallajökull",
  4: "12, 4",
  5: "24",
  6: "Area 51",
  7: "4",
  8: "Hacker Wars",
  9: "Too Many Secrets",
  12: "Stay Hungry, Stay Foolish",
  13: "Aramis",
  14: "62.5",
  15: "50",
  16: "5, 1, 94",
  18: "Phoebe, Milena, Naomy",
  19: "4, 3",
  20: "a, d, c",
  21: "3, 3, 9",
  22: "5, 2",
  23: "99+99/99",
  24: "49, 35",
  25: "Every player who buys premium is awesome",
  26: "9, 18",
  27: "To be or not to be",
  28: "Hacker Experience",
  30: "Enigma",
  31: "Penny",
  32: "Nishiyama Onsen Keiunkan",
  33: "Hack The Planet",
  34: "password123",
  35: "47",
  36: "show no remorse",
  37: "Despacito",
  38: "1, 2, 3",
  39: "Diamond, Ruby, Sapphire",
  40: "Kung Fury",
  41: "Morpheus",
  42: "HACKER",
  43: "LCM+L",
  44: "Burj Khalifa",
  45: "Satoshi Nakamoto",
  46: "SHA256",
  47: "10/11/2019",
};

// 没有问答关卡的谜题——都是嵌入式小游戏。如果配置了 gotchaMessage，会优先尝试：直接向
// gotcha.php发一个POST，谎称游戏已经通关（同一个游戏的另一个机器人用过这招——服务端
// 从未真正验证游戏是否被玩过，照单全收）。如果失败，或者压根没配置，就回退到暂停，附带
// solverUrl（每个谜题只会打开一次新标签页）等你手动求解。
const 谜题手动小游戏配置 = {
  1: { name: "Tic-Tac-Toe", gotchaMessage: "func=tictactoe&status=1" },
  11: { name: "the 2048 tile game", gotchaMessage: "func=2048&type=5" },
  17: { name: "Minesweeper", gotchaMessage: "func=minesweeper", solverUrl: "https://www.logigames.com/minesweeper/solver" },
  29: { name: "Lights Out", gotchaMessage: "func=lightsout", solverUrl: "https://scintilla.dev/lightsout-solver/" },
};

// 记录每个谜题编号的gotcha.php请求处于进行中还是已完成。find()函数必须是同步的，所以
// 请求在第一次轮询时发起，结果留到后面的轮询里再读，而不是原地await。
const 谜题自动求解尝试记录 = {};

async function 尝试自动破解谜题(消息) {
  try {
    const 响应 = await fetch("/gotcha.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
      body: 消息,
      credentials: "same-origin",
    });
    const 数据 = await 响应.json();
    return 数据.status === "OK";
  } catch (错误) {
    console.log("[HWAuto] gotcha.php auto-solve failed", 错误);
    return false;
  }
}

// 谜题10故意不提供答案——装好破解器之后，直接跳过整个解谜环节，改用这个固定的下一个IP，
// 而不是去抓取那个永远不会出现的"已解决"信息组件。
const 谜题固定跳转IP表 = {
  10: "1.2.3.4",
};

// "First Puzzle"这一项的IP每次运行都会变，所以是按它的标签文字匹配，而不是固定的href。
function 查找第一谜题链接() {
  for (const 链接元素 of document.querySelectorAll('a[href*="internet?ip="]')) {
    const 标签元素 = 链接元素.querySelector(".whois-member");
    if (标签元素 && 标签元素.textContent.trim() === "First Puzzle") return 链接元素;
  }
  return null;
}

// 目标软件列表里（按DOM顺序）第一个.crc破解器，附带它的下载链接。
function 查找CRC行() {
  for (const 行 of document.querySelectorAll("tr[id]")) {
    const 单元格 = 行.querySelectorAll("td");
    if (单元格.length < 3) continue;
    const name = 单元格[1].textContent.trim();
    if (!/\.crc$/i.test(name)) continue;
    const dlLink = 行.querySelector('a[href*="cmd=dl"]');
    if (!dlLink) continue;
    return { name, version: 单元格[2].textContent.trim(), dlLink };
  }
  return null;
}

function 查找问答答案表单() {
  const 输入框 = document.querySelector('input[name="qa-answer"]');
  const 按钮 = 输入框?.closest("form")?.querySelector('input[type="submit"][value="Submit answer"]');
  return 输入框 && 按钮 ? { input: 输入框, button: 按钮 } : null;
}

// 解开后出现的"Puzzle Status"组件——下一个目标的IP就在它的<a>标签里。
function 查找谜题下一个IP() {
  const 链接元素 = document.querySelector("#puzzle-next a");
  if (!链接元素) return null;
  return new URL(链接元素.href, location.href).searchParams.get("ip");
}

const PUZZLE_STEPS = {
  // 全新账号、还没破解任何目标时的一次性入口；此后每一轮循环（以及通过弹窗
  // "Resume at Target IP"输入框发起的每一次续跑——它会预置currentIp/nextIp，直接从
  // "hack"开始）都会直接走 goto_next_target/hack。破解目标、安装它的crc是每一轮都必须做
  // 的——没有能跳过这一步、直奔谜题的捷径。
  find_first_puzzle: {
    timeout: 15000,
    find: () => 查找第一谜题链接(),
    resolve: (元素, 状态) => ({ next: "hack", patch: { puzzleNumber: 状态.puzzleNumber || 1 } }),
    perform: (元素) => 元素.click(),
  },
  // 这里只是确认破解菜单能打开——下面的直连方法URL会跳过点它和它的爆破选项。
  hack: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?action=hack"]'),
    resolve: () => ({ next: "hack_bruteforce", patch: { currentIp: new URLSearchParams(location.search).get("ip") } }),
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
    resolve: () => ({ next: "goto_software" }),
    perform: (元素) => 元素.click(),
  },
  goto_software: {
    timeout: 15000,
    find: () => document.querySelector('a[href="?view=software"]'),
    resolve: () => ({ next: "find_crc" }),
    perform: (元素) => 元素.click(),
  },
  find_crc: {
    timeout: 15000,
    find: () => 查找CRC行(),
    resolve: (找到结果) => ({ next: "await_download", patch: { crcFileName: 找到结果.name, crcFileVersion: 找到结果.version } }),
    perform: (找到结果) => 找到结果.dlLink.click(),
  },
  await_download: {
    timeout: 60000,
    find: () => document.body,
    resolve: () => ({ next: "install_crc" }),
    perform: () => {
      location.href = "https://hackerwars.io/software";
    },
  },
  install_crc: {
    timeout: 15000,
    find: (状态) => 查找软件行链接(状态.crcFileName, 状态.crcFileVersion, "action=install"),
    resolve: () => ({ next: "await_install" }),
    perform: (元素) => 元素.click(),
  },
  await_install: {
    timeout: 60000,
    find: (状态) => {
      const 行 = 查找软件行(状态.crcFileName, 状态.crcFileVersion);
      return 行 && 行.classList.contains("installed") ? true : null;
    },
    resolve: () => ({ next: "delete_old_crc" }),
    perform: () => {},
  },
  // 删除上一道谜题装的那个.crc，避免越攒越多（第一道谜题时是空操作，或者和刚装的是同一个
  // 名称+版本时也是空操作）。
  delete_old_crc: {
    timeout: 15000,
    find: (状态) => {
      if (!状态.installedCrcFileName) return true;
      if (状态.installedCrcFileName === 状态.crcFileName && 状态.installedCrcFileVersion === 状态.crcFileVersion) return true;
      const 链接 = 查找软件行链接(状态.installedCrcFileName, 状态.installedCrcFileVersion, "action=del");
      return 链接 ? { link: 链接 } : true;
    },
    // 谜题10永远不会被打开——直接带着固定的下一个IP跳到登出。
    resolve: (找到结果, 状态) => {
      const 补丁 = { installedCrcFileName: 状态.crcFileName, installedCrcFileVersion: 状态.crcFileVersion };
      const 固定IP = 谜题固定跳转IP表[状态.puzzleNumber];
      return 固定IP
        ? { next: "logout", patch: { ...补丁, nextIp: 固定IP, puzzleNumber: 状态.puzzleNumber + 1 } }
        : { next: "find_riddle", patch: 补丁 };
    },
    perform: (找到结果) => {
      if (找到结果 && 找到结果.link) 找到结果.link.click();
    },
  },
  // 始终是同一个固定URL，不管页面上是什么（在这里找cmd=riddle链接并不可靠——这个URL会
  // 直接打开刚装好的crc对应的、待解的谜题）。旧crc的卸载（刚被delete_old_crc触发）是一个
  // 带真实.elapsed倒计时的计时进程——等待条件成立的倒计时等待逻辑会正确地先等它跑完，再
  // 调用find()。之前15秒的超时太短，撑不过这段等待（等待逻辑会把延迟压缩到不超过这一步
  // 自己的超时时间，所以会在刚好15秒时就判定为"卡住"，根本没机会调用find()）——把超时调长
  // 才是正确的修法，而不是跳过这段等待。
  find_riddle: {
    timeout: 120000,
    find: () => document.body,
    resolve: () => ({ next: "answer_qa" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?view=software&cmd=riddle";
    },
  },
  answer_qa: {
    timeout: 15000,
    find: 查找问答答案表单,
    // 有记录的答案会被提交，然后和其他自动求解的谜题一样等待确认（grab_next_ip）——没理由
    // 停下来问你。只有没记录的答案才会走 await_puzzle_solve，那里才是真正暂停等你的地方。
    resolve: (找到结果, 状态) => ({ next: 谜题答案表[状态.puzzleNumber] != null ? "grab_next_ip" : "await_puzzle_solve" }),
    // 没有记录的答案：不碰这个表单——await_puzzle_solve会看到它还没被回答，从而暂停。
    perform: ({ input, button }, 状态) => {
      const 答案 = 谜题答案表[状态.puzzleNumber];
      if (答案 == null) return;
      设置输入框值(input, 答案);
      button.click();
    },
    // 压根没有问答关卡，就说明这是个嵌入式小游戏——先试试gotcha.php这条捷径。
    onNotFound: () => ({
      retryDelayMs: 0,
      reason: "no Q&A gate found, trying auto-solve",
      next: "auto_solve_puzzle",
    }),
  },
  // 只有嵌入式小游戏（没有问答关卡）才会走到这一步。每个谜题编号只会发起一次gotcha.php
  // 请求并轮询结果；如果失败，或者这道谜题压根没配置gotchaMessage，就落回手动暂停。
  auto_solve_puzzle: {
    timeout: 20000,
    find: (状态) => {
      const 游戏 = 谜题手动小游戏配置[状态.puzzleNumber];
      if (!游戏?.gotchaMessage) return "skip";
      if (!(状态.puzzleNumber in 谜题自动求解尝试记录)) {
        谜题自动求解尝试记录[状态.puzzleNumber] = "pending";
        尝试自动破解谜题(游戏.gotchaMessage).then((成功) => {
          谜题自动求解尝试记录[状态.puzzleNumber] = 成功 ? "ok" : "failed";
        });
      }
      const 求解状态 = 谜题自动求解尝试记录[状态.puzzleNumber];
      return 求解状态 === "pending" ? null : 求解状态;
    },
    resolve: (求解状态) => ({ next: 求解状态 === "ok" ? "solved_reload" : "await_puzzle_solve" }),
    perform: () => {},
  },
  // gotcha.php接受了这个伪造的通关请求——刷新页面让它反映出已解决的状态，就像网站自己的
  // 谜题流程在真正获胜后那样。
  solved_reload: {
    timeout: 5000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "grab_next_ip" }),
    perform: () => {
      location.reload();
    },
  },
  // 故意立刻"找不到"，好让onNotFound（shared.js）把它转成暂停，而不是卡住/报错——同时
  // 覆盖嵌入式小游戏和未记录的问答答案这两种情况。弹窗里的"继续"按钮会设置
  // continueRequested并刷新页面，find()到时候看到的就是这个标记。
  await_puzzle_solve: {
    timeout: 50,
    find: (状态) => (状态.continueRequested ? true : null),
    onNotFound: (状态) => {
      const 游戏 = 谜题手动小游戏配置[状态.puzzleNumber];
      if (游戏) {
        const 已打开求解器 = 状态.solverTabOpenedFor === 状态.puzzleNumber;
        if (游戏.solverUrl && !已打开求解器) {
          chrome.runtime.sendMessage({ action: "openTab", payload: { url: 游戏.solverUrl } });
        }
        return {
          pause: true,
          reason: `Waiting for you to solve ${游戏.name}`,
          patch: 游戏.solverUrl ? { solverTabOpenedFor: 状态.puzzleNumber } : undefined,
        };
      }
      return {
        pause: true,
        reason: `Puzzle ${状态.puzzleNumber} has no saved answer — solve it manually, then hit Continue (or add it to PUZZLE_ANSWERS).`,
      };
    },
    resolve: () => ({ next: "grab_next_ip", patch: { continueRequested: false } }),
    perform: () => {},
  },
  grab_next_ip: {
    timeout: 15000,
    find: 查找谜题下一个IP,
    resolve: (地址, 状态) => ({
      next: "logout",
      patch: { nextIp: 地址, puzzleNumber: 状态.puzzleNumber + 1 },
      complete: true,
    }),
    perform: () => {},
  },
  logout: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "goto_next_target" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?view=logout";
    },
  },
  goto_next_target: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "hack" }),
    perform: (页面主体, 状态) => {
      location.href = `https://hackerwars.io/internet?ip=${状态.nextIp}`;
    },
  },
};
