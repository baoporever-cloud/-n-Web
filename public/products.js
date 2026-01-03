document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. KIỂM TRA ĐĂNG NHẬP NGAY LẬP TỨC ---
    checkLoginStatus();

    // --- 2. LOGIC TẢI SẢN PHẨM (Code cũ của bạn) ---
    let categoryCode = '';
    const path = window.location.pathname;

    // Phân loại trang
    if (path.includes('lmht_giamgia')) categoryCode = 'LMHT_SALE';
    else if (path.includes('lmht_thongthao')) categoryCode = 'LMHT_ZIN';
    else if (path.includes('lmht_svnuocngoai')) categoryCode = 'LMHT_FOREIGN';
    else if (path.includes('lmht')) categoryCode = 'LMHT'; 
    else if (path.includes('lienquan')) categoryCode = 'LQ';
    else if (path.includes('freefire')) categoryCode = 'FF';
    else if (path.includes('thuvanmaypettim')) categoryCode = 'TVM';
    else if (path.includes('sanpettim')) categoryCode = 'SPT';
    else if (path.includes('dtcl_tuchon')) categoryCode = 'DTCL_SELEC';
    else if (path.includes('dtcl_pettim')) categoryCode = 'DTCL_PET';

    else if (path.includes('tocchien')) categoryCode = 'TC';
    else if (path.includes('valorant')) categoryCode = 'VAL';

    // Gọi hàm tải dữ liệu nếu xác định được mã game
    if (categoryCode) {
        loadProducts(categoryCode);
    }
});

// --- HÀM 1: TẢI SẢN PHẨM ---
async function loadProducts(code) {
    const grid = document.getElementById("product-list");
    if (!grid) return;

    try {
        // Nếu là mã LMHT_SALE nhưng trong DB bạn chưa tạo CategoryCode này thì nó sẽ không tìm thấy.
        // Tạm thời nếu test lỗi, bạn có thể thử đổi code thành 'LMHT' để xem nó hiện gì không.
        const res = await fetch(`/api/products/${code}`);
        const products = await res.json();

        grid.innerHTML = "";

        if (products.length === 0) {
            grid.innerHTML = "<p style='color:white; text-align:center; width:100%'>Hiện chưa có acc nào.</p>";
            return;
        }

        products.forEach(acc => {
            const price = new Intl.NumberFormat('vi-VN').format(acc.Price);
            
            const card = document.createElement("div");
            card.className = "game-card"; // Class này sẽ nhận CSS bạn vừa thêm
            
            card.innerHTML = `
    <div class="card-img-wrap" onclick="window.location.href='/detail.html?id=${acc.ProductID}'" style="cursor: pointer;">
        <img src="${acc.ImageURL}" alt="${acc.Title}" onerror="this.src='https://via.placeholder.com/300'">
    </div>
    
    <h3 onclick="window.location.href='/detail.html?id=${acc.ProductID}'" style="cursor: pointer;">
        ${acc.Title}
    </h3>

    <p style="font-size: 12px; color: #ccc; ...">
        ${acc.Description || '...'}
    </p>

    <p>Mã số: #${acc.ProductID}</p>
    <p style="color: #ffc107; font-weight: bold; font-size: 16px;">${price} VNĐ</p>
    
    <div style="display: flex; gap: 10px; padding: 0 15px 15px;">
        <button onclick="window.location.href='/detail.html?id=${acc.ProductID}'" style="background: #333; flex: 1;">XEM</button>
        <button onclick="buyNow(${acc.ProductID})" style="flex: 1;">MUA</button>
    </div>
`;
            
            grid.appendChild(card);
        });

    } catch (err) {
        console.error(err);
        grid.innerHTML = "<p style='color:red; text-align:center;'>Lỗi kết nối Server!</p>";
    }
}

// --- HÀM 2: KIỂM TRA ĐĂNG NHẬP (MỚI THÊM) ---
// --- HÀM 2: KIỂM TRA ĐĂNG NHẬP & CẬP NHẬT TIỀN ---
async function checkLoginStatus() {
    const userStr = localStorage.getItem("user");
    const authSection = document.getElementById("auth-section");

    if (userStr && authSection) {
        let user = JSON.parse(userStr);

        // --- ĐOẠN CODE MỚI: TỰ ĐỘNG CẬP NHẬT SỐ DƯ TỪ SERVER ---
        try {
            // Gọi API lấy thông tin mới nhất
            const res = await fetch(`/api/user/me/${user.Username || user.username}`);
            const data = await res.json();

            if (data.success) {
                // Cập nhật lại user trong localStorage với dữ liệu mới từ Server
                user = data.user; 
                localStorage.setItem("user", JSON.stringify(user));
                console.log("Đã cập nhật số dư mới:", user.Balance);
            }
        } catch (err) {
            console.error("Không thể cập nhật số dư:", err);
            // Nếu lỗi mạng thì vẫn hiển thị số dư cũ trong localStorage
        }
        // -------------------------------------------------------

        // Hiển thị ra giao diện (như cũ)
        const moneyFormat = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(user.Balance || user.balance || 0);

        authSection.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; font-size: 13px;">
                <a href="/user/html/profile.html" style="color: white; font-weight: 600; text-decoration: none; border-bottom: 1px dashed #fff;" title="Xem trang cá nhân">
                    Hi, ${user.Username || user.username}
                </a>
                <span style="color: #ffc107; font-weight: bold;">(${moneyFormat})</span>
                <button onclick="logout()" style="background: #e53935; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Thoát</button>
            </div>
        `;
    }
}

// --- HÀM 3: ĐĂNG XUẤT ---
function logout() {
    if(confirm("Bạn muốn đăng xuất?")) {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        window.location.reload(); // Tải lại trang
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
    else if (path.includes('lmht_svnuocngoai')) categoryCode = 'LMHT_FOREIGN';
    else if (path.includes('lmht')) categoryCode = 'LMHT'; 
    else if (path.includes('lienquan')) categoryCode = 'LQ';
    else if (path.includes('freefire')) categoryCode = 'FF';
    else if (path.includes('thuvanmaypettim')) categoryCode = 'TVM';
    else if (path.includes('sanpettim')) categoryCode = 'SPT';
    else if (path.includes('dtcl_tuchon')) categoryCode = 'DTCL_SELEC';
    else if (path.includes('dtcl_pettim')) categoryCode = 'DTCL_PET';

    else if (path.includes('tocchien')) categoryCode = 'TC';
    else if (path.includes('valorant')) categoryCode = 'VAL';

            
            if(categoryCode) loadProducts(categoryCode);

        } else {
            alert("❌ Lỗi: " + result.message);
        }

    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối Server!");
    }
}
// Biến toàn cục để lưu danh sách gốc
let allProductsList = [];

// HÀM TẢI SẢN PHẨM (Sửa lại hàm cũ của bạn)
async function loadProducts(categoryCode) {
    const container = document.getElementById("product-list");
    container.innerHTML = '<p style="color:white; text-align:center;">Đang tải dữ liệu...</p>';

    try {
        // Gọi API lấy sản phẩm
        const res = await fetch(`/api/products/${categoryCode}`);
        const data = await res.json();

        // 1. Lưu dữ liệu gốc vào biến toàn cục
        allProductsList = data;

        // 2. Hiển thị toàn bộ lần đầu
        renderProducts(allProductsList);

    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color:red; text-align:center;">Lỗi tải dữ liệu!</p>';
    }
}

// HÀM VẼ SẢN PHẨM RA MÀN HÌNH (Tách riêng ra để tái sử dụng)
function renderProducts(list) {
    const container = document.getElementById("product-list");
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = '<p style="color:#ccc; text-align:center; width:100%; margin-top:20px;">Không tìm thấy acc nào phù hợp.</p>';
        return;
    }

    list.forEach(acc => {
        const price = new Intl.NumberFormat('vi-VN').format(acc.Price);
        // Code HTML thẻ sản phẩm (Copy y nguyên đoạn HTML cũ của bạn vào đây)
        const html = `
            <div class="game-card">
                <div class="card-img-wrap" onclick="window.location.href='/detail.html?id=${acc.ProductID}'">
                    <img src="${acc.ImageURL}" alt="${acc.Title}">
                </div>
                <div class="card-body">
                    <h3 onclick="window.location.href='/detail.html?id=${acc.ProductID}'">${acc.Title}</h3>
                    <div class="card-info">
                        <span>Mã số: #${acc.ProductID}</span>
                    </div>
                    <div class="card-price">
                        <span class="price-new">${price} đ</span>
                        <button onclick="buyNow(${acc.ProductID})">MUA</button>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// --- HÀM XỬ LÝ LỌC (FILTER) ---
function applyFilter() {
    // 1. Lấy giá trị từ các ô nhập
    const keyword = document.getElementById("search-keyword").value.toLowerCase();
    const priceRange = document.getElementById("filter-price").value; // VD: "0-50000"
    const sortType = document.getElementById("sort-price").value;     // "asc" hoặc "desc"

    // 2. Lọc danh sách gốc
    let filtered = allProductsList.filter(item => {
        // A. Lọc theo từ khóa (Tên hoặc Mô tả)
        const textMatch = item.Title.toLowerCase().includes(keyword) || 
                          (item.Description && item.Description.toLowerCase().includes(keyword));

        // B. Lọc theo giá
        let priceMatch = true;
        if (priceRange !== "all") {
            const [min, max] = priceRange.split("-").map(Number);
            priceMatch = item.Price >= min && item.Price <= max;
        }

        return textMatch && priceMatch;
    });

    // 3. Sắp xếp
    if (sortType === "asc") {
        filtered.sort((a, b) => a.Price - b.Price); // Thấp đến cao
    } else if (sortType === "desc") {
        filtered.sort((a, b) => b.Price - a.Price); // Cao đến thấp
    }

    // 4. Vẽ lại kết quả
    renderProducts(filtered);
}