// Nhận câu hỏi từ trang, gửi cho chương trình native (gọi Claude Code) qua Native Messaging.
// - Không gửi trùng: câu đang chờ thì dùng chung kết quả.
// - Hàng đợi: tối đa MAX_PARALLEL câu chạy cùng lúc (khi tự hỏi trước cả trang).
const HOST = "com.moodle.quizhelper";
const MAX_PARALLEL = 3;

const inflight = new Map(); // key -> Promise
const queue = [];
let running = 0;

function pump() {
  while (running < MAX_PARALLEL && queue.length) {
    const job = queue.shift();
    running++;
    chrome.runtime.sendNativeMessage(HOST, { type: "ask", question: job.question }, (res) => {
      running--;
      const err = chrome.runtime.lastError;
      job.resolve(err ? { ok: false, error: err.message } : res || { ok: false, error: "Không có phản hồi" });
      pump();
    });
  }
}

function askNative(question, priority) {
  return new Promise((resolve) => {
    const job = { question, resolve };
    priority ? queue.unshift(job) : queue.push(job); // câu bạn đang bôi đen được ưu tiên lên đầu
    pump();
  });
}

async function ask(question, force, priority) {
  const key = "q:" + question;
  if (!force) {
    const saved = await chrome.storage.local.get(key);
    if (saved[key]) return { ok: true, answer: saved[key] };
  }
  if (inflight.has(key)) {
    // Đang chờ sẵn: nếu bạn bôi đen câu đang nằm trong hàng đợi, đẩy nó lên đầu
    if (priority) {
      const i = queue.findIndex((j) => j.question === question);
      if (i > 0) queue.unshift(queue.splice(i, 1)[0]);
    }
    return inflight.get(key);
  }
  const p = askNative(question, priority).then(async (res) => {
    inflight.delete(key);
    if (res && res.ok) await chrome.storage.local.set({ [key]: res.answer });
    return res;
  });
  inflight.set(key, p);
  return p;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "PING") {
    chrome.runtime.sendNativeMessage(HOST, { type: "ping" }, (res) => {
      const err = chrome.runtime.lastError;
      sendResponse(err ? { ok: false, error: err.message } : res);
    });
    return true;
  }
  if (msg.type === "ASK") {
    ask(msg.question, msg.force, !msg.prefetch).then(sendResponse);
    return true; // giữ kênh mở cho phản hồi bất đồng bộ
  }
});
