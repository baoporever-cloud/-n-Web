document.addEventListener("DOMContentLoaded", () => {
    // 1. Kiểm tra đăng nhập & Hiển thị Header
    checkLoginStatus();
});

// --- HÀM 1: KIỂM TRA LOGIN & CẬP NHẬT HEADER ---
async function checkLoginStatus() {
    const userStr = localStorage.getItem("user");
    const authSection = document.getElementById("auth-section");

    // Nếu chưa đăng nhập thì đuổi về trang login
    if (!userStr) {
        alert("Vui lòng đăng nhập để nạp thẻ!");
        window.location.href = "/user/html/login.html";
        return;
    }

    if (authSection) {
        let user = JSON.parse(userStr);
        // Xử lý linh hoạt: Lấy Username hoặc username đều được
        const username = user.Username || user.username; 

        // --- TỰ ĐỘNG CẬP NHẬT SỐ DƯ TỪ SERVER ---
        try {
            const res = await fetch(`/api/user/me/${username}`);
            const data = await res.json();
            if (data.success) {
                user = data.user; 
                localStorage.setItem("user", JSON.stringify(user));
            }
        } catch (err) {
            console.error("Lỗi cập nhật số dư:", err);
        }
        // ----------------------------------------

        // Hiển thị lên Header
        const currentBalance = user.Balance || user.balance || 0;
        const moneyFormat = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentBalance);
        
        // Cần lấy lại username chuẩn sau khi update
        const displayName = user.Username || user.username;

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
}
function logout() {
    if(confirm("Bạn muốn đăng xuất?")) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        window.location.reload(); 
    }
}