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

// --- HÀM 2: XỬ LÝ NẠP THẺ ---
async function handleDeposit() {
    const userStr = localStorage.getItem("user");
    if (!userStr) return; // Đã check ở trên rồi

    const user = JSON.parse(userStr);
    // Lấy username an toàn (tránh lỗi undefined)
    const username = user.Username || user.username; 

    // 1. Lấy dữ liệu từ Form
    const cardType = document.getElementById("card-type").value;
    const serial = document.getElementById("card-serial").value.trim();
    const code = document.getElementById("card-code").value.trim();
    const amount = document.getElementById("card-amount").value;

    // 2. Validate
    if (!cardType || !amount) {
        alert("Vui lòng chọn loại thẻ và mệnh giá!");
        return;
    }
    if (!serial || !code) {
        alert("Vui lòng nhập đầy đủ Seri và Mã thẻ!");
        return;
    }

    // 3. Gửi về Server
    try {
        const res = await fetch('/api/topup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username, // Gửi username chuẩn
                cardType: cardType,
                serial: serial,
                code: code,
                amount: amount
            })
        });

        const result = await res.json();

        if (result.success) {
            alert("✅ Gửi thẻ thành công! Vui lòng chờ Admin duyệt.");
            // Reset form
            document.getElementById("card-serial").value = "";
            document.getElementById("card-code").value = "";
        } else {
            alert("❌ Lỗi: " + result.message);
        }

    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối Server!");
    }
}

// --- HÀM 3: ĐĂNG XUẤT ---
function logout() {
    if(confirm("Bạn muốn đăng xuất?")) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        window.location.reload(); 
    }
}
// --- LOGIC TAB & NGÂN HÀNG ---

// 1. Chuyển đổi giữa Tab Thẻ cào và Ngân hàng
function switchTab(type) {
    const formCard = document.getElementById("form-card");
    const formBank = document.getElementById("form-bank");
    const btns = document.querySelectorAll(".tab-btn");

    if (type === 'card') {
        formCard.style.display = "block";
        formBank.style.display = "none";
        btns[0].classList.add("active");
        btns[1].classList.remove("active");
    } else {
        formCard.style.display = "none";
        formBank.style.display = "block";
        btns[0].classList.remove("active");
        btns[1].classList.add("active");
        
        // Khi bấm sang tab ngân hàng, tạo QR mặc định
        updateQR();
    }
}

// 2. Cập nhật QR Code tự động (Dùng API VietQR)
function updateQR() {
    const user = JSON.parse(localStorage.getItem("user"));
    const username = user ? (user.Username || user.username) : "KHACH";
    
    // CẤU HÌNH NGÂN HÀNG CỦA BẠN TẠI ĐÂY
    const BANK_ID = "MB";           // Mã ngân hàng (MB, VCB, ACB...)
    const ACCOUNT_NO = "0972916258"; // Số tài khoản của bạn
    const TEMPLATE = "compact2";    // Giao diện QR

    // Nội dung chuyển khoản: NAPTIEN [Tên_User]
    const content = `NAPTIEN ${username}`; 
    document.getElementById("bank-content").innerText = content;

    // Lấy số tiền khách nhập (nếu không nhập thì để trống để khách tự điền trên app)
    let amount = document.getElementById("bank-amount").value;
    
    // Tạo link QR
    let qrURL = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-${TEMPLATE}.png?addInfo=${content}`;
    
    if (amount) {
        qrURL += `&amount=${amount}`;
    }

    document.getElementById("qr-image").src = qrURL;
}

// 3. Hàm Copy tiện lợi
function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert("Đã copy: " + text);
}

function copyContent() {
    const text = document.getElementById("bank-content").innerText;
    navigator.clipboard.writeText(text);
    alert("Đã copy nội dung chuyển khoản!");
}
// --- HÀM XỬ LÝ KHI KHÁCH BẤM "ĐÃ CHUYỂN KHOẢN XONG" ---
async function handleBankDeposit() {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
        alert("Vui lòng đăng nhập!");
        return;
    }
    const user = JSON.parse(userStr);
    const username = user.Username || user.username;

    // 1. Lấy số tiền khách nhập
    const amount = document.getElementById("bank-amount").value;

    // 2. Validate (Kiểm tra lỗi)
    if (!amount || amount < 10000) {
        alert("Vui lòng nhập số tiền hợp lệ (Tối thiểu 10.000đ)!");
        return;
    }

    if (!confirm(`Bạn xác nhận đã chuyển khoản ${new Intl.NumberFormat('vi-VN').format(amount)}đ cho Admin?`)) {
        return;
    }

    // 3. Gửi yêu cầu về Server (Tái sử dụng API nạp thẻ)
    // Mẹo: Biến tấu các trường Serial/Code để lưu thông tin ngân hàng
    try {
        const res = await fetch('/api/topup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                cardType: 'MB Bank',         // Loại thẻ -> Tên ngân hàng
                amount: amount,              // Mệnh giá -> Số tiền nạp
                serial: 'QR_ONLINE',         // Seri -> Đánh dấu là nạp QR
                code: `NAPTIEN ${username}`  // Mã thẻ -> Nội dung chuyển khoản
            })
        });

        const result = await res.json();

        if (result.success) {
            alert("✅ Đã gửi yêu cầu thành công!\n\nHệ thống đang kiểm tra giao dịch của bạn. Tiền sẽ được cộng sau 1-3 phút.");
            // Reset ô nhập
            document.getElementById("bank-amount").value = "";
            updateQR(); // Reset lại ảnh QR
        } else {
            alert("❌ Lỗi: " + result.message);
        }

    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối Server!");
    }
}