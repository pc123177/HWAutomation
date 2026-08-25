// 采集工具：功能开启期间，只要一连上某个目标（破解成功后模拟浏览器地址栏显示的那个状态）
// 就立刻抓取对方的软件清单（名称/版本/大小，只统计带下载选项的）——以IP为键存储，重复
// 访问同一个目标只会刷新它的记录，不会堆积出重复项。导出功能会把已采集的全部内容拍平成
// 一份类CSV文本文件。

// 只有在真正"已连接"到某个目标的页面上（破解成功后模拟浏览器地址栏里显示的那个IP输入框）
// 才会出现——我们自己的 /software 页面上没有，所以永远不会误抓自己的清单。
function 查找已连接IP() {
  const 输入框 = document.querySelector('input.browser-bar[name="ip"]');
  return 输入框 ? 输入框.value.trim() : null;
}

function 是否有下载选项(行) {
  return !!行.querySelector(".he16-download");
}

// 和 findCrcRow/findSoftwareRow（shared.js）同样的单元格下标约定——0是图标，1是名称，
// 2是版本，3是大小（hide-phone 这个class不会把它从DOM里移除），4是操作列。
function 采集软件表格() {
  const 条目列表 = [];
  for (const 行 of document.querySelectorAll("table.table-software tbody tr[id]")) {
    if (!是否有下载选项(行)) continue;
    const 单元格 = 行.querySelectorAll("td");
    if (单元格.length < 4) continue;
    const 名称 = 单元格[1].textContent.trim();
    const 版本 = 单元格[2].textContent.trim();
    const 大小 = 单元格[3].textContent.trim();
    if (!名称) continue;
    条目列表.push({ name: 名称, version: 版本, size: 大小 });
  }
  return 条目列表;
}

async function 收集软件清单() {
  const { softwareGather: 采集配置 } = await chrome.storage.local.get("softwareGather");
  if (!采集配置 || !采集配置.running) return;

  const IP地址 = 查找已连接IP();
  if (!IP地址) return;

  const 条目列表 = 采集软件表格();
  if (条目列表.length === 0) return;

  const { softwareGatherEntries: 已采集条目 = {} } = await chrome.storage.local.get("softwareGatherEntries");
  已采集条目[IP地址] = { items: 条目列表, gatheredAt: Date.now() };
  await chrome.storage.local.set({ softwareGatherEntries: 已采集条目 });
  console.log("[HWAuto] gathered", 条目列表.length, "software item(s) from", IP地址);
}
