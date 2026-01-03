// Đổi base URL này nếu bạn deploy lên host khác
const API_BASE = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector(".login-form");
  const registerForm = document.querySelector(".register-form");

  if (loginForm) setupLoginForm(loginForm);
  if (registerForm) setupRegisterForm(registerForm);
});

// --- XỬ LÝ ĐĂNG NHẬP ---
function setupLoginForm(form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = form.querySelector("#username").value.trim();
    const password = form.querySelector("#password").value.trim();

    if (!username || !password) {
      alert("Vui lòng nhập đầy đủ tài khoản và mật khẩu.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Đăng nhập thất bại.");
        return;
      }

      // Lưu thông tin vào LocalStorage
      if (data.token) localStorage.setItem("token", data.token);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));

      alert("Đăng nhập thành công!");

      // --- PHÂN QUYỀN CHUYỂN TRANG ---
      // Kiểm tra Role từ server gửi về
      const role = data.user.role; 
      
      if (role === 'Admin') {
          // Nếu là Admin -> Chuyển sang trang quản trị
          window.location.href = "/user/html/admin.html"; 
      } else {
          // Nếu là User thường -> Chuyển sang trang shop
          window.location.href = "/index.html"; 
      }

    } catch (err) {
      console.error(err);
      alert("Không thể kết nối đến Server. Hãy kiểm tra xem server.js đã chạy chưa!");
    }
  });
}

// --- XỬ LÝ ĐĂNG KÝ ---
function setupRegisterForm(form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = form.querySelector("#username").value.trim();
    const email = form.querySelector("#email").value.trim();
    const password = form.querySelector("#password").value.trim();
    const confirm = form.querySelector("#confirm").value.trim();

    if (!username || !email || !password || !confirm) {
      alert("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (password !== confirm) {
      alert("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Đăng ký thất bại.");
        return;
      }

      alert("Đăng ký thành công! Vui lòng đăng nhập.");
      window.location.href = "/user/html/login.html"; 
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối server.");
    }
  });
}