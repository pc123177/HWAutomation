// Injeta o cartão do pop-up na página, fixo no canto inferior direito. Reutiliza popup.html/popup.js
// como única fonte de markup e comportamento; a única responsabilidade deste arquivo é posicioná-lo.
(async function injetarOverlay() {
  if (document.getElementById("hwauto-overlay-root")) return;

  const raiz = document.createElement("div");
  raiz.id = "hwauto-overlay-root";
  raiz.style.position = "fixed";
  raiz.style.bottom = "16px";
  raiz.style.right = "16px";
  raiz.style.zIndex = "999999";
  document.documentElement.appendChild(raiz);

  // O botão de ocultar do popup.js mantém o overlay escondido no DOM até a próxima abertura do pop-up.
  const { overlayHidden: estaOculto } = await chrome.storage.local.get("overlayHidden");
  if (estaOculto) {
    raiz.style.display = "none";
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.overlayHidden && !changes.overlayHidden.newValue) {
      raiz.style.display = "";
    }
  });

  let html;
  try {
    // no-store evita usar popup.js antigo em cache, que faria os getElementById retornarem null.
    const resposta = await fetch(chrome.runtime.getURL("popup.html"), { cache: "no-store" });
    html = await resposta.text();
  } catch (erro) {
    console.log("[HWAuto] overlay: failed to load popup.html", erro);
    return;
  }

  const documento = new DOMParser().parseFromString(html, "text/html");

  const elementoEstilo = document.createElement("style");
  elementoEstilo.id = "hwauto-overlay-style";
  elementoEstilo.textContent = documento.querySelector("style")?.textContent || "";
  document.head.appendChild(elementoEstilo);

  const cartao = documento.getElementById("hwauto-card");
  if (!cartao) {
    console.log("[HWAuto] overlay: #hwauto-card not found in popup.html");
    return;
  }
  // O overlay começa recolhido, mostrando apenas o cabeçalho; a mesma classe "collapsed" é usada
  // pela lógica de cliques de inicializarInterfacePopup().
  cartao.classList.add("collapsed");
  const botaoRecolher = cartao.querySelector("#hwauto-collapse-toggle");
  if (botaoRecolher) botaoRecolher.innerHTML = "&#9650;";
  raiz.appendChild(cartao);

  // popup.js é carregado antes deste arquivo no manifest, então inicializarInterfacePopup já está
  // globalmente disponível; ele apenas aguarda #hwauto-card existir.
  if (typeof initPopupUI === "function") {
    initPopupUI();
  } else {
    console.log("[HWAuto] overlay: initPopupUI is not defined — check manifest.json script order");
  }
})();
