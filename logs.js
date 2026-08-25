// 扫描页面日志内容里带方括号的IP（例如 "[1.2.3.4] logged in as root"），跳过自己的IP，把新
// 出现的存进一个持续累积的列表，供之后导出使用。
const 方括号IP正则 = /\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/g;

function 获取自身IP() {
  return document.querySelector(".header-ip-show")?.textContent.trim() || null;
}

function 提取日志中的IP(文本) {
  const IP集合 = new Set();
  let 匹配项;
  while ((匹配项 = 方括号IP正则.exec(文本))) IP集合.add(匹配项[1]);
  return [...IP集合];
}

async function 收集日志IP() {
  const 文本框 = 获取日志文本框();
  if (!文本框 || !文本框.value.trim()) return;

  const 自身IP = 获取自身IP();
  const 找到的IP列表 = 提取日志中的IP(文本框.value).filter((地址) => 地址 !== 自身IP);
  if (找到的IP列表.length === 0) return;

  const { gatheredIps: 已收集IP列表 = [] } = await chrome.storage.local.get("gatheredIps");
  const 已见过集合 = new Set(已收集IP列表.map((项) => 项.ip));
  let 新增数量 = 0;
  for (const 地址 of 找到的IP列表) {
    if (已见过集合.has(地址)) continue;
    已收集IP列表.push({ ip: 地址, firstSeen: Date.now(), source: location.href });
    已见过集合.add(地址);
    新增数量++;
  }
  if (新增数量 > 0) {
    await chrome.storage.local.set({ gatheredIps: 已收集IP列表 });
    console.log("[HWAuto] gathered", 新增数量, "new ip(s) from log");
  }
}

// 监视 /log：如果有内容，就清空并提交 "Edit log file"，大约30秒后再刷新检查一次（每次都
// 重新确认 running/tabId）。
const 日志检查间隔毫秒 = 30000;

// 在启动它的那个页面（某个目标的日志页）上快速循环刷新——每次都收集一遍IP，抢在目标登录
// 并清空自己的日志之前把攻击者IP记下来。
const 日志监视最短毫秒 = 1000;
const 日志监视最长毫秒 = 3000;

function 安排下次日志监视(标签页ID) {
  const 延迟 = 日志监视最短毫秒 + Math.random() * (日志监视最长毫秒 - 日志监视最短毫秒);
  setTimeout(async () => {
    const { logWatcherRunner: 运行器 } = await chrome.storage.local.get("logWatcherRunner");
    if (运行器 && 运行器.running && 运行器.tabId === 标签页ID) {
      location.reload();
    }
  }, 延迟);
}

async function 处理日志监视() {
  const 标签页ID = await 获取标签页ID();
  if (标签页ID == null) return;

  const { logWatcherRunner: 运行器 } = await chrome.storage.local.get("logWatcherRunner");
  if (!运行器 || !运行器.running || 运行器.tabId !== 标签页ID) return;

  await chrome.storage.local.set({ logWatcherRunner: { ...运行器, lastCheck: Date.now() } });
  安排下次日志监视(标签页ID);
}

function 获取日志文本框() {
  return document.querySelector('textarea[name="log"]');
}

function 获取编辑日志按钮() {
  return document.querySelector('input[type="submit"][value="Edit log file"]');
}

function 安排下次日志检查(标签页ID) {
  setTimeout(async () => {
    const { logMonitor: 运行器 } = await chrome.storage.local.get("logMonitor");
    if (运行器 && 运行器.running && 运行器.tabId === 标签页ID) {
      location.reload();
    }
  }, 日志检查间隔毫秒);
}

async function 处理日志监控() {
  if (!location.pathname.startsWith("/log")) return;

  const 标签页ID = await 获取标签页ID();
  if (标签页ID == null) return;

  const { logMonitor: 运行器 } = await chrome.storage.local.get("logMonitor");
  if (!运行器 || !运行器.running || 运行器.tabId !== 标签页ID) return;

  const 文本框 = 获取日志文本框();
  const 是否有内容 = !!文本框 && 文本框.value.trim().length > 0;
  const 下一状态 = { ...运行器, lastCheck: Date.now() };

  if (是否有内容) {
    console.log("[HWAuto] log has content, clearing and submitting");
    await 取消陈旧日志编辑进程();
    文本框.value = "";
    下一状态.clearedCount = (运行器.clearedCount || 0) + 1;
    await chrome.storage.local.set({ logMonitor: 下一状态 });
    const 按钮 = 获取编辑日志按钮();
    if (按钮) {
      按钮.click();
    } else {
      console.log("[HWAuto] edit log button not found");
    }
  } else {
    console.log("[HWAuto] log empty, nothing to do");
    await chrome.storage.local.set({ logMonitor: 下一状态 });
  }

  // 兜底刷新，防止 AJAX 提交没有触发页面跳转；如果提交本身就跳转了页面，这个计时器会随之
  // 失效，无害。
  安排下次日志检查(标签页ID);
}
