(function () {
  if (window.__bcbLoaded) return;
  window.__bcbLoaded = true;

  const LANGS = [
    { value: "javascript", label: "JavaScript" },
    { value: "json", label: "JSON" },
    { value: "html", label: "HTML" },
    { value: "css", label: "CSS" },
    { value: "xml", label: "XML" },
    { value: "powershell", label: "PowerShell" },
    { value: "csharp", label: "C#" },
    { value: "python", label: "Python" },
    { value: "sql", label: "SQL" },
    { value: "plaintext", label: "Plain text" }
  ];

  let lastTarget = null;

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function buildBlock(lang, code) {
    const safe = escapeHtml(code.replace(/\r\n/g, "\n"));
    return `<pre><code class="language-${lang}">\n${safe}\n</code></pre>\n`;
  }

  function toast(msg) {
    let el = document.getElementById("bcb-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "bcb-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function getDocs() {
    const docs = [document];
    document.querySelectorAll("iframe").forEach((frame) => {
      try {
        const doc = frame.contentDocument || frame.contentWindow?.document;
        if (doc) docs.push(doc);
      } catch (_) {}
    });
    return docs;
  }

  function isUsable(el) {
    if (!el) return false;
    try {
      const r = el.getBoundingClientRect();
      return r.width > 120 && r.height > 40;
    } catch (_) {
      return true;
    }
  }

  function rememberTarget(el, doc) {
    if (!el) return;
    lastTarget = { el, doc: doc || el.ownerDocument || document };
  }

  function trackFocus(e) {
    const t = e.target;
    if (!t) return;
    if (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable) {
      rememberTarget(t, t.ownerDocument);
      return;
    }
    if (t.tagName === "IFRAME") {
      try {
        const doc = t.contentDocument;
        const body = doc && (doc.activeElement || doc.body);
        if (body && (body.isContentEditable || body.tagName === "TEXTAREA")) {
          rememberTarget(body, doc);
        } else if (doc?.body) {
          rememberTarget(doc.body, doc);
        }
      } catch (_) {}
    }
  }

  document.addEventListener("focusin", trackFocus, true);
  window.addEventListener("blur", () => {
    const ae = document.activeElement;
    if (ae && ae.tagName === "IFRAME") trackFocus({ target: ae });
  }, true);

  function findHtmlTextarea() {
    const docs = getDocs();
    const preferredIds = ["postingHtmlBox", "postingHtmlArea", "htmlContent"];
    for (const doc of docs) {
      for (const id of preferredIds) {
        const el = doc.getElementById(id);
        if (el && el.tagName === "TEXTAREA") return { el, doc };
      }
    }
    const candidates = [];
    for (const doc of docs) {
      doc.querySelectorAll("textarea").forEach((t) => {
        if (isUsable(t)) candidates.push({ el: t, doc });
      });
    }
    candidates.sort(
      (a, b) =>
        b.el.clientHeight * b.el.clientWidth - a.el.clientHeight * a.el.clientWidth
    );
    return candidates[0] || null;
  }

  function findContentEditable() {
    const preferred = document.getElementById("postingComposeBox");
    if (preferred) {
      try {
        const doc = preferred.contentDocument || preferred.contentWindow?.document;
        const body = doc?.body;
        if (body) return { el: body, doc };
      } catch (_) {}
      if (preferred.isContentEditable) return { el: preferred, doc: document };
    }

    const docs = getDocs();
    const candidates = [];
    for (const doc of docs) {
      const nodes = [
        ...doc.querySelectorAll('[contenteditable="true"]'),
        ...doc.querySelectorAll('[g_editable="true"]'),
        ...doc.querySelectorAll(".editable[role='textbox'], [role='textbox'][contenteditable]")
      ];
      nodes.forEach((n) => {
        if (isUsable(n)) candidates.push({ el: n, doc });
      });
    }
    candidates.sort(
      (a, b) =>
        b.el.clientHeight * b.el.clientWidth - a.el.clientHeight * a.el.clientWidth
    );
    return candidates[0] || null;
  }

  function setNativeTextareaValue(ta, value) {
    const proto = window.HTMLTextAreaElement?.prototype;
    const desc = proto && Object.getOwnPropertyDescriptor(proto, "value");
    if (desc?.set) desc.set.call(ta, value);
    else ta.value = value;
  }

  function insertAtCursorTextarea(ta, html) {
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    const next = before + html + after;
    setNativeTextareaValue(ta, next);
    const pos = start + html.length;
    ta.focus();
    try {
      ta.setSelectionRange(pos, pos);
    } catch (_) {}
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    ta.dispatchEvent(new Event("change", { bubbles: true }));
    ta.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: html }));
  }

  function insertIntoContentEditable(doc, el, html) {
    try {
      el.focus();
    } catch (_) {}
    try {
      const sel = doc.getSelection && doc.getSelection();
      if (sel && sel.rangeCount === 0 && doc.body) {
        const range = doc.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (_) {}

    try {
      if (doc.execCommand && doc.execCommand("insertHTML", false, html)) return true;
    } catch (_) {}

    try {
      if (document.execCommand && el.ownerDocument === document) {
        if (document.execCommand("insertHTML", false, html)) return true;
      }
    } catch (_) {}

    try {
      const sel = doc.getSelection && doc.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const temp = doc.createElement("div");
        temp.innerHTML = html;
        const frag = doc.createDocumentFragment();
        let node;
        let last = null;
        while ((node = temp.firstChild)) last = frag.appendChild(node);
        range.insertNode(frag);
        if (last) {
          range.setStartAfter(last);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
    } catch (_) {}

    try {
      el.insertAdjacentHTML("beforeend", html);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    } catch (_) {}
    return false;
  }

  async function pasteViaClipboard(target, html) {
    try {
      await navigator.clipboard.writeText(html);
    } catch (_) {
      return false;
    }
    const { el, doc } = target;
    try {
      el.focus();
    } catch (_) {}

    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", html);
      dt.setData("text/html", html);
      const evt = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt
      });
      if (el.dispatchEvent(evt) === false) return true;
    } catch (_) {}

    try {
      if (doc.execCommand && doc.execCommand("paste")) return true;
    } catch (_) {}
    return false;
  }

  function resolveInsertTarget() {
    if (lastTarget?.el && lastTarget.el.isConnected) {
      const tag = lastTarget.el.tagName;
      if (tag === "TEXTAREA" || lastTarget.el.isContentEditable || lastTarget.el.getAttribute?.("g_editable")) {
        return lastTarget;
      }
    }
    return findHtmlTextarea() || findContentEditable();
  }

  async function insertBlock(html) {
    const target = resolveInsertTarget();
    if (!target) return false;

    const { el, doc } = target;
    if (el.tagName === "TEXTAREA") {
      insertAtCursorTextarea(el, html);
      toast("Đã chèn vào HTML editor");
      return true;
    }

    if (insertIntoContentEditable(doc || el.ownerDocument, el, html)) {
      toast("Đã chèn vào editor");
      return true;
    }

    if (await pasteViaClipboard(target, html)) {
      toast("Đã chèn (paste)");
      return true;
    }
    return false;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    }
  }

  function closeModal() {
    document.getElementById("bcb-modal-backdrop")?.remove();
  }

  function openModal() {
    if (document.getElementById("bcb-modal-backdrop")) return;

    // Capture editor focus before modal steals it
    const ae = document.activeElement;
    if (ae?.tagName === "IFRAME") trackFocus({ target: ae });
    else if (ae) trackFocus({ target: ae });

    const backdrop = document.createElement("div");
    backdrop.id = "bcb-modal-backdrop";
    backdrop.innerHTML = `
      <div id="bcb-modal" role="dialog" aria-modal="true">
        <h2>Chèn Code Block</h2>
        <label for="bcb-lang-preset">Chọn nhanh</label>
        <select id="bcb-lang-preset">
          <option value="">— Tự nhập —</option>
          ${LANGS.map((l) => `<option value="${l.value}">${l.label}</option>`).join("")}
        </select>
        <label for="bcb-lang">Tên ngôn ngữ</label>
        <input id="bcb-lang" type="text" list="bcb-lang-list" placeholder="vd: json, powershell, yaml..." autocomplete="off" />
        <datalist id="bcb-lang-list">
          ${LANGS.map((l) => `<option value="${l.value}"></option>`).join("")}
        </datalist>
        <label for="bcb-code">Code</label>
        <textarea id="bcb-code" placeholder="Dán code vào đây..." spellcheck="false"></textarea>
        <div id="bcb-actions">
          <button type="button" id="bcb-cancel">Hủy</button>
          <button type="button" id="bcb-copy">Copy HTML</button>
          <button type="button" id="bcb-insert">Chèn</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const preset = backdrop.querySelector("#bcb-lang-preset");
    const lang = backdrop.querySelector("#bcb-lang");
    const code = backdrop.querySelector("#bcb-code");
    lang.value = "json";
    preset.value = "json";
    lang.focus();
    lang.select();

    preset.addEventListener("change", () => {
      if (preset.value) lang.value = preset.value;
      lang.focus();
    });

    function resolveLang() {
      const raw = (lang.value || "plaintext").trim().toLowerCase().replace(/\s+/g, "-");
      return raw || "plaintext";
    }

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });
    backdrop.querySelector("#bcb-cancel").onclick = closeModal;

    backdrop.querySelector("#bcb-copy").onclick = async () => {
      const html = buildBlock(resolveLang(), code.value);
      const ok = await copyText(html);
      toast(ok ? "Đã copy HTML — dán vào chế độ HTML" : "Copy thất bại");
    };

    backdrop.querySelector("#bcb-insert").onclick = async () => {
      const html = buildBlock(resolveLang(), code.value);
      closeModal();
      // Wait a tick so focus can return / editor is interactive
      await new Promise((r) => setTimeout(r, 50));
      const ok = await insertBlock(html);
      if (!ok) {
        await copyText(html);
        toast("Không chèn được — đã copy, dán Ctrl+V vào HTML mode");
      }
    };

    document.addEventListener(
      "keydown",
      function onEsc(e) {
        if (e.key === "Escape") {
          closeModal();
          document.removeEventListener("keydown", onEsc);
        }
      },
      { once: true }
    );
  }

  function ensureFab() {
    if (document.getElementById("bcb-fab")) return;
    const href = location.href;
    if (!/blogger\.com/i.test(href)) return;

    const btn = document.createElement("button");
    btn.id = "bcb-fab";
    btn.type = "button";
    btn.title = "Chèn Code Block";
    btn.setAttribute("aria-label", "Chèn Code Block");
    btn.textContent = "</>";
    btn.onclick = openModal;
    document.body.appendChild(btn);
  }

  ensureFab();
  const obs = new MutationObserver(() => ensureFab());
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
