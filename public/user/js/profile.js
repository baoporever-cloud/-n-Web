document.addEventListener("DOMContentLoaded", () => {
    checkProfileLogin();
});

async function checkProfileLogin() {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
        window.location.href = "login.html";
        return;
    }

    let user = JSON.parse(userStr);
    const username = user.Username || user.username; // Sửa lỗi undefined

    // 1. Cập nhật thông tin mới nhất từ Server
    try {
        const res = await fetch(`/api/user/me/${username}`);
        const data = await res.json();
        if (data.success) {
            user = data.user;
            localStorage.setItem("user", JSON.stringify(user));
        }
    } catch (e) { console.error(e); }

    // 2. Điền thông tin vào thẻ User (Bên trái)
    document.getElementById("p-username").innerText = user.Username || user.username;
    document.getElementById("p-role").innerText = user.Role || "Thành viên";
    
    const balance = user.Balance || user.balance || 0;
    document.getElementById("p-balance").innerText = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(balance);

    // 3. Tải dữ liệu lịch sử
    loadOrders(username);
    loadDeposits(username);
}

// --- TẢI LỊCH SỬ MUA ACC ---
async function loadOrders(username) {
    const tbody = document.getElementById("order-list");
    try {
        const res = await fetch(`/api/user/orders/${username}`);
        const list = await res.json();

        tbody.innerHTML = "";
        if (list.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:20px;'>Bạn chưa mua acc nào.</td></tr>";
            return;
        }

        list.forEach(item => {
            const date = new Date(item.OrderDate).toLocaleDateString('vi-VN');
            const price = new Intl.NumberFormat('vi-VN').format(item.Price);
            
            const row = `
                <tr>
                    <td style="color:#00b4ff; font-weight:600">${item.Title}</td>
                    <td>
                        <div class="acc-info">
                            TK: ${item.GameAccount}<br>
                            MK: ${item.GamePassword}
                        </div>
                    </td>
                    <td style="color:#ffc107; font-weight:bold">${price} đ</td>
                    <td style="color:#8b949e; font-size:12px">${date}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (err) { console.error(err); }
}

// --- TẢI LỊCH SỬ NẠP THẺ ---
async function loadDeposits(username) {
    const tbody = document.getElementById("deposit-list");
    try {
        const res = await fetch(`/api/user/deposits/${username}`);
        const list = await res.json();

        tbody.innerHTML = "";
        if (list.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:20px;'>Chưa có giao dịch nạp tiền.</td></tr>";
            return;
        }

        list.forEach(item => {
            const date = new Date(item.CreatedAt).toLocaleString('vi-VN');
            const amount = new Intl.NumberFormat('vi-VN').format(item.Amount);
            
            // Dịch trạng thái sang tiếng Việt
            let statusText = "Chờ duyệt";
            if (item.Status === 'Approved') statusText = "Thành công";
            if (item.Status === 'Rejected') statusText = "Thất bại";

            const row = `
                <tr>
                    <td>${item.CardType}</td>
                    <td style="color:#00e676; font-weight:bold">${amount} đ</td>
                    <td style="font-family:monospace; font-size:12px">
                        SR: ${item.Serial}<br>Code: ${item.Code}
                    </td>
                    <td class="status-${item.Status}">${statusText}</td>
                    <td style="color:#8b949e; font-size:12px">${date}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (err) { console.error(err); }
}

// --- CHUYỂN TAB ---
function switchTab(tabName) {
    // Ẩn hết
    document.getElementById("tab-orders").style.display = "none";
    document.getElementById("tab-deposits").style.display = "none";
    
    // Bỏ active nút
    const buttons = document.querySelectorAll(".menu-item");
    buttons.forEach(b => b.classList.remove("active"));

    // Hiện tab được chọn
    document.getElementById(`tab-${tabName}`).style.display = "block";
    event.target.classList.add("active");
}
// --- 1. MỞ MODAL SỬA PROFILE ---
function openEditProfile() {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    const user = JSON.parse(userStr);

    // Điền dữ liệu hiện tại vào ô
    document.getElementById("edit-username").value = user.Username || user.username;
    document.getElementById("edit-email").value = user.Email || user.email || "";
    document.getElementById("edit-new-pass").value = ""; // Pass mới để trống
    document.getElementById("edit-old-pass").value = ""; // Pass cũ bắt buộc nhập

    document.getElementById("profile-modal").style.display = "block";
}

// --- 2. ĐÓNG MODAL ---
function closeEditProfile() {
    document.getElementById("profile-modal").style.display = "none";
}

// --- 3. GỬI YÊU CẦU CẬP NHẬT ---
// --- 3. GỬI YÊU CẦU CẬP NHẬT (PHIÊN BẢN KHÔNG ĐĂNG XUẤT) ---
async function submitEditProfile() {
    const userStr = localStorage.getItem("user");
    const currentUser = JSON.parse(userStr);

    const newUsername = document.getElementById("edit-username").value;
    const newEmail = document.getElementById("edit-email").value;
    const newPassInput = document.getElementById("edit-new-pass").value;
    const oldPassword = document.getElementById("edit-old-pass").value;

    if (!oldPassword) {
        alert("Vui lòng nhập mật khẩu hiện tại để xác nhận!");
        return;
    }

    const newPassword = newPassInput ? newPassInput : oldPassword;

    const data = {
        currentUsername: currentUser.Username || currentUser.username,
        newUsername: newUsername,
        newEmail: newEmail,
        oldPassword: oldPassword,
        newPassword: newPassword
    };

    try {
        const res = await fetch('/api/user/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (result.success) {
            alert("✅ Cập nhật thành công!");
            
            // --- SỬA ĐỔI Ở ĐÂY: CẬP NHẬT LOCALSTORAGE ---
            
            // 1. Cập nhật tên và email mới vào biến user hiện tại
            // (Kiểm tra cả chữ hoa/thường để tránh lỗi dữ liệu)
            if (currentUser.Username !== undefined) currentUser.Username = newUsername;
            if (currentUser.username !== undefined) currentUser.username = newUsername;
            
            if (currentUser.Email !== undefined) currentUser.Email = newEmail;
            if (currentUser.email !== undefined) currentUser.email = newEmail;

            // 2. Lưu lại thông tin mới vào bộ nhớ trình duyệt
            localStorage.setItem("user", JSON.stringify(currentUser));

            // 3. Đóng popup và tải lại trang để hiển thị tên mới
            closeEditProfile();
            window.location.reload(); 
            
        } else {
            alert("❌ Lỗi: " + result.message);
        }

    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối Server!");
    }
}

function logout() {
    if(confirm("Đăng xuất khỏi tài khoản?")) {
        localStorage.removeItem("user");
        window.location.href = "/index.html";
    }
}