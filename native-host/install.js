// Đăng ký chương trình native với Chrome (chỉ cho người dùng hiện tại, không cần quyền admin).
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const NAME = "com.moodle.quizhelper";
const EXT_ID = "bimcgpecfkagmenghmiiembfcknboeic"; // cố định nhờ "key" trong extension/manifest.json

const manifestPath = path.join(__dirname, `${NAME}.json`);
fs.writeFileSync(manifestPath, JSON.stringify({
  name: NAME,
  description: "Moodle Quiz Helper - goi Claude Code",
  path: path.join(__dirname, "host.bat"),
  type: "stdio",
  allowed_origins: [`chrome-extension://${EXT_ID}/`]
}, null, 2));

const browsers = [
  ["Google Chrome", "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts"],
  ["Microsoft Edge", "HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts"]
];
for (const [label, key] of browsers) {
  execSync(`reg add "${key}\\${NAME}" /ve /t REG_SZ /d "${manifestPath}" /f`, { stdio: "ignore" });
  console.log(`✓ Đã đăng ký cho ${label}`);
}

try {
  execSync("where claude", { stdio: "ignore" });
  console.log("✓ Tìm thấy lệnh claude (Claude Code)");
} catch {
  console.log("⚠ KHÔNG tìm thấy lệnh claude. Hãy cài Claude Code và đăng nhập bằng tài khoản Pro trước.");
}
console.log("\nXong! Hãy TẮT HẲN Chrome rồi mở lại để áp dụng.");
