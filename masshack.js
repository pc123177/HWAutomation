// 依次处理弹窗提供的一份IP列表：逐个破解进入（需要就暴力破解），然后处理下一个。全程不
// 登录——出现登录提示就说明这次破解已经完成（或者本来就不需要破解），和直接的"Hack"链接
// 失效一样，都是移动到下一个的信号。
const MASSHACK_STEPS = {
  goto_target: {
    timeout: 15000,
    find: (状态) => (状态.ipQueue && 状态.ipQueue.length > 0 ? 状态.ipQueue[0] : "done"),
    resolve: (找到结果, 状态) =>
      找到结果 === "done"
        ? { next: "goto_target", stop: true }
        : { next: "hack", patch: { currentIp: 找到结果, ipQueue: 状态.ipQueue.slice(1) } },
    perform: (找到结果) => {
      if (找到结果 !== "done") location.href = `https://hackerwars.io/internet?ip=${找到结果}`;
    },
  },
  // 收集到的IP可能会失效（对方换了IP）——目标页面会直接404，而不是显示破解链接。这里在
  // find() 里就检测到，直接跳过，不用等超时。
  // 这里只是确认破解菜单能打开——下面的直连方法URL会跳过点它和它的爆破选项。
  hack: {
    timeout: 15000,
    find: () => {
      const 链接 = document.querySelector('a[href="?action=hack"]');
      if (链接) return { kind: "hack" };
      const 未找到 = [...document.querySelectorAll(".widget-content")].some((元素) =>
        /404 - Page not found/.test(元素.textContent)
      );
      return 未找到 ? { kind: "not_found" } : null;
    },
    resolve: ({ kind }) => ({ next: kind === "hack" ? "hack_bruteforce" : "goto_target", complete: kind === "not_found" }),
    perform: () => {},
    onNotFound: () => ({
      retryDelayMs: 0,
      reason: "no hack link found (already hacked or invalid ip?) - skipping",
      next: "goto_target",
    }),
  },
  // 直连URL技巧（实测有效，比打开破解菜单再点爆破选项更快）：不管最后是否真的需要爆破，
  // 直接访问方法URL都能生效——下面 await_bruteforce 没跳过倒计时检测，会照样等出可能出现
  // 的倒计时，然后一出现登录提示就抓住它。
  hack_bruteforce: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "await_bruteforce" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?action=hack&method=bf";
    },
  },
  // 暴力破解进行中——等登录提示出现（说明破解成功），然后继续处理下一个。
  await_bruteforce: {
    timeout: 120000,
    find: () => 按值查找提交按钮("Login"),
    resolve: () => ({ next: "goto_target", complete: true }),
    perform: () => {},
  },
};
