// 下面的代码要等卡片的 DOM 真正存在之后才会运行——如果这个文件是通过 popup.html 自己的
// <script> 标签加载的，DOM 早就已经在文档里了；但如果是作为内容脚本运行、由 overlay.js 注入，
// 就得等它注入完成才行。具体判断见本文件末尾的自启动守卫。
function 初始化弹窗界面() {
const 日志元素 = document.getElementById("log");

function 记录日志(消息) {
  const 时间 = new Date().toLocaleTimeString();
  日志元素.textContent = `[${时间}] ${消息}\n` + 日志元素.textContent;
}

// 三层视图：主菜单 -> 分组子菜单（Tools/Logs/Missions）-> 单个面板；#log 全程保持可见。
// 面板自己的返回按钮会回到它是从哪个子菜单打开的（记在 当前子菜单ID 里），而不是直接回主菜单。
const 主菜单元素 = document.getElementById("mainMenu");
let 当前子菜单ID = null;

function 隐藏全部() {
  主菜单元素.classList.add("hidden");
  for (const 子菜单 of document.querySelectorAll(".submenu")) 子菜单.classList.remove("active");
  for (const 面板 of document.querySelectorAll(".module-panel")) 面板.classList.remove("active");
}

function 显示主菜单() {
  隐藏全部();
  主菜单元素.classList.remove("hidden");
  当前子菜单ID = null;
}

function 显示子菜单(子菜单ID) {
  隐藏全部();
  document.getElementById(子菜单ID).classList.add("active");
  当前子菜单ID = 子菜单ID;
}

function 显示面板(面板ID) {
  隐藏全部();
  for (const 面板 of document.querySelectorAll(".module-panel")) {
    面板.classList.toggle("active", 面板.id === 面板ID);
  }
}

for (const 分组按钮 of document.querySelectorAll("#mainMenu [data-group]")) {
  分组按钮.addEventListener("click", () => 显示子菜单(分组按钮.dataset.group));
}
for (const 菜单项 of document.querySelectorAll(".submenu .menu-item[data-target]")) {
  菜单项.addEventListener("click", () => 显示面板(菜单项.dataset.target));
}
for (const 返回主菜单按钮 of document.querySelectorAll("[data-back-to-main]")) {
  返回主菜单按钮.addEventListener("click", 显示主菜单);
}
for (const 返回按钮 of document.querySelectorAll(".module-panel [data-back]")) {
  返回按钮.addEventListener("click", () => {
    if (返回按钮.dataset.backTarget) {
      显示面板(返回按钮.dataset.backTarget);
    } else {
      当前子菜单ID ? 显示子菜单(当前子菜单ID) : 显示主菜单();
    }
  });
}

// Setup 直接挂在主菜单下面（不属于 Tools/Logs/Missions 任何一个子菜单），所以它的返回按钮
// 应该始终回到主菜单，而不是回到之前碰巧打开过的某个子菜单。
document.getElementById("setupBtn").addEventListener("click", () => {
  当前子菜单ID = null;
  显示面板("panel-setup");
});

// 折叠/展开：单纯切换卡片上的一个 CSS class，和这个外观移植自的参考悬浮窗做法一样——底下
// 什么都不会被销毁，折叠期间状态/计数/日志历史都还保留着。
const 卡片元素 = document.getElementById("hwauto-card");
const 折叠按钮元素 = document.getElementById("hwauto-collapse-toggle");
折叠按钮元素.addEventListener("click", () => {
  const 已折叠 = 卡片元素.classList.toggle("collapsed");
  折叠按钮元素.innerHTML = 已折叠 ? "&#9650;" : "&#9660;";
});

// 彻底关闭悬浮窗（不只是折叠——直接消失，直到重新启用）。设置一个存储标记，overlay.js 在
// 加载/变化时会检查它，并立刻通过当前实例的外层容器隐藏（只有在被注入的悬浮窗上下文里才会
// 存在这个容器；在独立弹窗里这一步是无害的空操作）。下次打开工具栏弹窗时会恢复——见下面
// 是否有标签页API 那段。
document.getElementById("hwauto-hide-toggle").addEventListener("click", async () => {
  await chrome.storage.local.set({ overlayHidden: true });
  const 悬浮窗根节点 = document.getElementById("hwauto-overlay-root");
  if (悬浮窗根节点) 悬浮窗根节点.style.display = "none";
});

// chrome.tabs/alarms/action/downloads 只有在特权扩展页面里才能用（也就是本文件通过 popup.html
// 加载的那种情况）；当本文件作为内容脚本被 overlay.js 注入运行时，这些都不存在，只能直接操作
// 当前标签页，或者通过消息通信请求 background.js 代劳（内容脚本永远都能用消息通信）。
const 是否有标签页API = typeof chrome !== "undefined" && !!chrome.tabs;

// 打开工具栏弹窗本身就是"把它找回来"的动作——每次都会清掉隐藏标记，让悬浮窗重新出现在
// 游戏标签页上（overlay.js 通过监听存储变化来响应）。
if (是否有标签页API) {
  chrome.storage.local.set({ overlayHidden: false });
}

// 每个拥有独立开始/停止按钮的运行器，都汇总在这里——这样一个失控的任务不用翻进它藏在哪个
// 子菜单/面板里就能一键停掉。
const 全部运行器键名 = [
  "researchRunner",
  "collectRunner",
  "repKillRunner",
  "logMonitor",
  "bgLogMonitor",
  "logWatcherRunner",
  "softwareGather",
  "missionRunner",
  "infection2Runner",
  "puzzleRunner",
  "massHackRunner",
];

const 运行器标签 = {
  researchRunner: "Research 研究任务",
  collectRunner: "Collect 收款任务",
  repKillRunner: "Rep Kill 声望清除",
  logMonitor: "Log Monitor 日志监控",
  bgLogMonitor: "Background Log Monitor 后台日志监控",
  logWatcherRunner: "Log Watcher 日志监视",
  softwareGather: "Gather 采集工具",
  missionRunner: "Mission 任务刷取",
  infection2Runner: "Infection 感染模块",
  puzzleRunner: "Puzzle 解谜任务",
  massHackRunner: "Mass Hack 批量入侵",
};

async function 渲染运行中脚本状态() {
  const 元素 = document.getElementById("runningScriptsStatus");
  const 已存储数据 = await chrome.storage.local.get(全部运行器键名);
  const 运行中列表 = 全部运行器键名.filter((键) => 已存储数据[键] && 已存储数据[键].running).map((键) => 运行器标签[键]);
  元素.textContent = 运行中列表.length > 0 ? `运行中：\n${运行中列表.join("\n")}` : "无正在运行的任务";
}

document.getElementById("stopAllBtn").addEventListener("click", async () => {
  const 已存储数据 = await chrome.storage.local.get(全部运行器键名);
  const 更新集合 = {};
  let 已停止数量 = 0;
  for (const 键 of 全部运行器键名) {
    const 运行器 = 已存储数据[键];
    if (运行器 && 运行器.running) {
      更新集合[键] = { ...运行器, running: false };
      已停止数量++;
    }
  }
  if (Object.keys(更新集合).length > 0) {
    await chrome.storage.local.set(更新集合);
  }
  清除后台闹钟("bgLogMonitor");
  记录日志(已停止数量 > 0 ? `已停止 ${已停止数量} 个正在运行的任务。` : "没有正在运行的任务。");
  渲染研究任务状态();
  渲染收款任务状态();
  渲染声望清除状态();
  渲染日志监控状态();
  渲染后台日志监控状态();
  渲染日志监视状态();
  渲染采集工具状态();
  渲染任务刷取状态();
  渲染解谜任务状态();
  渲染批量入侵状态();
  渲染感染模块状态();
  渲染运行中脚本状态();
});

// 和 chrome.tabs.query 结果里的 {id, url} 形状保持一致，这样下面所有用到 tab.id/tab.url 的
// 调用点在两种上下文里都不用改——在被注入的场景下，这个"标签页"就是当前页面本身。
async function 获取当前标签页() {
  if (是否有标签页API) {
    const [标签页] = await chrome.tabs.query({ active: true, currentWindow: true });
    return 标签页;
  }
  const 标签页ID = await new Promise((完成) => {
    chrome.runtime.sendMessage({ action: "getTabId" }, (响应) => 完成(响应?.tabId));
  });
  return { id: 标签页ID, url: location.href };
}

function 跳转标签页(标签页ID, 网址) {
  if (是否有标签页API) {
    chrome.tabs.update(标签页ID, { url: 网址 });
  } else {
    location.href = 网址;
  }
}

function 刷新标签页(标签页ID) {
  if (是否有标签页API) {
    chrome.tabs.reload(标签页ID);
  } else {
    location.reload();
  }
}

function 创建后台闹钟(名称, 选项) {
  if (是否有标签页API) {
    chrome.alarms.create(名称, 选项);
  } else {
    chrome.runtime.sendMessage({ action: "createAlarm", payload: { name: 名称, options: 选项 } });
  }
}

function 清除后台闹钟(名称) {
  if (是否有标签页API) {
    chrome.alarms.clear(名称);
  } else {
    chrome.runtime.sendMessage({ action: "clearAlarm", payload: { name: 名称 } });
  }
}

function 设置工具栏徽标文字(文字) {
  if (是否有标签页API) {
    chrome.action.setBadgeText({ text: 文字 });
  } else {
    chrome.runtime.sendMessage({ action: "setBadgeText", payload: { text: 文字 } });
  }
}

// 始终使用 data: URL（而不是 blob: URL）——在内容脚本的页面上下文里创建的 blob，background.js
// 代为下载时是没法解引用的。
function 下载文本文件(文字, MIME类型, 文件名) {
  const 网址 = `data:${MIME类型};charset=utf-8,${encodeURIComponent(文字)}`;
  if (是否有标签页API) {
    chrome.downloads.download({ url: 网址, filename: 文件名 });
  } else {
    chrome.runtime.sendMessage({ action: "download", payload: { url: 网址, filename: 文件名 } });
  }
}

// 每行一个IP（也接受逗号分隔），空行会被忽略。
function 解析IP列表(文字) {
  return 文字
    .split(/[\n,]/)
    .map((项) => 项.trim())
    .filter(Boolean);
}

// 把 "50mb" / "1.2 GB" 这样的体积文字解析成MB。
function 解析体积为MB(文字) {
  const 匹配 = 文字.trim().match(/([\d.]+)\s*(GB|MB)/i);
  if (!匹配) return null;
  const 数值 = parseFloat(匹配[1]);
  return 匹配[2].toUpperCase() === "GB" ? 数值 * 1024 : 数值;
}

// 每行一条 "<名称> <体积>"——体积（必须以 mb/gb 结尾）是从末尾匹配的，因为名称本身可能带空格。
function 解析病毒选项列表(文字) {
  const 选项列表 = [];
  for (const 原始行 of 文字.split("\n")) {
    const 行 = 原始行.trim();
    if (!行) continue;
    const 匹配 = 行.match(/^(.*\S)\s+([\d.]+\s*(?:mb|gb))$/i);
    if (!匹配) continue;
    const 体积MB = 解析体积为MB(匹配[2]);
    if (体积MB == null) continue;
    选项列表.push({ name: 匹配[1], sizeMb: 体积MB });
  }
  return 选项列表;
}

// 共用的银行/服务器IP，只在这里设置一次，其余地方（Mission 任务刷取的自转账银行下拉框、
// Infection 感染模块的 Download Center）都引用这里，而不是每个模块各自重复输入或写死。
// 每个字段都是可选的——保存永远不会因为缺一项就卡住，真正需要某个IP的模块会在缺失时自己
// 提示回这里补上。
const 初始设置IP字段 = [
  { key: "downloadCenter", id: "setupIpDownloadCenter", label: "Download Center" },
  { key: "firstInternational", id: "setupIpFirstInternational", label: "First International Bank" },
  { key: "hebc", id: "setupIpHebc", label: "HEBC" },
  { key: "americanExpense", id: "setupIpAmericanExpense", label: "American Expense" },
  { key: "swissInternationalBank", id: "setupIpSwissInternationalBank", label: "Swiss International Bank" },
  { key: "ultimateBank", id: "setupIpUltimateBank", label: "Ultimate Bank" },
];
const 银行标签 = Object.fromEntries(
  初始设置IP字段.filter((字段) => 字段.key !== "downloadCenter").map((字段) => [字段.key, 字段.label])
);

async function 加载初始设置IP() {
  const { setupIps } = await chrome.storage.local.get("setupIps");
  const IP映射 = setupIps || {};
  for (const 字段 of 初始设置IP字段) {
    document.getElementById(字段.id).value = IP映射[字段.key] || "";
  }
  const 已设置数量 = 初始设置IP字段.filter((字段) => IP映射[字段.key]).length;
  document.getElementById("setupStatus").textContent = `已设置 ${已设置数量}/${初始设置IP字段.length} 个IP`;
}

document.getElementById("setupSaveBtn").addEventListener("click", async () => {
  const IP映射 = {};
  for (const 字段 of 初始设置IP字段) {
    const 数值 = document.getElementById(字段.id).value.trim();
    if (数值) IP映射[字段.key] = 数值;
  }
  await chrome.storage.local.set({ setupIps: IP映射 });
  记录日志("初始设置已保存。");
  加载初始设置IP();
});

// 渲染后台记录下来的最近几条历史记录（shared.js 的 追加历史记录）——这样弹窗中途关闭再打开
// 也不会丢失运行状态。
function 格式化历史记录(历史记录) {
  if (!历史记录 || 历史记录.length === 0) return "";
  // shared.js 的 追加历史记录 本来就最多保留15条——全部显示而不是只显示最近5条，反正数据
  // 已经在那了，不用额外存储成本。
  const 行列表 = 历史记录.slice(0, 15).map((条目) => `[${new Date(条目.at).toLocaleTimeString()}] ${条目.msg}`);
  return "\n\n最近记录：\n" + 行列表.join("\n");
}

async function 渲染研究任务状态() {
  const { researchRunner: 运行器 } = await chrome.storage.local.get("researchRunner");
  const 元素 = document.getElementById("researchStatus");
  if (!运行器) {
    元素.textContent = "空闲";
    return;
  }
  const 行列表 = [];
  if (运行器.running) {
    行列表.push(`运行中：${运行器.step}`);
  } else if (运行器.pausedReason) {
    行列表.push(`已暂停：${运行器.pausedReason}`);
  } else if (运行器.stuckAt) {
    行列表.push(`卡住于：${运行器.stuckAt}`);
  } else {
    行列表.push(`已停止（${运行器.step || "空闲"}）`);
  }
  行列表.push(`已完成轮数：${运行器.loopsThisRun || 0}/${运行器.researchLoopCount || 1}`);
  元素.textContent = 行列表.join("\n") + 格式化历史记录(运行器.history);
}

const 研究软件名称输入框 = document.getElementById("researchSoftwareName");
const 删除旧版本复选框 = document.getElementById("researchDeleteOldVersion");
const 研究收款切换按钮 = document.getElementById("researchCollectToggleBtn");

// 单纯的点击切换（和 折叠按钮元素 自己的 innerHTML 切换是同一套做法），而不是复选框——
// dataset.on 才是真正的数据来源，任何需要读取当前值的地方都直接读它。
function 设置研究收款切换(开启) {
  研究收款切换按钮.dataset.on = 开启 ? "1" : "";
  研究收款切换按钮.textContent = 开启 ? "✅" : "$";
}
研究收款切换按钮.addEventListener("click", () => {
  设置研究收款切换(研究收款切换按钮.dataset.on !== "1");
});

async function 加载研究设置() {
  const { researchConfig } = await chrome.storage.local.get("researchConfig");
  研究软件名称输入框.value = researchConfig?.name || "";
  document.getElementById("researchCycles").value = researchConfig?.cycles || "1";
  document.getElementById("researchLoopCount").value = researchConfig?.loopCount || "1";
  删除旧版本复选框.checked = !!researchConfig?.deleteOldVersion;
  设置研究收款切换(!!researchConfig?.collectMoney);
  document.getElementById("researchConfigStatus").textContent = researchConfig?.name
    ? `已保存：${researchConfig.name}`
    : "未设置";
}

document.getElementById("researchSaveBtn").addEventListener("click", async () => {
  const 名称 = 研究软件名称输入框.value.trim();
  await chrome.storage.local.set({
    researchConfig: {
      name: 名称,
      cycles: document.getElementById("researchCycles").value,
      loopCount: document.getElementById("researchLoopCount").value,
      deleteOldVersion: 删除旧版本复选框.checked,
      collectMoney: 研究收款切换按钮.dataset.on === "1",
    },
  });
  记录日志("研究设置已保存。");
  加载研究设置();
});

document.getElementById("researchStartBtn").addEventListener("click", async () => {
  const 研究软件名称 = 研究软件名称输入框.value.trim();
  if (!研究软件名称) {
    记录日志("开始之前请先填写要研究的软件名称。");
    return;
  }
  const 研究周期数 = parseFloat(document.getElementById("researchCycles").value) || 1;
  const 研究循环次数 = parseFloat(document.getElementById("researchLoopCount").value) || 1;
  const 研究删除旧版本 = 删除旧版本复选框.checked;
  const 研究收款 = 研究收款切换按钮.dataset.on === "1";
  const 标签页 = await 获取当前标签页();
  const { researchRunner: 上一次运行器 } = await chrome.storage.local.get("researchRunner");
  await chrome.storage.local.set({
    researchRunner: {
      running: true,
      tabId: 标签页.id,
      step: "goto_university_list",
      stuckAt: null,
      researchSoftwareName: 研究软件名称,
      researchCycles: 研究周期数,
      researchLoopCount: 研究循环次数,
      researchDeleteOldVersion: 研究删除旧版本,
      researchCollectMoney: 研究收款,
      loopsThisRun: 0,
      completedCount: 上一次运行器?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  跳转标签页(标签页.id, "https://hackerwars.io/university.php");
  记录日志(`研究任务已开始——正在搜索 "${研究软件名称}"（共 ${研究循环次数} 轮）。`);
  渲染研究任务状态();
});

document.getElementById("researchStopBtn").addEventListener("click", async () => {
  const { researchRunner: 运行器 } = await chrome.storage.local.get("researchRunner");
  if (!运行器) return;
  await chrome.storage.local.set({ researchRunner: { ...运行器, running: false } });
  记录日志("研究任务已停止。");
  渲染研究任务状态();
});

async function 渲染收款任务状态() {
  const { collectRunner: 运行器 } = await chrome.storage.local.get("collectRunner");
  const 元素 = document.getElementById("collectStatus");
  if (!运行器) {
    元素.textContent = "空闲";
    return;
  }
  const 行列表 = [];
  if (运行器.running) {
    行列表.push(`运行中：${运行器.step}`);
  } else if (运行器.stuckAt) {
    行列表.push(`卡住于：${运行器.stuckAt}`);
  } else {
    行列表.push(`已停止（${运行器.step || "空闲"}）`);
  }
  行列表.push(`已完成收款次数：${运行器.completedCount || 0}`);
  元素.textContent = 行列表.join("\n") + 格式化历史记录(运行器.history);
}

const 收款最短间隔分钟 = 10.5;
const 收款默认间隔分钟 = 60;
const 收款间隔输入框 = document.getElementById("collectIntervalMinutes");

async function 加载收款间隔() {
  const { collectIntervalMinutes } = await chrome.storage.local.get("collectIntervalMinutes");
  收款间隔输入框.value = collectIntervalMinutes || 收款默认间隔分钟;
}

document.getElementById("collectStartBtn").addEventListener("click", async () => {
  let 分钟数 = parseFloat(收款间隔输入框.value);
  if (!分钟数 || 分钟数 < 收款最短间隔分钟) {
    分钟数 = 收款最短间隔分钟;
    收款间隔输入框.value = 分钟数;
    记录日志(`收款间隔不能低于 ${收款最短间隔分钟} 分钟（站点冷却时间限制）——已改用该值。`);
  }
  await chrome.storage.local.set({ collectIntervalMinutes: 分钟数 });

  const 标签页 = await 获取当前标签页();
  const { collectRunner: 上一次运行器 } = await chrome.storage.local.get("collectRunner");
  await chrome.storage.local.set({
    collectRunner: {
      running: true,
      tabId: 标签页.id,
      step: "goto_list",
      stuckAt: null,
      collectIntervalMs: 分钟数 * 60 * 1000,
      completedCount: 上一次运行器?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  跳转标签页(标签页.id, "https://hackerwars.io/list.php?action=collect");
  记录日志(`收款任务已开始（每 ${分钟数} 分钟一次）。`);
  渲染收款任务状态();
});

document.getElementById("collectStopBtn").addEventListener("click", async () => {
  const { collectRunner: 运行器 } = await chrome.storage.local.get("collectRunner");
  if (!运行器) return;
  await chrome.storage.local.set({ collectRunner: { ...运行器, running: false } });
  记录日志("收款任务已停止。");
  渲染收款任务状态();
});

async function 渲染声望清除状态() {
  const { repKillRunner: 运行器 } = await chrome.storage.local.get("repKillRunner");
  const 元素 = document.getElementById("repKillStatus");
  if (!运行器) {
    元素.textContent = "空闲";
    return;
  }
  const 行列表 = [];
  if (运行器.running) {
    行列表.push(`运行中：${运行器.step}`);
  } else if (运行器.stuckAt) {
    行列表.push(`卡住于：${运行器.stuckAt}`);
  } else {
    行列表.push(`已停止（${运行器.step || "空闲"}）`);
  }
  行列表.push(`已清除任务数：${运行器.completedCount || 0}`);
  元素.textContent = 行列表.join("\n") + 格式化历史记录(运行器.history);
}

document.getElementById("repKillStartBtn").addEventListener("click", async () => {
  const 标签页 = await 获取当前标签页();
  const { repKillRunner: 上一次运行器 } = await chrome.storage.local.get("repKillRunner");
  await chrome.storage.local.set({
    repKillRunner: {
      running: true,
      tabId: 标签页.id,
      step: "goto_missions",
      stuckAt: null,
      completedCount: 上一次运行器?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  跳转标签页(标签页.id, "https://hackerwars.io/missions");
  记录日志("声望清除已开始。");
  渲染声望清除状态();
});

document.getElementById("repKillStopBtn").addEventListener("click", async () => {
  const { repKillRunner: 运行器 } = await chrome.storage.local.get("repKillRunner");
  if (!运行器) return;
  await chrome.storage.local.set({ repKillRunner: { ...运行器, running: false } });
  记录日志("声望清除已停止。");
  渲染声望清除状态();
});

async function 渲染日志监控状态() {
  const { logMonitor: 运行器 } = await chrome.storage.local.get("logMonitor");
  const 元素 = document.getElementById("logMonitorStatus");
  if (!运行器) {
    元素.textContent = "空闲";
    return;
  }
  const 状态文字 = 运行器.running ? "运行中" : "已停止";
  const 上次检查 = 运行器.lastCheck ? new Date(运行器.lastCheck).toLocaleTimeString() : "从未";
  元素.textContent = `${状态文字}（标签页 ${运行器.tabId}）\n上次检查：${上次检查}\n已清空次数：${运行器.clearedCount || 0}`;
}

document.getElementById("logMonitorStartBtn").addEventListener("click", async () => {
  const 标签页 = await 获取当前标签页();
  await chrome.storage.local.set({
    logMonitor: { running: true, tabId: 标签页.id, lastCheck: null, clearedCount: 0 },
  });
  跳转标签页(标签页.id, "https://hackerwars.io/log");
  记录日志("日志监控已开始。");
  渲染日志监控状态();
});

document.getElementById("logMonitorStopBtn").addEventListener("click", async () => {
  const { logMonitor: 运行器 } = await chrome.storage.local.get("logMonitor");
  if (!运行器) return;
  await chrome.storage.local.set({ logMonitor: { ...运行器, running: false } });
  记录日志("已请求停止日志监控（约30秒内生效）。");
  渲染日志监控状态();
});

// chrome.alarms 会把 periodInMinutes 限制在最低1分钟，这已经是能做到的最高检查频率了。
const 后台日志监控间隔分钟 = 1;

async function 渲染后台日志监控状态() {
  const { bgLogMonitor: 运行器 } = await chrome.storage.local.get("bgLogMonitor");
  const 元素 = document.getElementById("bgLogMonitorStatus");
  if (!运行器) {
    元素.textContent = "空闲";
    return;
  }
  const 状态文字 = 运行器.running ? "运行中" : "已停止";
  const 上次检查 = 运行器.lastCheck ? new Date(运行器.lastCheck).toLocaleTimeString() : "从未";
  const 提醒行列表 = 运行器.alertLines || [];
  const 提醒文字 = 提醒行列表.length > 0 ? `\n发现 ${提醒行列表.length} 条新记录：\n${提醒行列表.slice(0, 5).join("\n")}` : "";
  元素.textContent = `${状态文字}\n上次检查：${上次检查}${提醒文字}`;
}

document.getElementById("bgLogMonitorStartBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({
    bgLogMonitor: { running: true, lastCheck: null, knownLines: [], alertLines: [] },
  });
  创建后台闹钟("bgLogMonitor", { periodInMinutes: 后台日志监控间隔分钟 });
  设置工具栏徽标文字("");
  记录日志("后台日志监控已开始——直接轮询 /log，不需要打开标签页。");
  渲染后台日志监控状态();
});

document.getElementById("bgLogMonitorStopBtn").addEventListener("click", async () => {
  const { bgLogMonitor: 运行器 } = await chrome.storage.local.get("bgLogMonitor");
  if (!运行器) return;
  清除后台闹钟("bgLogMonitor");
  await chrome.storage.local.set({ bgLogMonitor: { ...运行器, running: false } });
  记录日志("后台日志监控已停止。");
  渲染后台日志监控状态();
});

document.getElementById("bgLogMonitorClearAlertBtn").addEventListener("click", async () => {
  const { bgLogMonitor: 运行器 } = await chrome.storage.local.get("bgLogMonitor");
  if (!运行器) return;
  await chrome.storage.local.set({ bgLogMonitor: { ...运行器, alertLines: [] } });
  设置工具栏徽标文字("");
  渲染后台日志监控状态();
});

async function 渲染日志监视状态() {
  const { logWatcherRunner: 运行器 } = await chrome.storage.local.get("logWatcherRunner");
  const { gatheredIps: 已采集IP列表 = [] } = await chrome.storage.local.get("gatheredIps");
  const 元素 = document.getElementById("logWatcherStatus");
  if (!运行器) {
    元素.textContent = "空闲";
    return;
  }
  const 状态文字 = 运行器.running ? "运行中" : "已停止";
  const 上次刷新 = 运行器.lastCheck ? new Date(运行器.lastCheck).toLocaleTimeString() : "从未";
  const 本次已采集数 = 已采集IP列表.filter((条目) => 条目.firstSeen >= 运行器.startedAt).length;
  元素.textContent = `${状态文字}（标签页 ${运行器.tabId}）\n上次刷新：${上次刷新}\n本次已采集：${本次已采集数}`;
}

document.getElementById("logWatcherStartBtn").addEventListener("click", async () => {
  const 标签页 = await 获取当前标签页();
  await chrome.storage.local.set({
    logWatcherRunner: { running: true, tabId: 标签页.id, lastCheck: null, startedAt: Date.now() },
  });
  记录日志("日志监视已在当前页面开始。");
  渲染日志监视状态();
});

document.getElementById("logWatcherStopBtn").addEventListener("click", async () => {
  const { logWatcherRunner: 运行器 } = await chrome.storage.local.get("logWatcherRunner");
  if (!运行器) return;
  await chrome.storage.local.set({ logWatcherRunner: { ...运行器, running: false } });
  记录日志("已请求停止日志监视（约3秒内生效）。");
  渲染日志监视状态();
});

async function 渲染日志采集状态() {
  const { gatheredIps: 已采集IP列表 = [] } = await chrome.storage.local.get("gatheredIps");
  document.getElementById("gatherStatus").textContent = `已采集 ${已采集IP列表.length} 个IP`;
}

document.getElementById("gatherExportBtn").addEventListener("click", async () => {
  const { gatheredIps: 已采集IP列表 = [] } = await chrome.storage.local.get("gatheredIps");
  if (已采集IP列表.length === 0) {
    记录日志("目前没有已采集的IP可导出。");
    return;
  }
  下载文本文件(JSON.stringify(已采集IP列表, null, 2), "application/json", `hackerwars-gathered-ips-${Date.now()}.json`);
  记录日志(`已导出 ${已采集IP列表.length} 个已采集IP。`);
});

document.getElementById("gatherClearBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({ gatheredIps: [] });
  记录日志("已清除已采集IP。");
  渲染日志采集状态();
});

// 沿用 softwareGather.js 自己的表格列索引约定——但这里是在弹窗自己的上下文里运行，和内容
// 脚本的上下文是分开的。
// 故意不排序——重要的是采集顺序，而不是IP顺序。以IP字符串为键的对象（永远不会是纯数字看起来
// 的键，所以引擎不会重新按索引排序）本身就保留插入顺序：一个目标第一次被记录时就固定了它的
// 位置，之后再次访问只会原地刷新数据，不会挪动位置。之前按IP字符串排序会打乱这个顺序（按字母
// 排，连数字都不对——"10.x" 会排在 "9.x" 前面），按采集时间排序也有类似问题，因为重新访问会
// 更新那个时间戳，导出时顺序还是会被打乱。
function 构建软件采集CSV(条目集合) {
  const IP列表 = Object.keys(条目集合);
  const 数据块 = IP列表.map((IP地址) => {
    const 行列表 = [IP地址, ...条目集合[IP地址].items.map((项) => `${项.name}, ${项.version}, ${项.size}`)];
    return 行列表.join("\n");
  });
  return 数据块.join("\n\n");
}

async function 渲染采集工具状态() {
  const { softwareGather: 采集配置 } = await chrome.storage.local.get("softwareGather");
  const { softwareGatherEntries: 已采集条目 = {} } = await chrome.storage.local.get("softwareGatherEntries");
  const 状态文字 = 采集配置?.running ? "运行中" : "已停止";
  const 数量 = Object.keys(已采集条目).length;
  document.getElementById("softwareGatherStatus").textContent = `${状态文字}\n已采集 ${数量} 个目标`;
}

document.getElementById("softwareGatherStartBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({ softwareGather: { running: true } });
  记录日志("采集工具已启用——将从每个连接过的目标上抓取软件列表。");
  渲染采集工具状态();
});

document.getElementById("softwareGatherStopBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({ softwareGather: { running: false } });
  记录日志("采集工具已禁用。");
  渲染采集工具状态();
});

document.getElementById("softwareGatherExportBtn").addEventListener("click", async () => {
  const { softwareGatherEntries: 已采集条目 = {} } = await chrome.storage.local.get("softwareGatherEntries");
  const IP列表 = Object.keys(已采集条目);
  if (IP列表.length === 0) {
    记录日志("目前没有已采集的软件可导出。");
    return;
  }
  const CSV文本 = 构建软件采集CSV(已采集条目);
  下载文本文件(CSV文本, "text/csv", `hackerwars-software-gather-${Date.now()}.csv`);
  记录日志(`已从 ${IP列表.length} 个目标导出软件数据。`);
});

document.getElementById("softwareGatherClearBtn").addEventListener("click", async () => {
  await chrome.storage.local.set({ softwareGatherEntries: {} });
  记录日志("已清除已采集软件。");
  渲染采集工具状态();
});

async function 渲染任务刷取状态() {
  const { missionRunner: 运行器 } = await chrome.storage.local.get("missionRunner");
  const 元素 = document.getElementById("missionStatus");
  if (!运行器) {
    元素.textContent = "空闲";
    return;
  }
  const 行列表 = [];
  if (运行器.running) {
    行列表.push(`运行中：${运行器.step}`);
  } else if (运行器.stuckAt) {
    行列表.push(`卡住于：${运行器.stuckAt}`);
  } else {
    行列表.push(`已停止（${运行器.step || "空闲"}）`);
  }
  if (运行器.missionType) 行列表.push(`类型：${运行器.missionType}`);
  if (运行器.victimIp) 行列表.push(`受害者：${运行器.victimIp}`);
  if (运行器.fileName) 行列表.push(`文件：${运行器.fileName} ${运行器.fileVersion || ""}`);
  if (运行器.reward) 行列表.push(`报酬：$${运行器.reward}`);
  行列表.push(`已完成：${运行器.completedCount || 0}`);
  元素.textContent = 行列表.join("\n") + 格式化历史记录(运行器.history);
}

const 任务类型复选框 = {
  delete: document.getElementById("missionTypeDelete"),
  steal: document.getElementById("missionTypeSteal"),
  bank: document.getElementById("missionTypeBank"),
  transfer: document.getElementById("missionTypeTransfer"),
};

async function 加载任务类型筛选() {
  const { missionTypeFilter } = await chrome.storage.local.get("missionTypeFilter");
  const 已启用列表 = missionTypeFilter || ["delete", "steal", "bank", "transfer"];
  for (const [类型, 复选框] of Object.entries(任务类型复选框)) {
    复选框.checked = 已启用列表.includes(类型);
  }
}

function 获取已选任务类型() {
  return Object.entries(任务类型复选框)
    .filter(([, 复选框]) => 复选框.checked)
    .map(([类型]) => 类型);
}

// 银行/转账任务的自转账目的地——单独保存（不放进 missionRunner 里），这样下次打开会自动
// 带回来。存的是选中银行的键，而不是原始IP——真正的IP在渲染状态和任务开始时都是从 Setup
// （setupIps）里现查的，所以之后在 Setup 里改了IP，这里不用重新保存账号就能自动生效。
const 自转账账号输入框 = document.getElementById("selfTransferAccount");
const 自转账银行下拉框 = document.getElementById("selfTransferIp");
const 自转账状态元素 = document.getElementById("selfTransferStatus");

async function 加载自转账账号() {
  const { selfTransferAccount } = await chrome.storage.local.get("selfTransferAccount");
  if (selfTransferAccount) {
    自转账账号输入框.value = selfTransferAccount.account || "";
    自转账银行下拉框.value = selfTransferAccount.bankKey || "";
    const 银行标签文字 = 银行标签[selfTransferAccount.bankKey] || "（未选择银行）";
    const { setupIps } = await chrome.storage.local.get("setupIps");
    const 已解析IP = setupIps?.[selfTransferAccount.bankKey];
    自转账状态元素.textContent = 已解析IP
      ? `已保存：${selfTransferAccount.account} @ ${银行标签文字}（${已解析IP}）`
      : `已保存：${selfTransferAccount.account} @ ${银行标签文字} —— 请先去做初始设置`;
  } else {
    自转账状态元素.textContent = "未设置";
  }
}

document.getElementById("selfTransferSaveBtn").addEventListener("click", async () => {
  const 账号 = 自转账账号输入框.value.trim();
  const 银行键 = 自转账银行下拉框.value;
  if (!账号 || !银行键) {
    记录日志("保存之前请先填写账号#并选择银行。");
    return;
  }
  await chrome.storage.local.set({ selfTransferAccount: { account: 账号, bankKey: 银行键 } });
  记录日志(`自转账账号已保存：${账号} @ ${银行标签[银行键]}`);
  加载自转账账号();
});

document.getElementById("missionStartBtn").addEventListener("click", async () => {
  const 已启用类型 = 获取已选任务类型();
  if (已启用类型.length === 0) {
    记录日志("请先至少选择一种任务类型。");
    return;
  }
  const 需要自转账 = 已启用类型.includes("bank") || 已启用类型.includes("transfer");
  const { selfTransferAccount } = await chrome.storage.local.get("selfTransferAccount");
  if (需要自转账 && (!selfTransferAccount || !selfTransferAccount.bankKey)) {
    记录日志("请先设置并保存自转账账号（银行/转账任务需要用到）。");
    return;
  }
  let 自转账IP = null;
  if (需要自转账) {
    const { setupIps } = await chrome.storage.local.get("setupIps");
    自转账IP = setupIps?.[selfTransferAccount.bankKey];
    if (!自转账IP) {
      记录日志("请先去做初始设置");
      return;
    }
  }
  await chrome.storage.local.set({ missionTypeFilter: 已启用类型 });

  const 标签页 = await 获取当前标签页();
  const { missionRunner: 上一次运行器 } = await chrome.storage.local.get("missionRunner");
  await chrome.storage.local.set({
    missionRunner: {
      running: true,
      tabId: 标签页.id,
      step: "find_mission",
      stuckAt: null,
      enabledTypes: 已启用类型,
      selfTransferAccount: selfTransferAccount?.account,
      selfTransferIp: 自转账IP,
      completedCount: 上一次运行器?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  跳转标签页(标签页.id, "https://hackerwars.io/missions");
  记录日志("任务刷取已开始。");
  渲染任务刷取状态();
});

document.getElementById("missionStopBtn").addEventListener("click", async () => {
  const { missionRunner: 运行器 } = await chrome.storage.local.get("missionRunner");
  if (!运行器) return;
  await chrome.storage.local.set({ missionRunner: { ...运行器, running: false } });
  记录日志("任务刷取已停止。");
  渲染任务刷取状态();
});

const 默认病毒上传最长分钟 = 5;

// --- Infection 感染模块 ---

async function 渲染感染模块状态() {
  const { infection2Runner: 运行器 } = await chrome.storage.local.get("infection2Runner");
  const 元素 = document.getElementById("infection2Status");
  if (!运行器) {
    元素.textContent = "空闲";
    return;
  }
  const 行列表 = [];
  if (运行器.running) {
    行列表.push(`运行中：${运行器.step}`);
  } else if (运行器.stuckAt) {
    行列表.push(`卡住于：${运行器.stuckAt}`);
  } else {
    行列表.push(`已停止（${运行器.step || "空闲"}）`);
  }
  if (运行器.currentIp) 行列表.push(`目标：${运行器.currentIp}`);
  if (运行器.ipQueue) 行列表.push(`剩余：${运行器.ipQueue.length}/${运行器.totalIpCount || 0}`);
  行列表.push(`已感染：${运行器.completedCount || 0}`);
  if (运行器.vddosFile) {
    行列表.push(`vDDoS 已安装：${运行器.vddosInstalledCount || 0}，失败：${运行器.vddosFailedCount || 0}`);
  }
  元素.textContent = 行列表.join("\n") + 格式化历史记录(运行器.history);
}

const 感染模块病毒选项输入框 = document.getElementById("infection2VirusOptions");
const 感染模块选项状态元素 = document.getElementById("infection2OptionsStatus");
const 感染模块最长上传分钟输入框 = document.getElementById("infection2MaxMinutes");
const vDDoS展开按钮 = document.getElementById("infection2VddosRevealBtn");
const vDDoS文件框 = document.getElementById("infection2VddosFileBox");
const vDDoS文件输入框 = document.getElementById("infection2VddosFile");
const 文件夹展开按钮 = document.getElementById("infection2FolderRevealBtn");
const 文件夹框 = document.getElementById("infection2FolderBox");
const 文件夹网址输入框 = document.getElementById("infection2FolderUrl");

// 点击"……点击这里"会把那个链接换成对应的输入框——单向操作（不能再点回去隐藏），和它取代的
// 复选框一样；清除链接缓存 才是把它重置回去的方式。
vDDoS展开按钮.addEventListener("click", () => {
  vDDoS展开按钮.style.display = "none";
  vDDoS文件框.style.display = "";
});
文件夹展开按钮.addEventListener("click", () => {
  文件夹展开按钮.style.display = "none";
  文件夹框.style.display = "";
});

async function 加载感染模块选项() {
  const { infection2VirusOptions, infection2MaxMinutes, infection2VddosFile, infection2FolderUrl } = await chrome.storage.local.get([
    "infection2VirusOptions",
    "infection2MaxMinutes",
    "infection2VddosFile",
    "infection2FolderUrl",
  ]);
  if (infection2VirusOptions && infection2VirusOptions.length > 0) {
    感染模块病毒选项输入框.value = infection2VirusOptions.map((项) => `${项.name} ${项.sizeMb}mb`).join("\n");
    感染模块选项状态元素.textContent = `已保存：${infection2VirusOptions.length} 个选项`;
  } else {
    感染模块选项状态元素.textContent = "未设置——使用内置默认值";
  }
  感染模块最长上传分钟输入框.value = infection2MaxMinutes || 默认病毒上传最长分钟;
  // 有保存的值说明上次已经展开并填过了——直接显示输入框，不用再让用户点一次链接。
  vDDoS文件输入框.value = infection2VddosFile ? `${infection2VddosFile.name} ${infection2VddosFile.sizeMb}mb` : "";
  vDDoS文件框.style.display = infection2VddosFile ? "" : "none";
  vDDoS展开按钮.style.display = infection2VddosFile ? "none" : "";
  文件夹网址输入框.value = infection2FolderUrl || "";
  文件夹框.style.display = infection2FolderUrl ? "" : "none";
  文件夹展开按钮.style.display = infection2FolderUrl ? "none" : "";
}

document.getElementById("infection2SaveBtn").addEventListener("click", async () => {
  const 选项列表 = 解析病毒选项列表(感染模块病毒选项输入框.value);
  if (选项列表.length === 0) {
    记录日志('未能解析出有效的病毒选项——每行都需要名称和体积（例如 "Small DDoS.vddos 50mb"）。');
    return;
  }
  const 最长分钟 = parseInt(感染模块最长上传分钟输入框.value, 10) || 默认病毒上传最长分钟;

  // 启用/禁用现在就看"框里有没有值"——空框（或者还没展开过）就代表 vDDoS/文件夹功能是关闭的，
  // 和以前用复选框未勾选是一个意思。
  const vDDoS文本 = vDDoS文件输入框.value.trim();
  let vDDoS文件 = null;
  if (vDDoS文本) {
    const 已解析结果 = 解析病毒选项列表(vDDoS文本);
    if (已解析结果.length === 0) {
      记录日志('vDDoS 文件解析失败——需要名称和体积（例如 "KnockKnockMF.vddos 25mb"）。');
      return;
    }
    vDDoS文件 = 已解析结果[0];
  }
  const 文件夹网址 = 文件夹网址输入框.value.trim();

  await chrome.storage.local.set({
    infection2VirusOptions: 选项列表,
    infection2MaxMinutes: 最长分钟,
    infection2VddosFile: vDDoS文件,
    infection2FolderUrl: 文件夹网址,
  });
  记录日志(
    `已保存 ${选项列表.length} 个病毒选项，最长上传时间 ${最长分钟} 分钟` +
      `${vDDoS文件 ? `，vDDoS：${vDDoS文件.name}` : ""}${文件夹网址 ? "，已设置文件夹网址" : ""}。`
  );
  加载感染模块选项();
});

function i2应用预设(名称, 文本) {
  if (感染模块病毒选项输入框.value.trim()) {
    记录日志(`病毒选项框里已经有内容——请先清空再加载 ${名称} 预设。`);
    return;
  }
  感染模块病毒选项输入框.value = 文本;
  记录日志(`已加载 ${名称} 预设——点击"保存病毒选项"以应用。`);
}

// 这份数据只在私有版某个不公开的模块里定义过，这里直接内置一份副本，让 Infection 感染模块
// 的三个预设按钮能独立工作，不依赖任何未随本仓库一起发布的文件。
const 病毒预设 = {
  spam: "Super Spam.vspam 1gb\nAdvanced Spam.vspam 236mb\nDecent Spam.vspam 36mb",
  warez: "Super Warez.vwarez 1gb\nAdvanced Warez.vwarez 236mb\nDecent Warez.vwarez 36mb",
  miner: "Super Miner.vminer 1.7gb\nAdvanced Miner.vminer 413mb\nDecent Miner.vminer 63mb",
};

document.getElementById("infection2PresetSpamBtn").addEventListener("click", () => i2应用预设("Spam", 病毒预设.spam));
document.getElementById("infection2PresetWarezBtn").addEventListener("click", () => i2应用预设("Warez", 病毒预设.warez));
document.getElementById("infection2PresetMinerBtn").addEventListener("click", () => i2应用预设("Miner", 病毒预设.miner));

document.getElementById("infection2ClearCacheBtn").addEventListener("click", async () => {
  感染模块病毒选项输入框.value = "";
  vDDoS文件输入框.value = "";
  vDDoS文件框.style.display = "none";
  vDDoS展开按钮.style.display = "";
  文件夹网址输入框.value = "";
  文件夹框.style.display = "none";
  文件夹展开按钮.style.display = "";
  await chrome.storage.local.remove([
    "infection2VirusOptions",
    "infection2VddosFile",
    "infection2FolderUrl",
    "infection2LinkCache",
  ]);
  加载感染模块选项();
  const { setupIps } = await chrome.storage.local.get("setupIps");
  if (!setupIps?.downloadCenter) {
    记录日志("请先去做初始设置");
  } else {
    记录日志(`已清除病毒选项和缓存链接——Download Center 的IP已设置（${setupIps.downloadCenter}）。`);
  }
});

document.getElementById("infection2StartBtn").addEventListener("click", async () => {
  const 标签页 = await 获取当前标签页();
  const { infection2Runner: 上一次运行器 } = await chrome.storage.local.get("infection2Runner");
  const {
    infection2VirusOptions: 病毒选项,
    infection2MaxMinutes: vDDoS最长分钟,
    infection2VddosFile: vDDoS文件,
    infection2FolderUrl: 文件夹网址,
    infection2LinkCache: 链接缓存,
    setupIps,
  } = await chrome.storage.local.get([
    "infection2VirusOptions",
    "infection2MaxMinutes",
    "infection2VddosFile",
    "infection2FolderUrl",
    "infection2LinkCache",
    "setupIps",
  ]);
  const 手动IP列表 = 解析IP列表(document.getElementById("infection2IpList").value);
  const 链接解析后步骤 = 手动IP列表.length > 0 ? "goto_target" : "goto_hdb";

  // 如果自上次解析链接以来，病毒列表、vDDoS 文件、文件夹设置都没有变化，就跳过连接/登录/
  // 软件页/文件夹这一整套流程（见 infection2.js）——这种情况下不会访问 Download Center 的
  // IP，所以就算 Setup 里没设置也没关系。
  const 选项键 = JSON.stringify({
    options: 病毒选项 || [],
    vddosFile: vDDoS文件 || null,
    folderUrl: 文件夹网址 || "",
  });
  const 可复用缓存 = 链接缓存 && 链接缓存.optionsKey === 选项键;
  if (!可复用缓存 && !setupIps?.downloadCenter) {
    记录日志("请先去做初始设置");
    return;
  }

  const 基础状态 = {
    running: true,
    tabId: 标签页.id,
    stuckAt: null,
    virusOptions: 病毒选项 || [],
    vddosMaxMinutes: vDDoS最长分钟 || 默认病毒上传最长分钟,
    downloadCenterIp: setupIps?.downloadCenter,
    vddosFile: vDDoS文件 || null,
    folderUrl: 文件夹网址 || "",
    completedCount: 上一次运行器?.completedCount || 0,
    vddosInstalledCount: 上一次运行器?.vddosInstalledCount || 0,
    vddosFailedCount: 上一次运行器?.vddosFailedCount || 0,
    startedAt: Date.now(),
  };
  if (手动IP列表.length > 0) {
    基础状态.ipQueue = 手动IP列表;
    基础状态.totalIpCount = 手动IP列表.length;
  }

  if (可复用缓存) {
    基础状态.step = 链接解析后步骤;
    基础状态.virusOptionsResolved = 链接缓存.resolvedVirus;
    基础状态.vddosFileResolved = 链接缓存.resolvedVddos;
    记录日志(`感染模块已开始（复用缓存链接）${手动IP列表.length > 0 ? `，共 ${手动IP列表.length} 个手动IP` : "，自动抓取 /hdb"}。`);
  } else {
    基础状态.step = "goto_link_resolve_ip";
    基础状态.virusOptionsResolved = [];
    基础状态.vddosFileResolved = null;
    记录日志(`感染模块已开始（先解析链接）${手动IP列表.length > 0 ? `，共 ${手动IP列表.length} 个手动IP` : ""}。`);
  }

  await chrome.storage.local.set({ infection2Runner: 基础状态 });
  跳转标签页(标签页.id, "https://hackerwars.io/internet");
  渲染感染模块状态();
});

document.getElementById("infection2StopBtn").addEventListener("click", async () => {
  const { infection2Runner: 运行器 } = await chrome.storage.local.get("infection2Runner");
  if (!运行器) return;
  await chrome.storage.local.set({ infection2Runner: { ...运行器, running: false } });
  记录日志("感染模块已停止。");
  渲染感染模块状态();
});

async function 渲染解谜任务状态() {
  const { puzzleRunner: 运行器 } = await chrome.storage.local.get("puzzleRunner");
  const 元素 = document.getElementById("puzzleStatus");
  if (!运行器) {
    元素.textContent = "空闲";
    return;
  }
  const 行列表 = [];
  if (运行器.running) {
    行列表.push(`运行中：${运行器.step}`);
  } else if (运行器.pausedReason) {
    行列表.push(`已暂停：${运行器.pausedReason}`);
  } else if (运行器.stuckAt) {
    行列表.push(`卡住于：${运行器.stuckAt}`);
  } else {
    行列表.push(`已停止（${运行器.step || "空闲"}）`);
  }
  if (运行器.puzzleNumber) 行列表.push(`题号：${运行器.puzzleNumber}`);
  if (运行器.currentIp) 行列表.push(`目标：${运行器.currentIp}`);
  行列表.push(`已解出：${运行器.completedCount || 0}`);
  元素.textContent = 行列表.join("\n") + 格式化历史记录(运行器.history);
}

document.getElementById("puzzleStartBtn").addEventListener("click", async () => {
  const 标签页 = await 获取当前标签页();
  const { puzzleRunner: 上一次运行器 } = await chrome.storage.local.get("puzzleRunner");
  const 起始题号输入 = document.getElementById("puzzleStartNumber").value.trim();
  const 起始题号 = 起始题号输入 === "" ? 1 : Math.max(1, parseInt(起始题号输入, 10) || 1);
  const 续接IP = document.getElementById("puzzleResumeIp").value.trim();
  await chrome.storage.local.set({
    puzzleRunner: {
      running: true,
      tabId: 标签页.id,
      // 填了续接IP：直接跳到那台机器的"hack"步骤——之后 hack -> crc -> install -> riddle
      // 都会照常从那里继续走。不填：就在当前加载的页面上找"First Puzzle"链接（全新账号流程）。
      step: 续接IP ? "hack" : "find_first_puzzle",
      stuckAt: null,
      pausedReason: null,
      puzzleNumber: 起始题号,
      completedCount: 上一次运行器?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  if (续接IP) {
    跳转标签页(标签页.id, `https://hackerwars.io/internet?ip=${续接IP}`);
  } else {
    刷新标签页(标签页.id);
  }
  记录日志(`解谜任务已从第 ${起始题号} 题开始${续接IP ? `，目标 ${续接IP}` : ""}。`);
  渲染解谜任务状态();
});

document.getElementById("puzzleStopBtn").addEventListener("click", async () => {
  const { puzzleRunner: 运行器 } = await chrome.storage.local.get("puzzleRunner");
  if (!运行器) return;
  await chrome.storage.local.set({ puzzleRunner: { ...运行器, running: false } });
  记录日志("解谜任务已停止。");
  渲染解谜任务状态();
});

// 对应两种不同的暂停状态（见 puzzle.js/shared.js）：一种是有意的暂停（pausedReason——等你去
// 解题），会设置 continueRequested，让暂停步骤检测到之后继续往下走；另一种是卡住超时
// （stuckAt——该步骤的 find() 什么都没找到），只需清掉 stuckAt，让同一个步骤照着当前页面重新
// 跑一遍，而不是像 Start 那样强制整个重来（回到 find_first_puzzle / 第1题）。
document.getElementById("puzzleContinueBtn").addEventListener("click", async () => {
  const { puzzleRunner: 运行器 } = await chrome.storage.local.get("puzzleRunner");
  if (!运行器 || 运行器.running || (!运行器.pausedReason && !运行器.stuckAt)) {
    记录日志("解谜任务目前不在等待继续的状态。");
    return;
  }
  await chrome.storage.local.set({
    puzzleRunner: { ...运行器, running: true, continueRequested: true, pausedReason: null, stuckAt: null },
  });
  刷新标签页(运行器.tabId);
  记录日志("正在继续解谜任务。");
  渲染解谜任务状态();
});

async function 渲染批量入侵状态() {
  const { massHackRunner: 运行器 } = await chrome.storage.local.get("massHackRunner");
  const 元素 = document.getElementById("massHackStatus");
  if (!运行器) {
    元素.textContent = "空闲";
    return;
  }
  const 行列表 = [];
  if (运行器.running) {
    行列表.push(`运行中：${运行器.step}`);
  } else if (运行器.stuckAt) {
    行列表.push(`卡住于：${运行器.stuckAt}`);
  } else {
    行列表.push(`已停止（${运行器.step || "空闲"}）`);
  }
  if (运行器.currentIp) 行列表.push(`目标：${运行器.currentIp}`);
  if (运行器.ipQueue) 行列表.push(`剩余：${运行器.ipQueue.length}/${运行器.totalIpCount || 0}`);
  行列表.push(`已入侵：${运行器.completedCount || 0}`);
  元素.textContent = 行列表.join("\n") + 格式化历史记录(运行器.history);
}

document.getElementById("massHackStartBtn").addEventListener("click", async () => {
  const IP列表 = 解析IP列表(document.getElementById("massHackIpList").value);
  if (IP列表.length === 0) {
    记录日志("请先输入至少一个IP。");
    return;
  }
  const 标签页 = await 获取当前标签页();
  const { massHackRunner: 上一次运行器 } = await chrome.storage.local.get("massHackRunner");
  await chrome.storage.local.set({
    massHackRunner: {
      running: true,
      tabId: 标签页.id,
      step: "goto_target",
      stuckAt: null,
      ipQueue: IP列表,
      totalIpCount: IP列表.length,
      completedCount: 上一次运行器?.completedCount || 0,
      startedAt: Date.now(),
    },
  });
  跳转标签页(标签页.id, "https://hackerwars.io/internet");
  记录日志(`批量入侵已开始，共 ${IP列表.length} 个IP。`);
  渲染批量入侵状态();
});

document.getElementById("massHackStopBtn").addEventListener("click", async () => {
  const { massHackRunner: 运行器 } = await chrome.storage.local.get("massHackRunner");
  if (!运行器) return;
  await chrome.storage.local.set({ massHackRunner: { ...运行器, running: false } });
  记录日志("批量入侵已停止。");
  渲染批量入侵状态();
});

chrome.storage.onChanged.addListener((变更, 区域) => {
  // 扩展被重新加载/更新后，每个已打开标签页的内容脚本上下文都会失效——chrome.runtime.id 会
  // 变成 undefined，之后任何 chrome.* 调用都会抛出"Extension context invalidated"这种没人
  // 接住的异常。这里直接安静退出。
  if (!chrome.runtime?.id) return;
  if (区域 !== "local") return;
  if (变更.collectRunner) 渲染收款任务状态();
  if (变更.repKillRunner) 渲染声望清除状态();
  if (变更.logMonitor) 渲染日志监控状态();
  if (变更.bgLogMonitor) 渲染后台日志监控状态();
  if (变更.logWatcherRunner) 渲染日志监视状态();
  if (变更.gatheredIps) {
    渲染日志采集状态();
    渲染日志监视状态();
  }
  if (变更.missionRunner) 渲染任务刷取状态();
  if (变更.infection2Runner) 渲染感染模块状态();
  if (变更.researchRunner) 渲染研究任务状态();
  if (变更.puzzleRunner) 渲染解谜任务状态();
  if (变更.massHackRunner) 渲染批量入侵状态();
  if (变更.softwareGather || 变更.softwareGatherEntries) 渲染采集工具状态();
  if (变更.setupIps) {
    加载初始设置IP();
    加载自转账账号();
  }
  if (全部运行器键名.some((键) => 变更[键])) 渲染运行中脚本状态();
});

渲染收款任务状态();
渲染声望清除状态();
渲染日志监控状态();
渲染后台日志监控状态();
渲染日志监视状态();
渲染日志采集状态();
渲染采集工具状态();
渲染任务刷取状态();
渲染感染模块状态();
加载感染模块选项();
渲染研究任务状态();
加载研究设置();
渲染解谜任务状态();
渲染批量入侵状态();
加载任务类型筛选();
加载自转账账号();
加载收款间隔();
加载初始设置IP();
渲染运行中脚本状态();
}

// popup.html 自己的 <script src="popup.js"> 标签放在所有卡片标记之后，所以运行到这里时卡片
// 早就已经在文档里了——可以直接初始化。但如果本文件是作为内容脚本加载的（和 shared.js 等一起
// 加进 manifest.json），会在 overlay.js 注入任何东西之前，于 document_idle 阶段就运行，这时
// #hwauto-card 还不存在；overlay.js 会在自己注入完成后主动调用 初始化弹窗界面()。
if (document.getElementById("hwauto-card")) {
  初始化弹窗界面();
}
