document.addEventListener("DOMContentLoaded", () => {
  
  // --- 1. KIỂM TRA ĐĂNG NHẬP (Chạy ngay khi load trang) ---
  checkLoginStatus();

  // --- 2. XỬ LÝ SỰ KIỆN NÚT LỌC (SEARCH) ---
  const btnFilter = document.getElementById("btnFilter");
  const inputKeyword = document.getElementById("keyword");
  const selectGame = document.getElementById("game");

  if (btnFilter) {
    btnFilter.addEventListener("click", () => {
      const keyword = inputKeyword.value.trim().toLowerCase();
      const gameType = selectGame.value.trim().toLowerCase(); // Lấy value từ thẻ select (lmht, tft, lq...)

      // Lấy tất cả các thẻ game đang có trên màn hình
      const cards = document.querySelectorAll(".game-card");

      cards.forEach((card) => {
        // Lấy tiêu đề game trong thẻ h3
        const titleElement = card.querySelector("h3");
        if (!titleElement) return;
        
        const title = titleElement.textContent.toLowerCase();

        // Logic kiểm tra từ khóa
        const matchKeyword = keyword === "" || title.includes(keyword);

        // Logic kiểm tra loại game (Dùng hàm phụ trợ checkGameType)
        // Nếu không chọn game (gameType === "") thì mặc định là đúng
        const matchGame =
          gameType === "" ||
          title.includes(gameType) ||
          checkGameType(title, gameType);

        // Ẩn/Hiện thẻ
        if (matchKeyword && matchGame) {
            // Dùng display flex hoặc block tùy theo css của bạn, ở đây để rỗng để nó về mặc định của CSS
            card.style.display = ""; 
        } else {
            card.style.display = "none";
        }
      });
    });
  }
});

// --- HÀM PHỤ TRỢ: KIỂM TRA LOẠI GAME ---
function checkGameType(title, type) {
  // Map các từ khóa viết tắt sang tên đầy đủ trong tiêu đề
  if (type === "lmht" && (title.includes("liên minh") || title.includes("lmht"))) return true;
  if (type === "tft" && (title.includes("đtcl") || title.includes("tft") || title.includes("đấu trường"))) return true;
  if (type === "lq" && (title.includes("liên quân") || title.includes("lq"))) return true;
  if (type === "ff" && (title.includes("free fire") || title.includes("ff"))) return true;
  if (type === "tc" && (title.includes("tốc chiến") || title.includes("tc"))) return true;
  if (type === "val" && (title.includes("valorant") || title.includes("val"))) return true;
  return false;
}

// --- HÀM XỬ LÝ ĐĂNG NHẬP / ĐĂNG XUẤT ---
function checkLoginStatus() {
  const userStr = localStorage.getItem("user");
  const authSection = document.getElementById("auth-section");

  if (userStr && authSection) {
    const user = JSON.parse(userStr);
    const moneyFormat = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(user.balance || 0);

    authSection.innerHTML = `
        <div class="user-info-display">
            <span cspanlass="user-name" >Hi, ${user.username}</span>
            <span class="user-balance">${moneyFormat}</span>
            <button class="btn-logout" onclick="logout()">Thoát</button>
        </div>
    `;
  }
}

function logout() {
  if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.reload();
  }
}
// --- HÀM KIỂM TRA ĐĂNG NHẬP (PHIÊN BẢN SỬA LỖI UNDEFINED) ---
async function checkLoginStatus() {
    const userStr = localStorage.getItem("user");
    const authSection = document.getElementById("auth-section");

    // Nếu không có chỗ hiển thị hoặc chưa đăng nhập thì thôi
    if (!authSection) return;
    if (!userStr) {
        // Đảm bảo hiện nút Đăng nhập/Đăng ký nếu chưa login
        authSection.innerHTML = `
            <a class="btn-outline" href="/user/html/login.html">Đăng Nhập</a>
            <a class="btn-primary" href="/user/html/register.html">Đăng Ký</a>
        `;
        return;
    }

    let user = JSON.parse(userStr);

    // 1. Lấy tên đăng nhập an toàn (Chấp nhận cả Username và username)
    // Đây là dòng quan trọng nhất để sửa lỗi undefined
    const username = user.Username || user.username; 

    // Nếu dữ liệu bị lỗi hẳn (không có tên), tự động đăng xuất để tránh lỗi web
    if (!username) {
        localStorage.removeItem("user");
        location.reload();
        return;
    }

    // 2. Gọi Server cập nhật số dư mới nhất
    try {
        const res = await fetch(`/api/user/me/${username}`);
        const data = await res.json();
        
        if (data.success) {
            user = data.user; 
            localStorage.setItem("user", JSON.stringify(user)); // Lưu cái mới vào
        }
    } catch (err) {
        console.error("Lỗi cập nhật số dư:", err);
    }

    // 3. Hiển thị ra màn hình (Tiếp tục dùng logic "hoặc" || để tránh lỗi)
    const displayName = user.Username || user.username;
    const balance = user.Balance || user.balance || 0;
    const moneyFormat = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(balance);

    authSection.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; font-size: 13px;">
            <a href="/user/html/profile.html" style="color: white; font-weight: 600; text-decoration: none; border-bottom: 1px dashed #fff;">
                Hi, ${displayName}
            </a>
            <span style="color: #ffc107; font-weight: bold;">(${moneyFormat})</span>
            <button onclick="logout()" style="background: #e53935; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Thoát</button>
        </div>
    `;
}

// --- HÀM ĐĂNG XUẤT ---
function logout() {
    if(confirm("Bạn muốn đăng xuất?")) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        window.location.href = "/index.html"; // Quay về trang chủ
    }
}
// --- HÀM 4: MUA HÀNG (ĐÃ CẬP NHẬT) ---
async function buyNow(id) {
    // 1. Kiểm tra đăng nhập
    const userStr = localStorage.getItem("user");
    if (!userStr) {
        alert("Vui lòng đăng nhập để mua tài khoản!");
        window.location.href = "/user/login.html";
        return;
    }

    const user = JSON.parse(userStr);
    const username = user.Username || user.username;

    // 2. Hỏi xác nhận
    if (!confirm(`Bạn có chắc muốn mua Acc mã số #${id}?`)) return;

    // 3. Gọi Server xử lý
    try {
        const res = await fetch('/api/buy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, productId: id })
        });

        const result = await res.json();

        if (result.success) {
            // A. Thông báo thành công và hiện Acc
            alert(`✅ MUA THÀNH CÔNG!\n\n(Bạn có thể xem lại trong trang cá nhân)`);
            
            // B. Cập nhật lại số dư trên Header ngay lập tức
            checkLoginStatus(); 

            // C. Tải lại danh sách sản phẩm để ẩn acc vừa mua đi
            // (Lấy lại categoryCode từ URL để reload đúng trang)
            let categoryCode = '';
            const path = window.location.pathname;
            if (path.includes('lmht_giamgia')) categoryCode = 'LMHT_SALE';
            else if (path.includes('lmht_thongthao')) categoryCode = 'LMHT_ZIN';
            else if (path.includes('lmht')) categoryCode = 'LMHT'; 
            // ... (Thêm các code khác nếu cần) ...
            
            if(categoryCode) loadProducts(categoryCode);

        } else {
            alert("❌ Lỗi: " + result.message);
        }

    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối Server!");
    }
}

// --- CÁC HÀM XỬ LÝ MODAL MUA HÀNG (GIỮ NGUYÊN NẾU CẦN DÙNG) ---
// Lưu ý: Các hàm này cần biến 'currentAccounts' nếu bạn dùng dữ liệu động.
// Nếu bạn chỉ dùng HTML tĩnh thì các hàm openDetail/openBuy bên dưới có thể không chạy được
// trừ khi bạn khai báo mảng currentAccounts.
// Tuy nhiên, phần lọc ở trên đã hoạt động độc lập với DOM.