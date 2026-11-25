// Chương trình native: Chrome tự khởi động khi cần, nhận câu hỏi, gọi `claude -p` (tài khoản Pro của bạn), trả đáp án.
// Giao thức Native Messaging: mỗi tin nhắn = 4 byte độ dài (little-endian) + JSON UTF-8.
const { spawn, execSync } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");

const MODEL = process.env.QUIZ_MODEL || "haiku";
const LOG = path.join(__dirname, "host.log");
const log = (s) => { try { fs.appendFileSync(LOG, `[${new Date().toISOString()}] ${s}\n`); } catch {} };

function send(obj) {
  const json = Buffer.from(JSON.stringify(obj), "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(json.length, 0);
  process.stdout.write(Buffer.concat([len, json]));
}

const PROMPT = (q) =>
  `Giải câu hỏi trắc nghiệm sau theo kiến thức môn học đã cho. Suy luận ngắn gọn từng bước (tối đa 6 dòng), ` +
  `đặc biệt cẩn thận với câu hỏi phủ định ("không đúng", "sai", "ngoại trừ") và câu tính toán ` +
  `(tính ra số cụ thể rồi so với từng lựa chọn). ` +
  `Dòng CUỐI CÙNG bắt buộc có dạng "ĐÁP ÁN: X" với X là chữ cái đáp án đúng ` +
  `(nhiều đáp án thì cách nhau dấu phẩy, câu Đúng/Sai thì ghi Đúng hoặc Sai).\n\n${q}`;

function clean(text) {
  const finals = [...text.matchAll(/ĐÁP\s*ÁN\s*[:：]\s*(.+)/gi)];
  const t = (finals.length ? finals[finals.length - 1][1] : text.trim().split("\n").pop()).replace(/[*_`]/g, "").trim();
  const m = t.match(/^\s*([A-Ha-h](\s*,\s*[A-Ha-h])*)\b/);
  if (m) return m[1].toUpperCase().replace(/\s+/g, "");
  return t.slice(0, 20);
}

function hasClaude() {
  try { execSync(process.platform === "win32" ? "where claude" : "which claude", { stdio: "ignore" }); return true; }
  catch { return false; }
}

// --- Chế độ NHANH: thay bản hướng dẫn mặc định rất dài của Claude Code bằng file kiến thức môn học,
// tắt công cụ, plugin, MCP, lưu phiên. Nếu máy không hỗ trợ thì tự quay về chế độ THƯỜNG và ghi nhớ.
const DIR = (process.env.QUIZ_DIR && fs.existsSync(process.env.QUIZ_DIR)) ? process.env.QUIZ_DIR : null;
const KNOWLEDGE = DIR && fs.existsSync(path.join(DIR, "CLAUDE.md")) ? path.join(DIR, "CLAUDE.md") : null;
const MODE_FILE = path.join(__dirname, "mode.txt"); // chứa "normal" nếu chế độ nhanh không chạy được

function fastArgs() {
  const a = ["-p", "--model", MODEL, "--tools", "", "--safe-mode", "--no-session-persistence",
             "--strict-mcp-config", "--disable-slash-commands"];
  if (KNOWLEDGE) a.push("--system-prompt-file", KNOWLEDGE);
  else a.push("--system-prompt", "Bạn là trợ lý giải câu hỏi trắc nghiệm.");
  return a;
}
const normalArgs = () => ["-p", "--model", MODEL];

function runClaude(question, args) {
  const isWin = process.platform === "win32";
  // Trên Windows chạy qua cmd nên phải tự đặt dấu ngoặc kép (đường dẫn có dấu cách, tham số rỗng)
  const finalArgs = isWin ? args.map((x) => `"${x}"`) : args;
  return new Promise((resolve, reject) => {
    const p = spawn("claude", finalArgs, {
      shell: isWin,
      cwd: DIR || os.tmpdir(),
      windowsHide: true
    });
    let out = "", err = "";
    const timer = setTimeout(() => { p.kill(); reject(new Error("Quá thời gian (60s)")); }, 60000);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", (e) => { clearTimeout(timer); reject(e); });
    p.on("close", (code) => {
      clearTimeout(timer);
      code === 0 && out.trim() ? resolve(out) : reject(new Error((err || out).trim() || `claude thoát với mã ${code}`));
    });
    p.stdin.end(PROMPT(question));
  });
}

async function askClaude(question) {
  const useNormal = fs.existsSync(MODE_FILE) && fs.readFileSync(MODE_FILE, "utf8").trim() === "normal";
  if (useNormal) return runClaude(question, normalArgs());
  try {
    return await runClaude(question, fastArgs());
  } catch (e) {
    log("Chế độ nhanh lỗi (" + e.message.slice(0, 150) + "), thử chế độ thường");
    const out = await runClaude(question, normalArgs());
    // Chế độ thường chạy được mà chế độ nhanh không: ghi nhớ để lần sau khỏi thử lại
    try { fs.writeFileSync(MODE_FILE, "normal"); } catch {}
    return out;
  }
}

async function handle(msg) {
  if (msg.type === "ping") return send({ ok: true, claude: hasClaude() });
  if (msg.type === "ask") {
    const t0 = Date.now();
    try {
      const answer = clean(await askClaude(msg.question));
      log(`${((Date.now() - t0) / 1000).toFixed(1)}s ${answer} <- ${msg.question.split("\n")[0].slice(0, 70)}`);
      send({ ok: true, answer });
    } catch (e) {
      log("LỖI: " + e.message);
      send({ ok: false, error: e.message });
    }
  }
}

// Đọc tin nhắn từ Chrome qua stdin
let buf = Buffer.alloc(0);
process.stdin.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  while (buf.length >= 4) {
    const len = buf.readUInt32LE(0);
    if (buf.length < 4 + len) break;
    const msg = JSON.parse(buf.slice(4, 4 + len).toString("utf8"));
    buf = buf.slice(4 + len);
    handle(msg);
  }
});
process.stdin.on("end", () => process.exit(0));
