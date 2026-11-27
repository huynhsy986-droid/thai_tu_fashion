# Review UI/UX — Let's Talk (Nhóm 3)

| | |
|---|---|
| **Link dự án** | https://let-s-talk-project-frontend.vercel.app |
| **Nhóm được review** | Nhóm 3 — Let's Talk |
| **Người review** | Nguyễn Trần Minh Nguyên (TV2, Nhóm 5 — Thai Tu Fashion) |
| **Ngày dùng thử** | 27/11/2026 |
| **Thiết bị** | Chrome trên máy tính, thử thêm cửa sổ hẹp |
| **Trao đổi trực tiếp** | Qua GitHub Issue [#47](https://github.com/nguyenbaphat59-del/Let-s-Talk-project/issues/47) trên repo nhóm Let's Talk (Nguyên đăng 26/11/2026); nhóm Let's Talk trả lời 27/11/2026 |

**Phạm vi đã dùng thử:** xem repository; trang chủ (chọn Friends · 10 lượt) → màn chơi → bấm "Start Turn" để rút hoạt động.

Mình là Nguyễn Trần Minh Nguyên (nhóm Thai Tu Fashion). Sau khi xem repository và chạy thử bản deploy trên Vercel, xin gửi đến nhóm một số nhận xét:

**1. Điểm mạnh**
- **Ý tưởng và ngữ cảnh rõ ràng:** party game giúp bạn bè, gia đình bỏ điện thoại xuống để trò chuyện; mục đích dễ hiểu ngay từ trang chủ.
- **Tổ chức repository và quy trình làm việc bài bản:** tách rõ các thư mục (backend, database, docs, frontend, tools, .github), có `.env.example`, tài liệu thiết kế và wireframe trong `docs`, lịch sử commit, branch và PR rõ ràng.
- **Giao diện trực quan:** trang chủ chỉ có 2 bước (chọn nhóm chơi → chọn số lượt) rồi bấm "Start Playing"; nút điều hướng chính dễ nhận diện, màn chơi có bộ đếm "Completed 0 / 10".

**2. Điểm cần cải thiện**
- **Màn hình nhỏ còn chật:** ở màn chơi, chip "Friends" trên thanh đầu trang đè lên logo "LET'S TALK" khi cửa sổ hẹp (~800px).
- **Phản hồi khi chuyển lượt chưa rõ:** bấm "Start Turn" thì dòng "Loading the next activity…" hiện rất nhỏ ở cuối màn hình, xa nút vừa bấm, nên dễ tưởng nút không phản hồi.
- **Đối chiếu repo và bản live:** một số nội dung, tính năng ghi trong tài liệu hoặc commit chưa thấy hiển thị đầy đủ trên bản live.

**3. Đề xuất ưu tiên**
- **Ưu tiên 1:** sửa các lỗi ảnh hưởng trực tiếp tới luồng chơi chính hoặc bố cục trên thiết bị di động.
- **Ưu tiên 2:** cập nhật README với hướng dẫn sử dụng ngắn gọn để người đánh giá dễ test nhanh toàn bộ luồng game.

Cảm ơn nhóm đã chia sẻ bài làm, chúc nhóm hoàn thiện bản demo thật mượt!

## Phản hồi của nhóm được review

Nhóm Let's Talk (Võ Duy Anh — frontend) trả lời trong issue [#47](https://github.com/nguyenbaphat59-del/Let-s-Talk-project/issues/47) ngày 27/11/2026, ghi quyết định cho từng góp ý:

| Góp ý | Quyết định của nhóm Let's Talk | Kết quả |
|---|---|---|
| Chưa có phản hồi tải rõ khi bắt đầu lượt chơi | Đồng ý | Đã sửa, PR [#69](https://github.com/nguyenbaphat59-del/Let-s-Talk-project/pull/69) — hiện trạng thái "đang tải lượt tiếp theo" |
| README thiếu hướng dẫn test nhanh | Đồng ý | Đã thêm mục "Test nhanh", PR [#70](https://github.com/nguyenbaphat59-del/Let-s-Talk-project/pull/70) |
| Tài liệu/commit chưa khớp bản live | Đồng ý một phần | Ghi rõ Custom Deck chưa có trên bản live, sửa câu README về kết quả Playwright (PR [#70](https://github.com/nguyenbaphat59-del/Let-s-Talk-project/pull/70)); bảng đối chiếu wireframe ↔ live chưa làm |
| Màn hình nhỏ còn chật | Đồng ý, nhưng hoãn | Chưa kịp trước hạn nộp; issue vẫn mở cho việc tăng vùng bấm và cỡ chữ trên mobile |

Nhóm Let's Talk ghi lại toàn bộ trong `docs/peer-review/received-feedback.md` của repo họ.
