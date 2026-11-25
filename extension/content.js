// Moodle Quiz Helper — bôi đen chữ trong câu hỏi, đáp án hiện mờ cạnh vùng chọn.
(() => {
  const cache = new Map();
  let bubble = null;
  let enabled = true;
  let opacity = 0.35;

  chrome.storage.sync.get({ enabled: true, opacity: 0.35, prefetch: true }, (s) => {
    enabled = s.enabled;
    opacity = s.opacity;
    if (s.enabled && s.prefetch) setTimeout(prefetchAll, 800);
  });
  chrome.storage.onChanged.addListener((c) => {
    if (c.enabled) enabled = c.enabled.newValue;
    if (c.opacity) opacity = c.opacity.newValue;
  });

  // Lấy toàn bộ câu hỏi + các lựa chọn của khối .que chứa vùng bôi đen.
  function buildQuestion(sel) {
    const node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
    const que = node && node.closest(".que");
    if (!que) return sel.toString().trim(); // không phải trang Moodle: gửi đúng đoạn bôi đen
    return fromQue(que) || sel.toString().trim();
  }

  function fromQue(que) {
    const qtext = (que.querySelector(".qtext")?.innerText || "").trim();
    const rows = [...que.querySelectorAll(".answer > div, .answer .r0, .answer .r1")];
    const seen = new Set();
    const options = [];
    rows.forEach((row, i) => {
      const t = row.innerText.replace(/\s+/g, " ").trim();
      if (!t || seen.has(t)) return;
      seen.add(t);
      // Moodle thường đã có "a." "b." ở đầu; nếu chưa có thì tự gắn chữ cái.
      options.push(/^[a-zA-Z][.)]\s/.test(t) ? t : `${String.fromCharCode(97 + options.length)}. ${t}`);
    });
    return options.length ? `${qtext}\n\n${options.join("\n")}` : qtext;
  }

  function show(text, rect) {
    hide();
    bubble = document.createElement("div");
    bubble.textContent = text;
    Object.assign(bubble.style, {
      position: "absolute",
      left: `${window.scrollX + rect.right + 6}px`,
      top: `${window.scrollY + rect.top - 2}px`,
      font: "600 13px system-ui, sans-serif",
      color: "#555",
      opacity: String(opacity),
      pointerEvents: "none",
      zIndex: 2147483647,
      userSelect: "none"
    });
    document.body.appendChild(bubble);
  }
  function hide() {
    bubble?.remove();
    bubble = null;
  }

  const pending = new Map(); // câu hỏi đang chờ Claude trả lời (vẫn chạy ngầm khi bỏ bôi đen)
  let active = null;         // câu hỏi đang được bôi đen lúc này (null = không bôi đen)

  // Gửi câu hỏi một lần duy nhất; bôi đen lại khi đang chờ sẽ dùng chung yêu cầu cũ.
  function ask(question, force = false, prefetch = false) {
    if (pending.has(question) && !prefetch) {
      // Câu đang được hỏi trước ngầm: báo nền ưu tiên câu này lên đầu hàng đợi
      try { chrome.runtime.sendMessage({ type: "ASK", question }, () => void chrome.runtime.lastError); } catch {}
    }
    if (!pending.has(question)) {
      pending.set(question, new Promise((resolve) => {
        let done = false;
        const finish = (answer) => {
          if (done) return;
          done = true;
          pending.delete(question);
          if (answer !== "✕" && answer !== "↻") cache.set(question, answer);
          resolve(answer);
        };
        // Không bao giờ chờ mãi: quá 3 phút thì báo lỗi để lần sau hỏi lại.
        setTimeout(() => finish("✕"), 180000);
        try {
          chrome.runtime.sendMessage({ type: "ASK", question, force, prefetch }, (res) => {
            if (chrome.runtime.lastError) return finish("✕");
            finish(res && res.ok ? res.answer : "✕");
          });
        } catch {
          finish("↻"); // tiện ích vừa được tải lại: cần F5 trang này
        }
      }));
    }
    return pending.get(question);
  }

  // Tự hỏi trước tất cả câu hỏi trên trang Moodle ngay khi mở, để lúc bôi đen là có đáp án.
  function prefetchAll() {
    document.querySelectorAll(".que").forEach((que) => {
      const q = fromQue(que);
      if (q && q.length > 10 && !cache.has(q)) ask(q, false, true);
    });
  }

  document.addEventListener("mousedown", () => { active = null; hide(); });

  document.addEventListener("mouseup", (ev) => {
    if (!enabled) return;
    const force = ev.shiftKey; // giữ Shift khi bôi đen = bắt hỏi lại
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.toString().trim().length < 3) { active = null; return; }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const question = buildQuestion(sel);
      active = question;

      if (force) cache.delete(question);
      if (cache.has(question)) return show(cache.get(question), rect);
      show("…", rect);
      ask(question, force).then((answer) => {
        // Chỉ hiện nếu bạn vẫn đang bôi đen đúng câu này; nếu đã bỏ, đáp án được lưu để lần sau hiện ngay.
        if (active === question) show(answer, rect);
        if (answer === "✕" || answer === "↻") cache.delete(question);
      });
    }, 10);
  });
})();
