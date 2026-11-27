# Task 5 · UI/UX Peer Review

**Điều phối:** TV1 – lequangkhanh6002-pixel · Mỗi thành viên tham gia review và trao đổi trực tiếp.

## Quy trình

1. Chọn **ít nhất 2 nhóm** khác, xin link web đang chạy + tài khoản dùng thử.
2. Mỗi thành viên dùng thử theo kịch bản bên dưới (≈20 phút/nhóm), ghi nhận xét vào bản sao của [`review-template.md`](review-template.md) → `review-<tên-nhóm>.md`.
3. Họp nhóm gộp nhận xét, chọn góp ý cụ thể nhất (kèm ảnh chụp).
4. **Trao đổi trực tiếp** với nhóm được review (ghi ngày, người tham dự vào file review).
5. Chép bảng tổng hợp vào README → Task 5 (a).

## Kịch bản dùng thử (giống nhau cho mọi nhóm)

| # | Việc | Khía cạnh |
|---|---|---|
| 1 | Mở trang chủ trên điện thoại và máy tính, tìm điều hướng chính | Usability, Aesthetics |
| 2 | Tìm một sản phẩm/nội dung cụ thể (tìm kiếm, lọc) | Usability |
| 3 | Hoàn thành luồng chính của web (VD: đặt hàng, đăng ký) | User-Friendliness |
| 4 | Cố tình nhập sai form, xem thông báo lỗi | User-Friendliness |
| 5 | Kiểm tra màu, chữ, khoảng cách, ảnh có nhất quán không | Aesthetics |
| 6 | Dùng bàn phím (Tab) và phóng to 200% | Usability (tiếp cận) |

## Đã review

| Nhóm | Dự án | File |
|---|---|---|
| Nhóm FocuSpace | https://focuspace-iota.vercel.app | [review-focuspace.md](review-focuspace.md) |
| Nhóm PawPass | https://pawpass-hosothucung-web.vercel.app | [review-pawpass.md](review-pawpass.md) |

## Góp ý nhóm mình nhận được

Mỗi góp ý tạo **1 issue** nhãn `task-5-peer-review`, ghi nguồn. Quyết định:

- **Implement** → branch `feature/<issue>-…`, PR `Closes #…`, chụp ảnh trước/sau vào `docs/peer-review/`.
- **Không implement** → ghi lý do cụ thể (ngoài phạm vi, mâu thuẫn PRD, chi phí lớn…) vào bảng README Task 5 (b).

| Feedback | Nguồn (nhóm nào) | Quyết định | Lý do / Commit |
|---|---|---|---|
| Thanh thông báo chạy nhanh/giật, mọi dòng dẫn cùng trang, trình đọc màn hình đọc lặp | Let's Talk [#51](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/51), Nhóm 2 [#52](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/52) | ✅ Implement | Chậm hơn, dừng khi rê chuột, link đúng trang, `aria-hidden` bản sao — [PR #54](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/54) |
| Nhãn giảm giá "19%" dễ hiểu nhầm | Let's Talk [#51](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/51) | ✅ Implement | Đổi thành "−19%" — [PR #54](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/54) |
| Nút "+" trên ảnh trang chủ phải bấm mới biết là món gì | Nhóm 4 [#53](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/53), Nhóm 2 [#52](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/52) | ✅ Implement | Tooltip tên + giá; cảm ứng chạm 2 lần — [PR #55](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/55) |
| Thêm vào giỏ không thấy thông báo | Nhóm 4 [#53](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/53) | ✅ Implement | Đã có toast nhưng ngắn, dễ lỡ → thêm ảnh/size, hiện 6 giây, dừng khi rê chuột — [PR #55](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/55) |
| Lỗi "Hãy chọn size" chữ nhỏ, dễ bỏ qua | Nhóm 4 [#53](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/53) | ✅ Implement | Viền đỏ + rung hàng size, chữ lỗi to hơn — [PR #55](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/55) |
| Người dùng thường thấy "Khu quản trị" | Nhóm 2 [#52](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/52) | ✅ Implement | Chỉ hiện với admin — [PR #56](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/56) |
| Mã đơn lẫn trong câu xác nhận | Nhóm 2 [#52](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/52) | ✅ Implement | Ô mã đơn riêng + nút "Đơn hàng của tôi" — [PR #56](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/56) |
| "Gợi ý cho bạn" trống với khách mới | Nhóm 2 [#52](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/52) | ✅ Implement | Hiện món bán chạy khi chưa có dữ liệu — [PR #56](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/56) |
| Ô "Nhận tin" vẫn hiện sau khi đăng ký | Nhóm 2 [#52](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/52) | ✅ Implement một phần | Ẩn sau khi đăng ký — [PR #56](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/56); tuỳ chọn trong trang tài khoản để đợt sau |
| Thu nhỏ cửa sổ mất biểu tượng giỏ hàng | Nhóm 2 [#52](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/52) | ✅ Implement | Biểu tượng giỏ kèm số lượng luôn hiện — [PR #56](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/56) |
| Mục Tài khoản/Giới thiệu/Liên hệ trong menu khác chữ | Nhóm 2 [#52](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/52) | ✅ Implement | Đồng bộ cỡ, độ đậm chữ — [PR #56](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/56) |
| Đổi size khi đơn đang chờ xác nhận | Nhóm 2 [#52](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/52) | ❌ Không implement | Phải tính lại tồn kho và tiền trong đơn (đổi nghiệp vụ `place_order`); khách có thể huỷ đơn đang chờ rồi đặt lại |
| Smart Studio: sắp lớp theo vùng cơ thể, đồ khớp dáng người mẫu | Nhóm 2 [#52](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/52) | ❌ Không implement | Thử đồ là mô phỏng; khớp dáng cần ảnh dựng riêng từng món → hướng phát triển |
| Ảnh sản phẩm khác ảnh người mẫu trang chủ | Nhóm 4 [#53](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/53) | ❌ Không implement | Chưa có bộ ảnh người mẫu cho 66 sản phẩm |
| Gom menu thành mega-menu; bỏ định tuyến `#` | Let's Talk [#51](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/51) | ❌ Không implement | Giữ thiết kế đã duyệt; đổi router là thay kiến trúc, rủi ro cao sát hạn nộp |
| Khung tải lâu; vùng bấm/chữ nhỏ; ảnh thiếu `width/height`; tự tải thêm thay "Xem thêm" | Nhóm 4 [#53](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/53), Let's Talk [#51](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/51), Nhóm 2 [#52](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/52) | ⏳ Ghi nhận | Đưa vào đợt tối ưu tiếp theo; đã trả lời trong từng issue |

Nhận **3 issue** góp ý ([#51](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/51), [#52](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/52), [#53](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/53)); mỗi issue được trả lời bằng bảng quyết định và đóng bằng PR (`Closes #…`). Mỗi PR có test E2E riêng (`frontend/e2e/feedback-5x.spec.js`).
