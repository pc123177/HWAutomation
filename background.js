chrome.runtime.onMessage.addListener((请求, 发送者, 发送响应) => {
  if (请求.action === "getTabId") {
    发送响应({ tabId: 发送者.tab?.id });
    return;
  }
  // 放在后台的标签页里，setTimeout 可能被节流/杀掉，所以较长的延迟改走 chrome.alarms——
  // 不管标签页可见与否，它都能唤醒服务工作线程。
  if (请求.action === "scheduleReload") {
    const { tabId: 标签页ID, storageKey: 存储键, step: 步骤, href: 链接, delayMs: 延迟毫秒 } = 请求.payload;
    const 闹钟名称 = JSON.stringify({ tabId: 标签页ID, storageKey: 存储键, step: 步骤, href: 链接 || null });
    chrome.alarms.create(闹钟名称, { delayInMinutes: Math.max(延迟毫秒 / 60000, 0.5) });
    发送响应({ ok: true });
    return;
  }
  // 内容脚本不能直接调用 chrome.tabs.create。
  if (请求.action === "openTab") {
    chrome.tabs.create({ url: 请求.payload.url });
    发送响应({ ok: true });
    return;
  }
  // 悬浮窗（overlay.js 以内容脚本形式注入的 popup.js）自己没有 chrome.alarms、chrome.action、
  // chrome.downloads——都通过这里转发。
  if (请求.action === "createAlarm") {
    chrome.alarms.create(请求.payload.name, 请求.payload.options);
    发送响应({ ok: true });
    return;
  }
  if (请求.action === "clearAlarm") {
    chrome.alarms.clear(请求.payload.name);
    发送响应({ ok: true });
    return;
  }
  if (请求.action === "setBadgeText") {
    chrome.action.setBadgeText({ text: 请求.payload.text });
    发送响应({ ok: true });
    return;
  }
  if (请求.action === "download") {
    chrome.downloads.download({ url: 请求.payload.url, filename: 请求.payload.filename });
    发送响应({ ok: true });
  }
});

// 直接从服务工作线程本身抓取 /log（credentials: "include" 会带上会话 cookie），这样不需要
// 任何标签页停留在 /log 上就能轮询。只标记和上一次快照不同的新增行——第一次检查只是建立
// 基线，不会把目标已有的整份日志都当成"新出现"来报警。
const 后台日志监控闹钟名称 = "bgLogMonitor";

function 解码日志HTML实体(文本) {
  return 文本
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&");
}

// 真正的入侵行长这样："2026-08-23 18:29 - [240.53.223.156] logged in as root"——外部IP登进了
// 我们自己的机器。日志里其他看起来"新出现"的内容都是正常噪音：我们自己的操作
// （"localhost logged in to [1.2.3.4] as root"）、以及我们名下服务器的收入播报
// （"Server [1.2.3.4] mailed X emails, generating $Y."）。直接匹配"root登录"这句措辞（而不是
// 排除"localhost"），能把这些噪音挡在警报之外。
function 是否为入侵行(行) {
  return /\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\]\s*logged in as root/i.test(行);
}

async function 后台检查自身日志() {
  const { bgLogMonitor: 运行器 } = await chrome.storage.local.get("bgLogMonitor");
  if (!运行器 || !运行器.running) return;

  try {
    const 响应 = await fetch("https://hackerwars.io/log", { credentials: "include" });
    const html = await 响应.text();
    const 匹配 = html.match(/<textarea[^>]*name="log"[^>]*>([\s\S]*?)<\/textarea>/i);
    const 文本 = 匹配 ? 解码日志HTML实体(匹配[1]) : "";
    const 行列表 = 文本
      .split(/\r?\n/)
      .map((行) => 行.trim())
      .filter(Boolean);

    const 已有基线 = (运行器.knownLines || []).length > 0;
    const 已知集合 = new Set(运行器.knownLines || []);
    const 新增行列表 = 行列表.filter((行) => !已知集合.has(行));
    const 入侵行列表 = 新增行列表.filter(是否为入侵行);

    const 更新后的状态 = { ...运行器, lastCheck: Date.now(), knownLines: 行列表.slice(0, 200) };
    if (已有基线 && 入侵行列表.length > 0) {
      更新后的状态.lastAlertAt = Date.now();
      更新后的状态.alertLines = 入侵行列表.slice(0, 20);
      chrome.action.setBadgeText({ text: String(入侵行列表.length) });
      chrome.action.setBadgeBackgroundColor({ color: "#d33" });
    }

    await chrome.storage.local.set({ bgLogMonitor: 更新后的状态 });
  } catch (错误) {
    console.log("[HWAuto] background log monitor check failed", 错误);
  }
}

chrome.alarms.onAlarm.addListener((闹钟) => {
  if (闹钟.name === 后台日志监控闹钟名称) {
    后台检查自身日志();
    return;
  }

  let 信息;
  try {
    信息 = JSON.parse(闹钟.name);
  } catch {
    return;
  }
  const { tabId: 标签页ID, storageKey: 存储键, step: 步骤, href: 链接 } = 信息;
  chrome.storage.local.get(存储键, (数据) => {
    const 运行器 = 数据[存储键];
    // 状态已经过时就跳过：已停止、换了别的步骤、或者预约之后标签页被挪作他用。
    if (!运行器 || !运行器.running || 运行器.tabId !== 标签页ID || 运行器.step !== 步骤) return;
    chrome.tabs.get(标签页ID, (标签页) => {
      if (chrome.runtime.lastError || !标签页) return;
      if (链接) {
        chrome.tabs.update(标签页ID, { url: 链接 });
      } else {
        chrome.tabs.reload(标签页ID);
      }
    });
  });
});

// 把用到已关闭标签页的运行器标记为已停止，避免弹窗里一直显示过时的"运行中"状态。
chrome.tabs.onRemoved.addListener((标签页ID) => {
  chrome.storage.local.get(
    [
      "logMonitor",
      "logWatcherRunner",
      "missionRunner",
      "infection2Runner",
      "researchRunner",
      "puzzleRunner",
      "massHackRunner",
      "collectRunner",
      "repKillRunner",
    ],
    ({
      logMonitor,
      logWatcherRunner,
      missionRunner,
      infection2Runner,
      researchRunner,
      puzzleRunner,
      massHackRunner,
      collectRunner,
      repKillRunner,
    }) => {
      const 更新集合 = {};
      if (logMonitor && logMonitor.tabId === 标签页ID && logMonitor.running) {
        更新集合.logMonitor = { ...logMonitor, running: false };
      }
      if (logWatcherRunner && logWatcherRunner.tabId === 标签页ID && logWatcherRunner.running) {
        更新集合.logWatcherRunner = { ...logWatcherRunner, running: false };
      }
      if (missionRunner && missionRunner.tabId === 标签页ID && missionRunner.running) {
        更新集合.missionRunner = { ...missionRunner, running: false };
      }
      if (infection2Runner && infection2Runner.tabId === 标签页ID && infection2Runner.running) {
        更新集合.infection2Runner = { ...infection2Runner, running: false };
      }
      if (researchRunner && researchRunner.tabId === 标签页ID && researchRunner.running) {
        更新集合.researchRunner = { ...researchRunner, running: false };
      }
      if (puzzleRunner && puzzleRunner.tabId === 标签页ID && puzzleRunner.running) {
        更新集合.puzzleRunner = { ...puzzleRunner, running: false };
      }
      if (massHackRunner && massHackRunner.tabId === 标签页ID && massHackRunner.running) {
        更新集合.massHackRunner = { ...massHackRunner, running: false };
      }
      if (collectRunner && collectRunner.tabId === 标签页ID && collectRunner.running) {
        更新集合.collectRunner = { ...collectRunner, running: false };
      }
      if (repKillRunner && repKillRunner.tabId === 标签页ID && repKillRunner.running) {
        更新集合.repKillRunner = { ...repKillRunner, running: false };
      }
      if (Object.keys(更新集合).length) chrome.storage.local.set(更新集合);
    }
  );
});
