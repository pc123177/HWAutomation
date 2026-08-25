// 收取闲置收入、清空日志，然后休眠（弹窗可配置时长）后重复——不用盯着倒计时，和 research
// 运行器一样，靠 chrome.alarms 实现跨页面跳转的思路。
const 默认收款间隔毫秒 = 60 * 60 * 1000;
// 网站自身对收款操作的冷却时间——比这更快只会失败，所以不管弹窗里配置了什么，这里都是
// 硬性下限。
const 最短收款间隔毫秒 = 10.5 * 60 * 1000;

const COLLECT_STEPS = {
  goto_list: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "collect" }),
    perform: () => {
      if (location.href !== "https://hackerwars.io/list.php?action=collect") {
        location.href = "https://hackerwars.io/list.php?action=collect";
      }
    },
  },
  collect: {
    timeout: 15000,
    find: () => 按值查找提交按钮("Collect my money!"),
    resolve: () => ({ next: "goto_log" }),
    perform: (元素) => 元素.click(),
  },
  goto_log: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "clear_log" }),
    perform: () => {
      location.href = "https://hackerwars.io/log";
    },
  },
  clear_log: {
    timeout: 15000,
    find: () => {
      const 文本框 = 获取日志文本框();
      const 按钮 = 获取编辑日志按钮();
      return 文本框 && 按钮 ? { textarea: 文本框, button: 按钮 } : null;
    },
    resolve: (找到结果, 状态) => ({
      next: "goto_btc",
      patch: { collectDeadline: Date.now() + Math.max(状态.collectIntervalMs || 默认收款间隔毫秒, 最短收款间隔毫秒) },
      complete: true,
    }),
    perform: async ({ textarea: 文本框, button: 按钮 }) => {
      await 取消陈旧日志编辑进程();
      文本框.value = "";
      按钮.click();
    },
  },
  // 和任务运行器（missions.js）同样的买比特币流程——复用它的链接查找函数和 #btc-submit
  // 选择器——趁闲钱还没白白躺一个小时之前先花出去。
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
    resolve: (找到结果) => ({ next: 找到结果.kind === "login" ? "buy_btc_click" : "browse" }),
    perform: (找到结果) => 找到结果.el.click(),
  },
  // 和 research.js 的 browse 步骤同一套页面跳转思路（复用它的页面列表/时间参数），而不是
  // 原地不动躺满一整个小时，免得被网站按空闲判定登出。以一个绝对截止时间为准，不管中途
  // 跳了几次，最终都会在整点前后落回 goto_list。
  browse: {
    timeout: 15000,
    find: () => document.body,
    resolve: (页面主体, 状态) => ({ next: Date.now() >= 状态.collectDeadline ? "goto_list" : "browse" }),
    perform: async (页面主体, 状态) => {
      const 剩余毫秒 = 状态.collectDeadline - Date.now();
      if (剩余毫秒 <= 0) return;
      const 页面 = RESEARCH_BROWSE_PAGES[Math.floor(Math.random() * RESEARCH_BROWSE_PAGES.length)];
      const 等待时长 = Math.min(randomBetween(RESEARCH_BROWSE_MIN_MS, RESEARCH_BROWSE_MAX_MS), 剩余毫秒);
      await 休眠(Math.max(等待时长, 0));
      location.href = 页面;
    },
  },
};
