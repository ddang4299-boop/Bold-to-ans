# Bold-to-ans (Dịch Thuật Cafe)

Bôi đen một đoạn trong câu hỏi trên Moodle, đáp án gợi ý (A/B/C/D) sẽ hiện mờ ngay cạnh vùng chọn.
Tiện ích dùng **Claude Code với tài khoản Claude Pro của bạn**. Không cần mở terminal, không cần bật server.

```
Bôi đen → Chrome tự gọi chương trình nhỏ chạy ngầm → claude -p (Pro) → "B" hiện mờ
```

## Yêu cầu (chỉ cần một lần)

1. **Node.js**: tải bản LTS tại https://nodejs.org rồi cài (cứ bấm Next).
2. **Claude Code** đã cài và **đăng nhập bằng tài khoản Pro**. Kiểm tra bằng cách mở PowerShell, gõ `claude`, rồi gõ `/status` xem có đúng tài khoản của bạn không.
3. Nên kiểm tra máy **không** đặt biến `ANTHROPIC_API_KEY`. Nếu có biến này, Claude Code sẽ dùng API key thay vì gói Pro.

## Cài đặt

1. Giải nén thư mục `moodle-quiz-helper` vào **một chỗ cố định** (ví dụ `C:\Tools\moodle-quiz-helper`). Đừng để trong Downloads rồi xóa đi, vì Chrome sẽ gọi file ở đúng vị trí này.
2. Mở thư mục `native-host`, **nhấp đúp `install.bat`**.
3. Mở `chrome://extensions`, bật **Developer mode** (góc trên bên phải), bấm **Load unpacked**, rồi chọn thư mục `extension`.
4. **Tắt hẳn Chrome rồi mở lại** (đóng hết mọi cửa sổ Chrome).
5. Bấm vào biểu tượng tiện ích. Nếu thấy **"✓ Sẵn sàng"** là xong.

## Sử dụng

- Mở bài quiz Moodle và bôi đen bất kỳ chữ nào trong câu hỏi. Tiện ích tự lấy cả câu hỏi lẫn các lựa chọn a/b/c/d để gửi đi.
- `…` nghĩa là đang chờ (thường 3–8 giây). `✕` nghĩa là có lỗi.
- Câu đã hỏi được lưu lại, lần sau hiện ngay.
- Popup có nút bật/tắt và thanh chỉnh độ mờ.

## Gặp lỗi?

- **"Chưa cài"**: chạy lại `install.bat`, rồi tắt hẳn Chrome và mở lại.
- **"Không tìm thấy lệnh claude"**: nếu bạn mới cài Claude Code, hãy khởi động lại máy để Chrome nhận được lệnh `claude`.
- **Hiện ✕**: mở file `native-host\host.log` để xem lỗi cụ thể.
- Muốn đáp án chính xác hơn (nhưng chậm hơn): mở `host.bat` bằng Notepad, xóa chữ `rem ` ở đầu dòng `rem set QUIZ_MODEL=sonnet`.
- Gỡ cài đặt: chạy `uninstall.bat`, rồi xóa tiện ích trong `chrome://extensions`.

## Lưu ý

- Mỗi câu hỏi được tính vào hạn mức sử dụng của gói Pro.
- Đáp án do AI đưa ra **có thể sai**, đặc biệt câu tính toán hoặc câu có hình (Claude chỉ nhận chữ). Hãy dùng để đối chiếu, không nên tin tuyệt đối.
