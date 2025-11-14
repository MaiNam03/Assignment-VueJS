# Báo cáo phân tích & thiết kế ứng dụng quản lý cửa hàng (Vue + JSON Server)

## 1. Mục tiêu & phạm vi
- Xây dựng dashboard quản trị cho quán cà phê/tiệm ăn với 3 nghiệp vụ chính: quản lý sản phẩm, đơn hàng, khách hàng.
- Hỗ trợ phân quyền 2 vai trò:
  - **Admin**: toàn quyền CRUD mọi thực thể.
  - **Nhân viên bán hàng (Sales)**: đọc sản phẩm, được phép tạo/cập nhật khách hàng, đơn hàng nhưng không được xoá và không được chỉnh sửa/xoá sản phẩm.
- Dữ liệu phải được lưu trực tiếp vào `db.json`, dễ dàng nhân bản khi triển khai/tập huấn.

## 2. Tổng quan kiến trúc

| Lớp | Công nghệ | Mô tả |
| --- | --- | --- |
| Giao diện (Client) | Vue 3, Vite, Composition API, TailwindCSS | Giao diện SPA hiển thị bảng, modal CRUD, biểu đồ thống kê. |
| API trung gian | `json-server` tùy biến (`server.cjs`) chạy Node.js | Phơi bày REST API CRUD `products`, `orders`, `customers`, `users` + endpoint `/login` và middleware kiểm tra quyền. |
| Lưu trữ | File `db.json` | Coi như database NoSQL mini, đồng thời là fixture để demo. |

Luồng chính:
1. Người dùng mở SPA → bắt buộc đăng nhập (admin/sales).
2. Client gọi `POST /login` lấy token (base64 chứa role).
3. Token được lưu `localStorage` và chèn vào mọi request (`Authorization: Bearer ...`).
4. Server xác thực token + kiểm tra quyền theo ma trận `rolePermissions`.
5. Nếu hợp lệ, request được chuyển tiếp vào router của json-server, ghi/đọc thẳng `db.json`.

## 3. Thiết kế chi tiết

### 3.1 Dữ liệu & mô hình
- `products`: `{ id, name, description, price, category, status, ordersCount, revenue, image }`
- `customers`: `{ id, name, email, phone, tier, address, notes, totalOrders, totalSpend, joinedAt }`
- `orders`: `{ id, customer, items, total, status, createdAt, address, payment }`
- `users`: `{ id, username, password (plaintext cho demo), name, role }`

### 3.2 API

| Phương thức | Đường dẫn | Quyền | Mô tả |
| --- | --- | --- | --- |
| `POST /login` | Public | - | Trả `{ token, user }`. |
| CRUD `/products` | Admin | - | Admin mới có thể POST/PATCH/DELETE, sales chỉ GET. |
| CRUD `/customers` | GET: admin/sales; POST/PATCH: admin/sales; DELETE: admin | Quản lý khách hàng. |
| CRUD `/orders` | GET: admin/sales; POST/PATCH: admin/sales; DELETE: admin | Quản lý đơn hàng. |
| `GET /users` | Admin | Dùng nội bộ hoặc mở rộng trang quản trị người dùng. |

### 3.3 Giao diện & trạng thái frontend
- `src/App.vue` giữ toàn bộ state: `products`, `orders`, `customers`, `authToken`, `currentUser`.
- Component chính:
  - `OverviewDashboard`: hiển thị KPI, biểu đồ.
  - `ProductTable`, `CustomerTable`, `OrderTable`: bảng có tìm kiếm, phân trang, truyền props `can-manage`, `can-delete`, `can-update-status` để vô hiệu hóa nút theo vai trò.
  - Modal `AddProductModal`, `AddCustomerModal`: thu thập dữ liệu, bắn sự kiện `save`.
- `src/services/api.js` đóng gói fetch với:
  - `setAuthToken()` để cập nhật header.
  - `api.login` cho form đăng nhập.
  - Hàm CRUD tương ứng từng thực thể.

### 3.4 Phân quyền phía client
- Sau khi đăng nhập, SPA lưu token/user vào `localStorage`.
- Các handler (ví dụ `handleDeleteProduct`) đều gọi `requirePermission(condition, message)` trước khi hit API để tránh thao tác trái phép.
- UI disable nút/ select nếu người dùng không đủ quyền, giúp UX rõ ràng.

## 4. Hướng dẫn cài đặt & chạy

### 4.1 Yêu cầu môi trường
- Node.js >= 18.
- npm (đi kèm Node).

### 4.2 Các bước
```bash
# 1. Cài dependencies
npm install

# 2. Chạy REST API với phân quyền
npm run api
# Giữ terminal này mở, sẽ log: Role-based json-server is running at http://localhost:4000

# 3. Mở terminal khác để chạy frontend
npm run dev
# Mặc định Vite chạy ở http://localhost:5173
```

### 4.3 Đăng nhập demo
- Admin: `admin / admin123`
- Sales: `sales / sales123`

## 5. Khả năng mở rộng
- Có thể thay thế `db.json` bằng database thật (MongoDB, PostgreSQL) 
- Bổ sung refresh token, mã hoá mật khẩu (BCrypt) nếu đưa vào sản phẩm thực tế.
- Tách chức năng thống kê (Overview) thành micro-service (ví dụ Cloud Functions) khi cần realtime chart.

## 6. Kết luận
Giải pháp hiện tại đáp ứng yêu cầu Y2:
1. Có REST API quản lý sản phẩm/đơn hàng/khách hàng lưu trữ vào `db.json`.
2. Có cơ chế phân quyền rõ ràng giữa admin và nhân viên bán hàng, được enforce ở cả backend lẫn frontend.

Kiến trúc client nhẹ + json-server giúp triển khai nhanh cho các bài tập/thử nghiệm; đồng thời giữ cấu trúc đủ rõ ràng để nâng cấp lên hệ thống sản xuất sau này.

