# Review UI/UX — PawPass (sổ hộ chiếu thú cưng)

| | |
|---|---|
| **Link dự án** | https://pawpass-hosothucung-web.vercel.app |
| **Nhóm được review** | Nhóm PawPass — Hữu Triết, Duy Huy, Thế Dũng, Thành Đạt, Duy Quang |
| **Người review** | Lê Quang Khanh (đại diện Nhóm 5 — Thai Tu Fashion) |
| **Ngày dùng thử** | 22/11/2026 (trang công khai) · 27/11/2026 (bên trong ứng dụng) |
| **Thiết bị** | Trình duyệt Chromium: máy tính 1366px, điện thoại 375px |
| **Trao đổi trực tiếp** | ⟨ngày, hình thức, người tham dự bên PawPass⟩ |

## Lần 2 — 27/11/2026: dùng thử bên trong ứng dụng

**Phạm vi:** đăng ký tài khoản thử → thêm bé (thử để trống, ngày sinh tương lai, cân nặng âm, rồi nhập đúng) → thêm lần khám có thuốc → thêm mũi tiêm → xem trang chủ (Cần để ý, Gần đây). Cửa sổ Chrome hẹp ~620px.

Mình là Lê Quang Khanh (nhóm Thai Tu Fashion). Sau khi xem repository và đăng ký tài khoản dùng thử bản deploy trên Vercel (thêm bé, thêm lần khám, thêm mũi tiêm, xem trang chủ), xin gửi đến nhóm một số nhận xét:

**1. Điểm mạnh**
- **Chủ đề "hộ chiếu" nhất quán và dễ thương:** mỗi bé là một cuốn sổ có mã `PET-0024`, mũi tiêm hiện như con dấu có ngày, nhãn "Chưa tiêm" trên hồ sơ; thông báo thân thiện ("Chào mừng Bơ về nhà!", "Đã đóng dấu mũi tiêm mới.").
- **Kiểm tra dữ liệu chặt, báo lỗi tiếng Việt rõ:** để trống thì báo dưới từng ô; ngày sinh trong tương lai → "Ngày sinh không được ở tương lai."; cân nặng −3 → "Cân nặng phải là số lớn hơn 0."
- **Trang chủ tổng hợp hữu ích:** thêm lần khám có ghi thuốc thì mục "Cần để ý" tự hiện "Đang dùng thuốc"; mục "Gần đây" ghi lại 5 thay đổi mới nhất; repo có README theo template, tài liệu kỹ thuật và test.

**2. Điểm cần cải thiện**
- **Mũi tiêm chưa có ngày nhắc lại:** form "Thêm mũi tiêm" chỉ có tên vắc xin, ngày tiêm, liều và ghi chú. Vì vậy app chưa nhắc được lịch tiêm tiếp theo, trong khi đây là lý do chính để chủ nuôi giữ sổ tiêm.
- **Lỗi form dễ bị che:** bấm "Lưu" khi form "Thêm thú cưng" còn lỗi thì thông báo "Vui lòng kiểm tra lại các ô được đánh dấu." nổi đè lên phần trên của form (che ô Loài). Form cũng không cuộn về ô lỗi đầu tiên, nên ô "Tên thú cưng" bị lỗi vẫn nằm khuất phía trên.

**3. Đề xuất ưu tiên**
- **Ưu tiên 1:** thêm ô "Ngày tiêm nhắc lại" cho mũi tiêm và hiện các mũi sắp đến hạn trong mục "Cần để ý".
- **Ưu tiên 2:** khi form có lỗi, tự cuộn và focus vào ô lỗi đầu tiên; đặt thông báo lỗi ở chỗ không che nội dung form.

Cảm ơn nhóm đã chia sẻ bài làm, chúc nhóm hoàn thiện sản phẩm thật tốt!

---

## Lần 1 — 22/11/2026: trang công khai

**Phạm vi đã dùng thử:** Màn đăng nhập (thử form trống và dữ liệu sai, không tạo tài khoản), Giới thiệu, Liên hệ (không gửi lời nhắn). *Chưa xem phần bên trong ứng dụng (hồ sơ, tiêm phòng, giấy tờ) vì cần tài khoản — ⟨bổ sung sau khi dùng thử bằng tài khoản demo nhóm PawPass cung cấp⟩.*

## Nhận xét

| Khía cạnh | Điểm mạnh | Gợi ý cải thiện |
|---|---|---|
| **Usability** | Trang Giới thiệu dẫn dắt rất rõ: vấn đề ("Sổ tiêm hay để quên", "Giấy tờ lẫn trong ảnh chụp") → tính năng → "Bắt đầu trong 3 bước". Trên điện thoại không bị tràn ngang, nút đủ to để bấm. | **Vào địa chỉ gốc là thấy ngay màn đăng nhập** — khách mới chưa biết PawPass làm gì; trang Giới thiệu hay hơn nhưng chỉ có 1 link nhỏ phía trên → nên để trang Giới thiệu làm trang đầu cho khách chưa đăng nhập. **Màn đăng nhập thiếu thanh menu** như các trang Giới thiệu/Liên hệ → điều hướng chưa nhất quán. |
| **Aesthetics** | Chủ đề "hộ chiếu" rất sáng tạo và nhất quán: khung hộ chiếu, con dấu "ĐÃ TIÊM · MŨI 2", mèo/cún minh hoạ dễ thương, bảng màu cam–kem ấm áp hợp với người nuôi thú cưng. Thẻ ví dụ bé "Mochi" (3 lần khám, 4 mũi tiêm, 2 giấy tờ) cho thấy ngay sản phẩm trông thế nào. | Dòng báo lỗi đỏ nhỏ trên nền hồng nhạt hơi khó đọc → tăng cỡ chữ hoặc độ đậm. Trên máy tính, phần giới thiệu bên trái màn đăng nhập khá nhỏ so với khoảng trống → có thể phóng to các thẻ tính năng. |
| **User-Friendliness** | Form đăng nhập báo lỗi tiếng Việt dưới từng ô ("Vui lòng nhập email.", "Email không đúng định dạng."), ô lỗi đổi viền đỏ. Form Liên hệ có đếm ký tự 0/1000 và **cảnh báo không ghi thông tin riêng tư** vì lời nhắn công khai — rất chu đáo. Mục Câu hỏi thường gặp dạng mở/đóng. | Chưa có **"Quên mật khẩu"**. Form Liên hệ gửi thành **Issue công khai trên GitHub** — người nuôi thú cưng thường không có tài khoản GitHub → nên có thêm lựa chọn gửi qua email. Nên có **tài khoản demo** (hoặc nút "Dùng thử không cần đăng ký") để người xem trải nghiệm hồ sơ, tiêm phòng trước khi đăng ký. |

## Chi tiết theo kịch bản

| # | Việc | Kết quả | Ghi chú |
|---|---|---|---|
| 1 | Điều hướng trang chủ (mobile + desktop) | Trung bình | Trang gốc là đăng nhập, menu chỉ có ở Giới thiệu/Liên hệ |
| 2 | Tìm nội dung | Dễ | Giới thiệu trình bày rõ, có FAQ |
| 3 | Luồng chính (tạo hồ sơ, tiêm phòng) | Chưa thử | Cần tài khoản |
| 4 | Nhập sai form | Dễ | Lỗi tiếng Việt, viền đỏ |
| 5 | Nhất quán thị giác | Rất tốt | Chủ đề hộ chiếu + minh hoạ thú cưng xuyên suốt |
| 6 | Điện thoại 375px | Tốt | Không tràn ngang, bố cục 1 cột |

## Phản hồi của nhóm được review

⟨Ghi lại điểm nhóm PawPass đồng ý / giải thích sau buổi trao đổi⟩
