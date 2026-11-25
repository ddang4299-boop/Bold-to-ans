const en = document.getElementById("enabled");
const op = document.getElementById("opacity");
const pf = document.getElementById("prefetch");
const st = document.getElementById("status");

chrome.storage.sync.get({ enabled: true, opacity: 0.35, prefetch: true }, (s) => {
  en.checked = s.enabled;
  pf.checked = s.prefetch;
  op.value = s.opacity;
});
pf.onchange = () => chrome.storage.sync.set({ prefetch: pf.checked });
en.onchange = () => chrome.storage.sync.set({ enabled: en.checked });
op.oninput = () => chrome.storage.sync.set({ opacity: Number(op.value) });

chrome.runtime.sendMessage({ type: "PING" }, (res) => {
  if (res && res.ok) st.textContent = res.claude ? "✓ Sẵn sàng (Claude Code đã tìm thấy)" : "⚠ Đã kết nối, nhưng không tìm thấy lệnh claude";
  else st.textContent = "✕ Chưa cài — chạy native-host\\install.bat rồi khởi động lại Chrome";
});
