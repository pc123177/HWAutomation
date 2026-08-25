// 直接把弹窗的卡片UI注入到页面上，固定悬浮在右下角，而不是只能靠点工具栏图标才能打开。
// 复用 popup.html/popup.js 作为唯一的标记+行为来源（参见 popup.js 里的 initPopupUI()），
// 而不是在这里重复写一遍将近1000行的按钮绑定逻辑——这个文件唯一的职责，就是把那份标记
// 弄到页面上，并给它一个固定定位的容身之处。
(async function 注入悬浮窗() {
  if (document.getElementById("hwauto-overlay-root")) return;

  const 根节点 = document.createElement("div");
  根节点.id = "hwauto-overlay-root";
  根节点.style.position = "fixed";
  根节点.style.bottom = "16px";
  根节点.style.right = "16px";
  根节点.style.zIndex = "999999";
  document.documentElement.appendChild(根节点);

  // 通过隐藏悬浮窗按钮关闭（popup.js）——会一直保持隐藏（但仍然留在DOM里，不用重新拉取）
  // 直到这个存储标记被清掉，而清掉的时机就是下一次打开工具栏弹窗的时候。
  const { overlayHidden: 已隐藏 } = await chrome.storage.local.get("overlayHidden");
  if (已隐藏) {
    根节点.style.display = "none";
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.overlayHidden && !changes.overlayHidden.newValue) {
      根节点.style.display = "";
    }
  });

  let html;
  try {
    // no-store：如果沿用上次扩展重新加载之前缓存的旧版本，其标记会和这里实际运行的
    // popup.js对不上，导致下面每一个 getElementById 查找全部失败、返回null。
    const 响应 = await fetch(chrome.runtime.getURL("popup.html"), { cache: "no-store" });
    html = await 响应.text();
  } catch (错误) {
    console.log("[HWAuto] overlay: failed to load popup.html", 错误);
    return;
  }

  const 文档 = new DOMParser().parseFromString(html, "text/html");

  const 样式元素 = document.createElement("style");
  样式元素.id = "hwauto-overlay-style";
  样式元素.textContent = 文档.querySelector("style")?.textContent || "";
  document.head.appendChild(样式元素);

  const 卡片 = 文档.getElementById("hwauto-card");
  if (!卡片) {
    console.log("[HWAuto] overlay: #hwauto-card not found in popup.html");
    return;
  }
  // 在页面上默认是折叠状态（不像工具栏弹窗那样，你已经是主动点开的了）——只显示标题栏，
  // 点箭头才展开。initPopupUI() 的点击处理逻辑读的是同一个"collapsed" class，所以它不需要
  // 知道这一步发生过。
  卡片.classList.add("collapsed");
  const 折叠按钮 = 卡片.querySelector("#hwauto-collapse-toggle");
  if (折叠按钮) 折叠按钮.innerHTML = "&#9650;";
  根节点.appendChild(卡片);

  // popup.js 也作为内容脚本加载，在 manifest.json 里排在这个文件前面，所以此时
  // initPopupUI 已经是全局可用的了——只是还没执行，因为直到上面那一行之前，
  // #hwauto-card 在文档里都还不存在。
  if (typeof initPopupUI === "function") {
    initPopupUI();
  } else {
    console.log("[HWAuto] overlay: initPopupUI is not defined — check manifest.json script order");
  }
})();
