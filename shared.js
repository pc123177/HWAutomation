// 通用的 DOM 查找、计时、存储工具，被每个运行器共用。最先加载。

function 获取标签页ID() {
  return new Promise((完成) => {
    chrome.runtime.sendMessage({ action: "getTabId" }, (响应) => 完成(响应?.tabId));
  });
}

// 解析页面上正在倒计时的 "<div class="elapsed">0h:1m:38s</div>"（黑客/安装/上传时出现）。
function 查找倒计时剩余毫秒() {
  const 元素 = document.querySelector(".elapsed");
  if (!元素) return null;
  const 匹配 = 元素.textContent.trim().match(/(\d+)\s*h\s*:\s*(\d+)\s*m\s*:\s*(\d+)\s*s/i);
  if (!匹配) return null;
  const [, 时, 分, 秒] = 匹配.map(Number);
  return ((时 * 60 + 分) * 60 + 秒) * 1000;
}

function 等待条件成立(查找函数, 超时毫秒, 状态, 跳过倒计时检测) {
  return new Promise((完成) => {
    const 开始时间 = Date.now();
    let 已用倒计时等待 = false;
    (function 轮询() {
      const 已耗时 = Date.now() - 开始时间;
      if (已耗时 >= 超时毫秒) return 完成(null);

      // 页面上的 .elapsed 倒计时通常比中途刷新的 DOM 更可靠——但 跳过倒计时检测 用于那些
      // 需要立刻捕获一个无关倒计时的步骤。
      if (!跳过倒计时检测 && !已用倒计时等待) {
        const 倒计时毫秒 = 查找倒计时剩余毫秒();
        if (倒计时毫秒 != null) {
          已用倒计时等待 = true;
          const 延迟 = Math.min(倒计时毫秒 + 2000, 超时毫秒 - 已耗时);
          console.log("[HWAuto] elapsed timer found, pausing", 延迟, "ms before continuing");
          return setTimeout(轮询, 延迟);
        }
      }

      const 结果 = 查找函数(状态);
      if (结果) return 完成(结果);

      setTimeout(轮询, 400);
    })();
  });
}

function 按值查找提交按钮(目标值) {
  for (const 输入项 of document.querySelectorAll('input[type="submit"]')) {
    if (输入项.value.trim().toLowerCase() === 目标值.toLowerCase()) return 输入项;
  }
  return null;
}

function 设置输入框值(元素, 值) {
  元素.value = 值;
  元素.dispatchEvent(new Event("input", { bubbles: true }));
  元素.dispatchEvent(new Event("change", { bubbles: true }));
}

// 文件版本 可以省略，仅按名称匹配（例如用户自配的 vDDoS 选择）。
function 查找软件行链接(文件名, 文件版本, 链接子串) {
  for (const 行 of document.querySelectorAll("tr[id]")) {
    const 单元格 = 行.querySelectorAll("td");
    if (单元格.length < 3) continue;
    if (单元格[1].textContent.trim() === 文件名 && (文件版本 == null || 单元格[2].textContent.trim() === 文件版本)) {
      return 行.querySelector(`a[href*="${链接子串}"]`);
    }
  }
  return null;
}

function 查找软件行(文件名, 文件版本) {
  for (const 行 of document.querySelectorAll("tr[id]")) {
    const 单元格 = 行.querySelectorAll("td");
    if (单元格.length < 3) continue;
    if (单元格[1].textContent.trim() === 文件名 && (文件版本 == null || 单元格[2].textContent.trim() === 文件版本)) return 行;
  }
  return null;
}

// /hdb 页面的 "Copy IPs" 按钮只会写入系统剪贴板，内容脚本读不到——页面表格里本来就有这些
// IP，所以直接从表格里抓。
function 查找HDB地址列表() {
  const IP集合 = new Set();
  for (const 链接 of document.querySelectorAll('a[href*="ip="]')) {
    const 地址 = new URL(链接.href, location.href).searchParams.get("ip");
    if (地址) IP集合.add(地址);
  }
  if (IP集合.size === 0) {
    const IP正则 = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
    let 匹配;
    while ((匹配 = IP正则.exec(document.body.innerText))) IP集合.add(匹配[0]);
  }
  return [...IP集合];
}

// 解析软件页上的 "<span class="small"><span class="green">24.53 GB</span> / <span
// class="red">30 GB</span></span>"——绿色是剩余空间。返回值单位为 MB。
function 查找剩余空间MB() {
  const 容器 = [...document.querySelectorAll("span.small")].find(
    (元素) => 元素.querySelector("span.green") && 元素.querySelector("span.red")
  );
  if (!容器) return null;
  const 匹配 = 容器.querySelector("span.green").textContent.trim().match(/([\d.]+)\s*(GB|MB)/i);
  if (!匹配) return null;
  const 数值 = parseFloat(匹配[1]);
  return 匹配[2].toUpperCase() === "GB" ? 数值 * 1024 : 数值;
}

// 解析 "<span class="small"><strong>100 Mbit</strong> ( 12.5MB/s - 6.25MB/s)</span>"——第二个
// MB/s 数值是上传速度（固定是下载速度的一半，对应 Mbit/8 的下载数值）。
function 查找上传速度MBps() {
  for (const 元素 of document.querySelectorAll("span.small")) {
    const 加粗文字 = 元素.querySelector("strong");
    if (!加粗文字 || !/Mbit/i.test(加粗文字.textContent)) continue;
    const 匹配 = 元素.textContent.match(/([\d.]+)\s*MB\/s\s*-\s*([\d.]+)\s*MB\/s/i);
    if (匹配) return parseFloat(匹配[2]);
  }
  return null;
}

function 查找病毒重复错误() {
  return 查找包含文字的错误提示("You already have installed a virus of this type");
}

function 查找磁盘空间不足错误() {
  return 查找包含文字的错误提示("You do not have enough disk space");
}

// 具体措辞不固定——只要 alert-danger 里出现独立的 "ram" 字样（不分大小写）就算命中，这样
// 即使网站措辞有出入也能识别。
function 查找内存不足错误() {
  for (const 元素 of document.querySelectorAll(".alert-danger")) {
    if (/\bram\b/i.test(元素.textContent)) return 元素;
  }
  return null;
}

function 查找包含文字的错误提示(文字) {
  for (const 元素 of document.querySelectorAll(".alert-danger")) {
    if (元素.textContent.includes(文字)) return 元素;
  }
  return null;
}

// 某个步骤卡住时页面上恰好显示的 .alert-danger 文字（如果有的话）——例如购买确认页上的
// "not enough money"——会一并存入卡住记录，不用重新跑一遍就能看到原因。
function 查找任意错误提示文字() {
  const 元素 = document.querySelector(".alert-danger");
  return 元素 ? 元素.textContent.trim() : null;
}

// 同理，记录步骤卡住时页面上的 .elapsed 文字（如果有）——用来在记录里区分"根本没有
// .elapsed 元素"和"有 .elapsed 但文字对不上 Xh:Ym:Zs 格式"这两种情况，不用重新观察一遍。
function 查找任意倒计时文字() {
  const 元素 = document.querySelector(".elapsed");
  return 元素 ? 元素.textContent.trim() : null;
}

// Select2 v3（class 里带 "select2-chosen" 说明是 v3 而非 v4）始终会把真正的 <select> 留在
// DOM 里（只是隐藏），其外层 .select2-container 的 id 是 "s2id_" 加上该 select 自己的 id——
// 所以可以直接找到并操作真正的元素，不用碰视觉上的下拉组件。
function 查找账号对应的Select2下拉框(账号) {
  // 先看可见的组件——否则一个隐藏的残留实例（比如在弹窗后面，或页面状态没清干净）可能会
  // 抢先匹配到，而不是当前真正在用的那个。
  const 容器列表 = [...document.querySelectorAll(".select2-container")].sort(
    (a, b) => (b.offsetParent !== null) - (a.offsetParent !== null)
  );
  for (const 容器 of 容器列表) {
    if (!容器.id) continue;
    const 下拉框 = document.getElementById(容器.id.replace(/^s2id_/, ""));
    if (!下拉框) continue;
    const 有匹配项 = [...下拉框.options].some((选项) => 选项.value === 账号 || 选项.textContent.includes(账号));
    if (有匹配项) return 下拉框;
  }
  return null;
}

function 设置Select2下拉框值(下拉框, 值) {
  const 选项 = [...下拉框.options].find((项) => 项.value === 值 || 项.textContent.includes(值));
  if (!选项) return false;
  下拉框.value = 选项.value;
  // Select2 靠监听底层 select 的 change 事件来刷新自己的显示——页面上如果加载了 jQuery（跑
  // Select2 本身就需要）就用它的 trigger，否则派发一个普通的 change 事件也能更新 select 的
  // 真实值。
  if (window.jQuery) {
    window.jQuery(下拉框).trigger("change");
  } else {
    下拉框.dispatchEvent(new Event("change", { bubbles: true }));
  }
  return true;
}

function 追加历史记录(运行器, 条目) {
  const 历史记录 = [{ ...条目, at: Date.now() }, ...(运行器.history || [])].slice(0, 15);
  return 历史记录;
}

function 休眠(毫秒) {
  return new Promise((完成) => setTimeout(完成, 毫秒));
}

// 上一次运行可能残留一个卡住的"编辑日志"进程，会悄悄吞掉下一次提交。提交新的之前先把这类
// 进程取消掉。
async function 取消陈旧日志编辑进程() {
  try {
    const 响应 = await fetch("/processes");
    const html = await 响应.text();
    const 文档 = new DOMParser().parseFromString(html, "text/html");
    const 进程ID列表 = [];
    for (const 项 of 文档.querySelectorAll("li")) {
      if (!/Edit log/i.test(项.textContent)) continue;
      const 匹配项 = 项.innerHTML.match(/processBlock(\d+)/);
      if (匹配项) 进程ID列表.push(匹配项[1]);
    }
    for (const 进程ID of 进程ID列表) {
      await fetch(`/processes?pid=${进程ID}&del=1`);
    }
    if (进程ID列表.length > 0) console.log("[HWAuto] canceled", 进程ID列表.length, "stale log-edit process(es)");
  } catch (错误) {
    console.log("[HWAuto] cancelStaleLogEditProcesses failed", 错误);
  }
}

// 只删除包含自身IP的行，其余日志原样保留——比整页清空更不显眼。
function 移除自身IP所在行(文本, 自身IP) {
  if (!自身IP) return "";
  return 文本
    .split(/\r?\n/)
    .filter((行) => !行.includes(自身IP))
    .join("\n");
}

// 让刚加载的页面/AJAX 面板有时间完成初始化，再去探测 DOM。
const 步骤稳定延迟毫秒 = 1000;

// 低于这个值用普通的 setTimeout 重试；超过就走 chrome.alarms（background.js），因为放在
// 后台的标签页里，几分钟以上的计时器并不可靠。
const 重试闹钟阈值毫秒 = 60000;

// 每个步骤机运行器通用的驱动函数。`步骤表[步骤].resolve` 返回
// { next, patch, complete, stop }；`onNotFound` 返回一个重试/暂停指令。
async function 运行步骤引擎(存储键, 步骤表) {
  // 扩展被重新加载/更新后，这个标签页的内容脚本上下文会失效——chrome.runtime.id 会变成
  // undefined，之后任何 chrome.* 调用都会抛错。这里直接安静退出，而不是抛一个没人接住的
  // 异常；除了等标签页自己刷新，也没别的办法恢复。
  if (!chrome.runtime?.id) return;

  const { [存储键]: 运行器 } = await chrome.storage.local.get(存储键);
  if (!运行器 || !运行器.running) return;

  const 标签页ID = await 获取标签页ID();
  if (标签页ID == null || 运行器.tabId !== 标签页ID) return;

  const 步骤定义 = 步骤表[运行器.step];
  if (!步骤定义) return;

  await 休眠(步骤稳定延迟毫秒);

  // 稳定延迟之后再检查一次——等待期间页面或运行器状态可能已经变了。
  const { [存储键]: 当前运行器 } = await chrome.storage.local.get(存储键);
  if (!当前运行器 || !当前运行器.running || 当前运行器.tabId !== 标签页ID || 当前运行器.step !== 运行器.step) return;

  console.log(`[HWAuto] ${存储键}: step`, 运行器.step, "on", location.href);
  // timeout 可以是一个普通数字，也可以是 (状态) => 数字——后者用于那些真实预算取决于运行器
  // 配置的步骤，而不是一个固定常量。
  const 超时毫秒 = typeof 步骤定义.timeout === "function" ? 步骤定义.timeout(运行器) : 步骤定义.timeout;
  const 找到结果 = await 等待条件成立(步骤定义.find, 超时毫秒, 运行器, 步骤定义.skipElapsedGate);
  if (!找到结果) {
    const 重试指令 = 步骤定义.onNotFound?.(运行器);
    if (重试指令) {
      // 有意的暂停（比如等用户操作）——直接停下，不设 stuckAt，也不刷新；由弹窗上的按钮
      // 负责把 running 重新打开。
      if (重试指令.pause) {
        console.log(`[HWAuto] ${存储键}: pausing -`, 重试指令.reason);
        await chrome.storage.local.set({
          [存储键]: {
            ...运行器,
            ...(重试指令.patch || {}),
            running: false,
            stuckAt: null,
            pausedReason: 重试指令.reason,
            lastAction: Date.now(),
            history: 追加历史记录(运行器, { msg: `${运行器.step}: paused - ${重试指令.reason}`, url: location.href }),
          },
        });
        return;
      }

      console.log(`[HWAuto] ${存储键}:`, 重试指令.reason, "- retrying in", 重试指令.retryDelayMs, "ms");
      const 下一步骤 = 重试指令.next || 运行器.step;
      await chrome.storage.local.set({
        [存储键]: {
          ...运行器,
          ...(重试指令.patch || {}),
          step: 下一步骤,
          lastAction: Date.now(),
          history: 追加历史记录(运行器, { msg: `${运行器.step}: ${重试指令.reason}`, url: location.href }),
        },
      });
      if (重试指令.retryDelayMs < 重试闹钟阈值毫秒) {
        setTimeout(async () => {
          const { [存储键]: 最新运行器 } = await chrome.storage.local.get(存储键);
          if (最新运行器 && 最新运行器.running && 最新运行器.tabId === 标签页ID && 最新运行器.step === 下一步骤) {
            if (重试指令.href) {
              location.href = 重试指令.href;
            } else {
              location.reload();
            }
          }
        }, 重试指令.retryDelayMs);
      } else {
        chrome.runtime.sendMessage({
          action: "scheduleReload",
          payload: { tabId: 标签页ID, storageKey: 存储键, step: 下一步骤, href: 重试指令.href || null, delayMs: 重试指令.retryDelayMs },
        });
      }
      return;
    }

    console.log(`[HWAuto] ${存储键}: stuck at`, 运行器.step, "on", location.href);
    const 页面错误文字 = 查找任意错误提示文字();
    const 页面倒计时文字 = 查找任意倒计时文字();
    const 卡住详情 = [页面错误文字 && `page shows: "${页面错误文字}"`, 页面倒计时文字 && `.elapsed on page reads: "${页面倒计时文字}"`]
      .filter(Boolean)
      .join(", ");
    await chrome.storage.local.set({
      [存储键]: {
        ...运行器,
        running: false,
        stuckAt: 运行器.step,
        lastAction: Date.now(),
        history: 追加历史记录(运行器, {
          msg: 卡住详情 ? `stuck: no element found for "${运行器.step}" (${卡住详情})` : `stuck: no element found for "${运行器.step}"`,
          url: location.href,
        }),
      },
    });
    return;
  }

  const 处理结果 = 步骤定义.resolve(找到结果, 运行器) || {};
  const 补丁 = 处理结果.patch || {};
  const 是否完成 = !!处理结果.complete;
  const 是否停止 = !!处理结果.stop;
  // note 让一个步骤把额外信息附到自己的历史记录行上（例如 research.js 把刚读到的原始
  // .elapsed 文字记下来，这样从历史记录里就能确认倒计时检测确实生效了，不用重新观察一遍）。
  const 历史消息 = `${运行器.step}: found + clicked -> ${处理结果.next}${是否完成 ? " (complete)" : ""}${处理结果.note ? ` — ${处理结果.note}` : ""}`;

  const 更新后的运行器 = {
    ...运行器,
    ...补丁,
    step: 处理结果.next,
    stuckAt: null,
    pausedReason: null,
    running: !是否停止,
    lastAction: Date.now(),
    completedCount: 是否完成 ? (运行器.completedCount || 0) + 1 : 运行器.completedCount || 0,
    history: 追加历史记录(运行器, { msg: 历史消息, url: location.href }),
  };

  // 先落盘，再执行点击/跳转——这样一次很快的页面跳转也不会抢在写入前面发生。
  await chrome.storage.local.set({ [存储键]: 更新后的运行器 });

  await 步骤定义.perform(找到结果, 更新后的运行器);

  if (是否停止) {
    console.log(`[HWAuto] ${存储键}: finished, stopping`);
    return;
  }

  // 不 await：如果 perform() 触发了页面跳转，这次调用会被卸载中断，新页面的 main() 会接着
  // 跑下去；否则就在这里正常继续。
  运行步骤引擎(存储键, 步骤表);
}
