// 感染模块：IP收集/病毒适配逻辑，使用 shared.js 里的全局辅助函数
// （查找剩余空间MB、查找上传速度MBps、查找软件行系列、查找病毒/磁盘/内存错误系列、
// 查找HDB地址列表、取消陈旧日志编辑进程、获取日志文本框、获取编辑日志按钮、获取自身IP、
// 移除自身IP所在行），而不是重新定义一遍。支持一个可选的、单独命名的 vDDoS 文件，会在每个
// 目标上主病毒装完*之后*再装；支持一次可选的、针对 Download Center 某个文件夹的二次
// 链接解析（和普通 /software 页面的结果合并，而不是替换掉它）；整个IP列表跑完之后还会把
// 自己的 /log 彻底清空。

// 扫描当前加载的软件页面，找出和配置的病毒列表（以及启用时的单个 vDDoS 文件）名称匹配的
// 上传链接。会先对 /software 调用一次；如果配置了文件夹URL，还会再对文件夹调用一次——结果
// 按名称合并，这样一个被归档进文件夹里的病毒不会因为不在普通列表上就被漏掉。
function i2解析页面链接(病毒选项列表, vDDoS文件) {
  const 已解析病毒列表 = [];
  for (const 选项 of 病毒选项列表) {
    const 链接 = 查找软件行链接(选项.name, null, "cmd=up");
    if (链接) 已解析病毒列表.push({ ...选项, uploadUrl: 链接.href });
  }
  let 已解析vDDoS = null;
  if (vDDoS文件) {
    const 链接 = 查找软件行链接(vDDoS文件.name, null, "cmd=up");
    if (链接) 已解析vDDoS = { ...vDDoS文件, uploadUrl: 链接.href };
  }
  return { resolvedVirus: 已解析病毒列表, resolvedVddos: 已解析vDDoS };
}

// 把一次新扫描的结果合并进已经解析好的列表——按名称去重，先到先得（/software 那一遍先跑，
// 所以在那边解析到的名称不会被文件夹里同名的一行覆盖掉）。
function i2合并已解析病毒列表(已有列表, 新增列表) {
  const 按名称索引 = new Map(已有列表.map((项) => [项.name, 项]));
  for (const 选项 of 新增列表) {
    if (!按名称索引.has(选项.name)) 按名称索引.set(选项.name, 选项);
  }
  return [...按名称索引.values()];
}

const INFECTION2_STEPS = {
  goto_link_resolve_ip: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "link_resolve_login1" }),
    perform: (body, state) => {
      location.href = `https://hackerwars.io/internet?ip=${state.downloadCenterIp}`;
    },
  },
  link_resolve_login1: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.querySelector('a[href="?action=login"]'),
    resolve: () => ({ next: "link_resolve_login2" }),
    perform: (元素) => 元素.click(),
  },
  link_resolve_login2: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => 按值查找提交按钮("Login"),
    resolve: () => ({ next: "link_resolve_software" }),
    perform: (元素) => 元素.click(),
  },
  // 不管有没有同时配置文件夹，都会先访问普通列表页——即使有些病毒被归档到了文件夹里，也可能
  // 还有一些直接放在最外层。
  link_resolve_software: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "resolve_links_base" }),
    perform: () => {
      location.href = "https://hackerwars.io/software";
    },
  },
  resolve_links_base: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: (body, state) => {
      const { resolvedVirus, resolvedVddos } = i2解析页面链接(state.virusOptions, state.vddosFile);
      return {
        next: state.folderUrl ? "link_resolve_folder" : "check_links_resolved",
        patch: {
          virusOptionsResolved: i2合并已解析病毒列表(state.virusOptionsResolved || [], resolvedVirus),
          vddosFileResolved: state.vddosFileResolved || resolvedVddos,
        },
      };
    },
    perform: () => {},
  },
  link_resolve_folder: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "resolve_links_folder" }),
    perform: (body, state) => {
      location.href = state.folderUrl;
    },
  },
  resolve_links_folder: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: (body, state) => {
      const { resolvedVirus, resolvedVddos } = i2解析页面链接(state.virusOptions, state.vddosFile);
      return {
        next: "check_links_resolved",
        patch: {
          virusOptionsResolved: i2合并已解析病毒列表(state.virusOptionsResolved || [], resolvedVirus),
          vddosFileResolved: state.vddosFileResolved || resolvedVddos,
        },
      };
    },
    perform: () => {},
  },
  // 至少要解析出一个病毒是硬性要求——不设 onNotFound，所以真的一个都没解析出来时会直接卡住，
  // 而不是对着一个改不好的配置问题永远重试下去。配置了但没解析出来的 vDDoS 文件不算致命
  // 错误——只是这次运行会跳过 vDDoS 安装（后面到 goto_vddos_upload 时再检查）。
  check_links_resolved: {
    timeout: 5000,
    skipElapsedGate: true,
    find: (state) => (state.virusOptionsResolved && state.virusOptionsResolved.length > 0 ? true : null),
    resolve: () => ({ next: "link_resolve_return" }),
    // 按 popup.js 在点 Start 时算出的同一个配置键缓存——只要相关配置没变，下次点 Start 就能
    // 跳过整个连接/登录/软件页/文件夹这一整套流程。
    perform: async (found, state) => {
      const optionsKey = JSON.stringify({
        options: state.virusOptions || [],
        vddosFile: state.vddosFile || null,
        folderUrl: state.folderUrl || "",
      });
      await chrome.storage.local.set({
        infection2LinkCache: {
          optionsKey,
          resolvedVirus: state.virusOptionsResolved,
          resolvedVddos: state.vddosFileResolved,
        },
      });
    },
  },
  // 登出控件只会出现在已连接的 Download Center 面板上，不会出现在我们自己的 /software 或
  // 文件夹页面上。
  link_resolve_return: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "link_resolve_logout" }),
    perform: (body, state) => {
      location.href = `https://hackerwars.io/internet?ip=${state.downloadCenterIp}`;
    },
  },
  link_resolve_logout: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: (元素, state) => ({ next: state.ipQueue && state.ipQueue.length > 0 ? "goto_target" : "goto_hdb" }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?view=logout";
    },
  },
  goto_hdb: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "hdb_export" }),
    perform: () => {
      location.href = "https://hackerwars.io/hdb";
    },
  },
  hdb_export: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.querySelector("#hdb-export"),
    resolve: () => ({ next: "hdb_collect" }),
    perform: (元素) => 元素.click(),
  },
  hdb_collect: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => {
      const IP列表 = 查找HDB地址列表();
      return IP列表.length > 0 ? IP列表 : null;
    },
    resolve: (IP列表) => ({ next: "goto_target", patch: { ipQueue: IP列表, totalIpCount: IP列表.length } }),
    perform: () => {},
  },
  goto_target: {
    timeout: 15000,
    skipElapsedGate: true,
    find: (state) => (state.ipQueue && state.ipQueue.length > 0 ? state.ipQueue[0] : "done"),
    resolve: (found, state) =>
      found === "done"
        ? { next: "goto_final_log" }
        : {
            next: "login1",
            patch: { currentIp: found, ipQueue: state.ipQueue.slice(1), excludedVirusSizes: [] },
          },
    perform: (found) => {
      if (found !== "done") location.href = `https://hackerwars.io/internet?ip=${found}`;
    },
  },
  // HDB 里的机器本来就已经拿下了，所以直接登录就行（不需要破解/爆破）。
  login1: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.querySelector('a[href="?action=login"]'),
    resolve: () => ({ next: "login2" }),
    perform: (元素) => 元素.click(),
  },
  login2: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => 按值查找提交按钮("Login"),
    resolve: () => ({ next: "goto_software" }),
    perform: (元素) => 元素.click(),
  },
  goto_software: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.querySelector('a[href="?view=software"]'),
    resolve: () => ({ next: "check_space" }),
    perform: (元素) => 元素.click(),
  },
  check_space: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => {
      const 剩余空间MB = 查找剩余空间MB();
      return 剩余空间MB != null ? { freeMb: 剩余空间MB, uploadMBps: 查找上传速度MBps() } : null;
    },
    // 在已解析的病毒里挑最大的、同时满足"装得下"和"按这个目标的上传速度能在设定时间内传完"
    // 两个条件的一个。excludedVirusSizes 用来排除 click_install_virus 已经发现实际装不下的
    // 体积，这样会往下找更小的一个，而不是卡住。
    resolve: ({ freeMb, uploadMBps }, state) => {
      const 最大秒数 = (state.vddosMaxMinutes || 5) * 60;
      const 已排除体积集合 = new Set(state.excludedVirusSizes || []);
      const 选中项 = [...state.virusOptionsResolved]
        .filter((项) => !已排除体积集合.has(项.sizeMb))
        .sort((a, b) => b.sizeMb - a.sizeMb)
        .find((项) => 项.sizeMb <= freeMb && (uploadMBps == null || 项.sizeMb / uploadMBps <= 最大秒数));
      return 选中项
        ? { next: "upload_virus", patch: { virusChoice: 选中项 } }
        : { next: "goto_logs", patch: { targetSkip: true } };
    },
    perform: () => {},
  },
  upload_virus: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "click_install_virus" }),
    perform: (body, state) => {
      location.href = state.virusChoice.uploadUrl;
    },
  },
  click_install_virus: {
    timeout: 90000,
    skipElapsedGate: true,
    find: (state) => {
      if (查找磁盘空间不足错误()) return { kind: "no_space" };
      if (查找内存不足错误()) return { kind: "no_ram" };
      const 链接 = 查找软件行链接(state.virusChoice.name, state.virusChoice.version, "cmd=install");
      return 链接 ? { kind: "install", el: 链接 } : null;
    },
    resolve: (found, state) => {
      if (found.kind === "no_space") {
        return {
          next: "check_space",
          patch: { excludedVirusSizes: [...(state.excludedVirusSizes || []), state.virusChoice.sizeMb] },
        };
      }
      if (found.kind === "no_ram") return { next: "goto_logs", patch: { targetSkip: true } };
      return { next: "wait_virus_done" };
    },
    perform: (found) => {
      if (found.kind === "install") found.el.click();
    },
  },
  wait_virus_done: {
    timeout: 120000,
    skipElapsedGate: true,
    find: (state) => {
      if (查找病毒重复错误()) return { kind: "duplicate" };
      if (查找内存不足错误()) return { kind: "no_ram" };
      if (document.querySelector(".elapsed")) return null;
      const 行 = 查找软件行(state.virusChoice.name, state.virusChoice.version);
      if (!行) return null;
      return 行.classList.contains("installed") || 行.querySelector('a[href*="cmd=uninstall"]') ? { kind: "installed" } : null;
    },
    resolve: (found, state) => {
      if (found.kind !== "installed") {
        return { next: "goto_logs", patch: { targetSkip: true } };
      }
      // 只有主病毒确实已经装上了，才会去尝试 vDDoS，而且还得是启用了、并且它的上传链接确实
      // 解析成功了（见 check_links_resolved 的注释）。
      const 想要vDDoS = !!state.vddosFileResolved;
      return { next: 想要vDDoS ? "check_vddos_space" : "goto_logs" };
    },
    perform: () => {},
  },
  // 和上面 check_space 一样的适配检查，只是这次针对的是固定的单个 vDDoS 文件，而不是要从
  // 列表里挑——主病毒自己的 check_space 只算了它自己的上传时间，如果没有这一步，vDDoS 这一段
  // 在慢速目标上就完全不受时间上限约束，可能远远超时。
  check_vddos_space: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => {
      const 剩余空间MB = 查找剩余空间MB();
      return 剩余空间MB != null ? { freeMb: 剩余空间MB, uploadMBps: 查找上传速度MBps() } : null;
    },
    resolve: ({ freeMb, uploadMBps }, state) => {
      const 最大秒数 = (state.vddosMaxMinutes || 5) * 60;
      const { sizeMb } = state.vddosFileResolved;
      const 装得下 = sizeMb <= freeMb && (uploadMBps == null || sizeMb / uploadMBps <= 最大秒数);
      return 装得下
        ? { next: "upload_vddos" }
        : { next: "goto_logs", patch: { vddosFailedCount: (state.vddosFailedCount || 0) + 1 } };
    },
    perform: () => {},
  },
  upload_vddos: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "click_install_vddos" }),
    perform: (body, state) => {
      location.href = state.vddosFileResolved.uploadUrl;
    },
  },
  // 这里失败（主病毒装完之后空间不够，或者内存不够）只会跳过 vDDoS 这一段——由于主病毒已经
  // 装上了，目标依然算感染成功。单独用自己的 vddosFailedCount 记录，这样"感染成功"和
  // "感染成功+vDDoS"之间的区别看得出来。
  click_install_vddos: {
    timeout: 90000,
    skipElapsedGate: true,
    find: (state) => {
      if (查找磁盘空间不足错误()) return { kind: "no_space" };
      if (查找内存不足错误()) return { kind: "no_ram" };
      const 链接 = 查找软件行链接(state.vddosFileResolved.name, state.vddosFileResolved.version, "cmd=install");
      return 链接 ? { kind: "install", el: 链接 } : null;
    },
    resolve: (found, state) => {
      if (found.kind === "no_space" || found.kind === "no_ram") {
        return { next: "goto_logs", patch: { vddosFailedCount: (state.vddosFailedCount || 0) + 1 } };
      }
      return { next: "wait_vddos_done" };
    },
    perform: (found) => {
      if (found.kind === "install") found.el.click();
    },
  },
  wait_vddos_done: {
    timeout: 120000,
    skipElapsedGate: true,
    find: (state) => {
      if (查找病毒重复错误()) return { kind: "duplicate" };
      if (查找内存不足错误()) return { kind: "no_ram" };
      if (document.querySelector(".elapsed")) return null;
      const 行 = 查找软件行(state.vddosFileResolved.name, state.vddosFileResolved.version);
      if (!行) return null;
      return 行.classList.contains("installed") || 行.querySelector('a[href*="cmd=uninstall"]') ? { kind: "installed" } : null;
    },
    resolve: (found, state) => ({
      next: "goto_logs",
      patch:
        found.kind === "installed"
          ? { vddosInstalledCount: (state.vddosInstalledCount || 0) + 1 }
          : { vddosFailedCount: (state.vddosFailedCount || 0) + 1 },
    }),
    perform: () => {},
  },
  // 每次登出之前（成功、跳过、空间不够、没有合适的都算）都清一遍目标的日志——除了 Download
  // Center 自己，它从来不会被当成真正的入侵目标登录（只是连接上去解析链接），所以那里本来就
  // 没有日志编辑表单可提交。
  goto_logs: {
    timeout: 15000,
    skipElapsedGate: true,
    find: (state) => (state.currentIp === state.downloadCenterIp ? true : document.querySelector('a[href="?view=logs"]')),
    resolve: (found, state) => (state.currentIp === state.downloadCenterIp ? { next: "logout" } : { next: "clear_logs" }),
    perform: (found) => {
      if (found !== true) found.click();
    },
  },
  clear_logs: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => {
      const 文本框 = 获取日志文本框();
      const 按钮 = 获取编辑日志按钮();
      return 文本框 && 按钮 ? { textarea: 文本框, button: 按钮 } : null;
    },
    resolve: () => ({ next: "wait_logs_clear" }),
    // 只删掉包含自己IP的那些行，不是整份日志——把目标其他的日志条目留着，比一份彻底空白的
    // 日志更不容易引人注意。
    perform: async ({ textarea, button }) => {
      await 取消陈旧日志编辑进程();
      textarea.value = 移除自身IP所在行(textarea.value, 获取自身IP());
      button.click();
    },
  },
  // 一份很长的日志需要几秒钟才能真正保存完——提交之后会出现一个 .elapsed 倒计时，跑完页面会
  // 自动刷新回自己。如果在这之前就往下走（logout 会直接跳转离开），编辑其实还没真正保存进去。
  // 这个步骤是本文件里唯一一个特意*没有*跳过倒计时检测的地方（别的步骤都跳过了），因为这里
  // 恰好是应该等它的情况——和其他模块里类似的日志清空等待用的是同一种修法。
  wait_logs_clear: {
    timeout: 30000,
    find: () => (document.querySelector(".elapsed") ? null : true),
    resolve: () => ({ next: "logout" }),
    perform: () => {},
  },
  logout: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: (元素, state) => ({ next: "goto_target", complete: !state.targetSkip }),
    perform: () => {
      location.href = "https://hackerwars.io/internet?view=logout";
    },
  },
  // 整个IP列表都跑完之后，把自己的 /log 彻底清空（不像每个目标的日志那样只删自己IP那几行）——
  // 这是我们自己这次全程操作的记录。
  goto_final_log: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => document.body,
    resolve: () => ({ next: "clear_final_log" }),
    perform: () => {
      location.href = "https://hackerwars.io/log";
    },
  },
  clear_final_log: {
    timeout: 15000,
    skipElapsedGate: true,
    find: () => {
      const 文本框 = 获取日志文本框();
      const 按钮 = 获取编辑日志按钮();
      return 文本框 && 按钮 ? { textarea: 文本框, button: 按钮 } : null;
    },
    resolve: () => ({ next: "wait_final_log_clear" }),
    perform: async ({ textarea, button }) => {
      await 取消陈旧日志编辑进程();
      textarea.value = "";
      button.click();
    },
  },
  // 同样，长日志需要几秒才能真正保存完，这里也是本文件里特意*没有*跳过倒计时检测的一步——
  // 原因和上面 wait_logs_clear 一样。
  wait_final_log_clear: {
    timeout: 30000,
    find: () => (document.querySelector(".elapsed") ? null : true),
    resolve: () => ({ next: "done", stop: true }),
    perform: () => {},
  },
};
