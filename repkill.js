// 故意刷低声望：随便抓一个摧毁服务器/删除软件/窃取软件/转账/查银行状态类型的任务，接受它，
// 中止它，循环往复。不破解、不接触受害者，也不真的入侵银行——只是接受然后中止。
const REP_KILL_TITLES = ["destroy server", "delete software", "steal software", "transfer money", "check bank status"];

function 查找声望绞杀任务链接() {
  for (const 链接元素 of document.querySelectorAll('a[href*="?id="]')) {
    if (REP_KILL_TITLES.includes(链接元素.textContent.trim().toLowerCase())) return 链接元素;
  }
  return null;
}

const REP_KILL_STEPS = {
  goto_missions: {
    timeout: 15000,
    find: () => document.body,
    resolve: () => ({ next: "find_mission" }),
    perform: () => {
      if (location.pathname !== "/missions") location.href = "https://hackerwars.io/missions";
    },
  },
  find_mission: {
    timeout: 15000,
    find: () => 查找声望绞杀任务链接(),
    resolve: () => ({ next: "accept1" }),
    perform: (元素) => 元素.click(),
    onNotFound: () => ({
      retryDelayMs: 2 * 60000,
      reason: "no destroy/delete/steal mission available, waiting 2m and refreshing",
    }),
  },
  accept1: {
    timeout: 15000,
    find: () => document.querySelector(".mission-accept"),
    resolve: () => ({ next: "accept2" }),
    perform: (元素) => 元素.click(),
    // 列表里的任务可能在我们点它之前就失效了——重新开始搜索，而不是卡住。
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
    resolve: () => ({ next: "abort1" }),
    perform: (元素) => 元素.click(),
  },
  abort1: {
    timeout: 15000,
    find: () => document.querySelector(".mission-abort"),
    resolve: () => ({ next: "abort2" }),
    perform: (元素) => 元素.click(),
  },
  abort2: {
    timeout: 10000,
    find: () => 按值查找提交按钮("Abort"),
    resolve: () => ({ next: "goto_missions", complete: true }),
    perform: (元素) => 元素.click(),
  },
};
