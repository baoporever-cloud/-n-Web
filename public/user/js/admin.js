document.addEventListener("DOMContentLoaded", () => {
    checkAdminRole();
    loadDeposits();
    loadUsers();
    loadManageProducts(); // Quản lý kho hàng
    loadOrders();         // Lịch sử đơn hàng
    loadStats();          // Thống kê
    loadDepositHistory(); // Lịch sử nạp thẻ
    loadSupports();       // Hỗ trợ
    loadCategoriesForEdit(); // Tải danh mục vào Popup
});

// --- 1. KIỂM TRA QUYỀN ADMIN ---
function checkAdminRole() {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
        window.location.href = "/user/html/login.html";
        return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'Admin') {
        alert("Bạn không có quyền truy cập trang này!");
        window.location.href = "/index.html";
    }
}

// --- 2. THỐNG KÊ DASHBOARD ---
async function loadStats() {
    try {
        const res = await fetch('/api/admin/stats');
        const result = await res.json();
        if (result.success) {
            const data = result.data;
            const formatMoney = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

            document.getElementById("st-deposit").innerText = formatMoney(data.deposit);
            document.getElementById("st-sales").innerText = formatMoney(data.sales);
            document.getElementById("st-users").innerText = new Intl.NumberFormat('vi-VN').format(data.users) + " tv";
            document.getElementById("st-stock").innerText = data.stock + " acc";
        }
    } catch (err) { console.error("Lỗi tải thống kê:", err); }
}

// --- 3. QUẢN LÝ KHO HÀNG (PRODUCTS) ---
async function loadManageProducts() {
    const tbody = document.getElementById("product-list");
    try {
        const res = await fetch('/api/admin/products');
        const list = await res.json();
        
        tbody.innerHTML = "";
        list.forEach(item => {
            const price = new Intl.NumberFormat('vi-VN').format(item.Price);
            const statusLabel = item.IsSold ? '<span style="color:red; font-weight:bold">Đã bán</span>' : '<span style="color:#00e676">Còn hàng</span>';
            const statusClass = item.IsSold ? 'sold' : 'available';
            const categoryName = item.CategoryName || '<span style="color: #777;">Chưa phân loại</span>';
            const dataString = encodeURIComponent(JSON.stringify(item));

            const row = `
                <tr class="product-row" data-status="${statusClass}">
                    <td>#${item.ProductID}</td>
                    <td style="color: #ff9800; font-weight: bold;">${categoryName}</td>
                    <td><img src="${item.ImageURL}" width="50" style="border-radius:4px"></td>
                    <td class="search-target" style="color:#00b4ff; max-width: 200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.Title}</td>
                    <td style="color:#ffc107; font-weight:bold">${price}</td>
                    <td class="search-target" style="font-size:12px">${item.GameAccount} / ***</td>
                    <td>${statusLabel}</td>
                    <td>
                        <button class="btn-edit" onclick="openEditModal('${dataString}')">✏️</button>
                        <button class="btn-del" onclick="deleteProduct(${item.ProductID})">🗑</button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
        filterProducts(); 
    } catch (err) { console.error(err); }
}

// Hàm tìm kiếm sản phẩm
function filterProducts() {
    const keyword = document.getElementById('search-input').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;
    const rows = document.querySelectorAll('.product-row');

    rows.forEach(row => {
        const textContent = row.innerText.toLowerCase();
        const rowStatus = row.getAttribute('data-status');
        const matchesKeyword = textContent.includes(keyword);
        const matchesStatus = (statusFilter === 'all') || (statusFilter === rowStatus);
        
        if (matchesKeyword && matchesStatus) row.classList.remove('hidden-row');
        else row.classList.add('hidden-row');
    });
}

// Hàm Xóa Sản Phẩm
async function deleteProduct(id) {
    if(!confirm("CẢNH BÁO: Bạn có chắc muốn xóa acc #" + id + " vĩnh viễn không?")) return;
    try {
        const res = await fetch('/api/admin/product/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const result = await res.json();
        if(result.success) {
            alert("Đã xóa!");
            loadManageProducts();
        } else {
            alert(result.message);
        }
    } catch(err) { console.error(err); }
}

// Hàm Đăng Bán Sản Phẩm Mới
async function handleAddProduct() {
    const productData = {
        title: document.getElementById("p-title").value,
        code: document.getElementById("p-code").value, // Bạn đang dùng mã code (VD: LMHT)
        price: document.getElementById("p-price").value,
        image: document.getElementById("p-image").value,
        account: document.getElementById("p-acc").value,
        password: document.getElementById("p-pass").value,
        desc: document.getElementById("p-desc").value
    };

    if (!confirm(`Bạn chắc chắn muốn đăng bán acc: ${productData.title}?`)) return;

    try {
        const res = await fetch('/api/admin/add-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        const result = await res.json();

        if (result.success) {
            alert("✅ " + result.message);
            document.getElementById("add-product-form").reset();
            loadManageProducts(); // Tải lại danh sách ngay
        } else {
            alert("❌ Lỗi: " + result.message);
        }
    } catch (err) { alert("Lỗi kết nối Server!"); }
}

// --- 4. POPUP EDIT SẢN PHẨM ---

// Tải danh mục vào ô Select của Popup Edit
async function loadCategoriesForEdit() {
    try {
        const res = await fetch('/api/categories');
        const categories = await res.json();
        const select = document.getElementById("edit-category");
        select.innerHTML = "";
        categories.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat.CategoryID;
            option.innerText = cat.CategoryName;
            select.appendChild(option);
        });
    } catch (err) { console.error(err); }
}

function openEditModal(dataString) {
    const item = JSON.parse(decodeURIComponent(dataString));
    document.getElementById("edit-id").value = item.ProductID;
    document.getElementById("edit-id-display").innerText = "#" + item.ProductID;
    document.getElementById("edit-category").value = item.CategoryID; 
    document.getElementById("edit-title").value = item.Title;
    document.getElementById("edit-price").value = item.Price;
    document.getElementById("edit-image").value = item.ImageURL;
    document.getElementById("edit-acc").value = item.GameAccount;
    document.getElementById("edit-pass").value = item.GamePassword;
    document.getElementById("edit-desc").value = item.Description || "";
    document.getElementById("edit-modal").style.display = "block";
}

function closeModal() { document.getElementById("edit-modal").style.display = "none"; }
window.onclick = function(event) {
    const modal = document.getElementById("edit-modal");
    if (event.target == modal) modal.style.display = "none";
}

async function submitEditProduct() {
    const data = {
        id: document.getElementById("edit-id").value,
        catId: document.getElementById("edit-category").value,
        title: document.getElementById("edit-title").value,
        price: document.getElementById("edit-price").value,
        image: document.getElementById("edit-image").value,
        account: document.getElementById("edit-acc").value,
        password: document.getElementById("edit-pass").value,
        desc: document.getElementById("edit-desc").value
    };

    if(!confirm("Cập nhật thông tin acc này?")) return;

    try {
        const res = await fetch('/api/admin/product/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            alert("✅ " + result.message);
            closeModal();
            loadManageProducts();
        } else {
            alert("❌ Lỗi: " + result.message);
        }
    } catch (err) { alert("Lỗi kết nối Server"); }
}

// --- 5. QUẢN LÝ THÀNH VIÊN ---
async function loadUsers() {
    const tbody = document.getElementById("user-list");
    try {
        const res = await fetch('/api/admin/users');
        const users = await res.json();
        tbody.innerHTML = "";
        
        users.forEach(u => {
            const date = new Date(u.CreatedAt).toLocaleDateString('vi-VN');
            const balance = new Intl.NumberFormat('vi-VN').format(u.Balance);
            const roleColor = u.Role === 'Admin' ? 'color: red; font-weight:bold' : '';
            
            let deleteBtn = `<button class="btn-del" onclick="deleteUser(${u.UserID}, '${u.Username}')">🗑 Xóa</button>`;
            if (u.Role === 'Admin') deleteBtn = ""; 

            const row = `
                <tr class="user-row">
                    <td>${u.UserID}</td>
                    <td style="${roleColor}">${u.Username}</td>
                    <td>${u.Email || 'Chưa cập nhật'}</td>
                    <td style="color: #ffc107; font-weight: bold;">${balance}</td>
                    <td>${u.Role}</td>
                    <td style="font-size:12px">${date}</td>
                    <td>
                        <button class="btn-edit" onclick="openBalanceModal(${u.UserID}, '${u.Username}')">💵 Tiền</button>
                        ${deleteBtn}
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
        filterUsers();
    } catch (err) { console.error("Lỗi tải user:", err); }
}

function filterUsers() {
    const keyword = document.getElementById('search-user').value.toLowerCase();
    const rows = document.querySelectorAll('.user-row');
    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(keyword) ? "" : "none";
    });
}

function openBalanceModal(id, username) {
    document.getElementById("bal-user-id").value = id;
    document.getElementById("bal-username").innerText = username;
    document.getElementById("bal-amount").value = "";
    document.getElementById("balance-modal").style.display = "block";
}
function closeBalanceModal() { document.getElementById("balance-modal").style.display = "none"; }

async function submitBalanceChange() {
    const userId = document.getElementById("bal-user-id").value;
    const type = document.getElementById("bal-type").value;
    const amount = document.getElementById("bal-amount").value;
    if (!amount || amount <= 0) { alert("Nhập tiền đi bạn ơi!"); return; }

    if (!confirm(`Xác nhận ${type === 'ADD' ? 'CỘNG' : 'TRỪ'} ${amount} đ?`)) return;

    try {
        const res = await fetch('/api/admin/user/balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, amount, type })
        });
        const result = await res.json();
        if (result.success) {
            alert("✅ " + result.message);
            closeBalanceModal();
            loadUsers();
        } else { alert("❌ Lỗi: " + result.message); }
    } catch (err) { alert("Lỗi Server"); }
}

async function deleteUser(id, username) {
    if (!confirm(`CẢNH BÁO: Xóa user ${username} sẽ xóa cả lịch sử nạp/mua của họ. Chắc chắn không?`)) return;
    try {
        const res = await fetch('/api/admin/user/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: id })
        });
        const result = await res.json();
        if (result.success) { alert("✅ Đã xóa!"); loadUsers(); } 
        else { alert("❌ Lỗi: " + result.message); }
    } catch (err) { alert("Lỗi Server"); }
}

// --- 6. QUẢN LÝ THẺ NẠP (DUYỆT THẺ) ---
async function loadDeposits() {
    const tbody = document.getElementById("deposit-list");
    try {
        const res = await fetch('/api/admin/deposits');
        const list = await res.json();
        document.getElementById("pending-count").innerText = list.length;
        tbody.innerHTML = "";
        if (list.length === 0) {
            tbody.innerHTML = "<tr><td colspan='7' style='text-align:center'>Không có thẻ chờ duyệt.</td></tr>";
            return;
        }
        list.forEach(item => {
            const date = new Date(item.CreatedAt).toLocaleString('vi-VN');
            const amount = new Intl.NumberFormat('vi-VN').format(item.Amount);
            const row = `
                <tr>
                    <td>#${item.DepositID}</td>
                    <td style="color: #00b4ff; font-weight:bold">${item.Username}</td>
                    <td>${item.CardType}</td>
                    <td style="color: #00e676; font-weight:bold">${amount} đ</td>
                    <td>Seri: ${item.Serial}<br>Code: ${item.Code}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn-approve" onclick="processDeposit(${item.DepositID}, 'approve')">Duyệt</button>
                        <button class="btn-reject" onclick="processDeposit(${item.DepositID}, 'reject')">Hủy</button>
                    </td>
                </tr>`;
            tbody.innerHTML += row;
        });
    } catch (err) { console.error(err); }
}

async function processDeposit(id, action) {
    if (!confirm(action === 'approve' ? "Duyệt và cộng tiền?" : "Hủy thẻ này?")) return;
    try {
        const res = await fetch('/api/admin/deposit-process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action })
        });
        const result = await res.json();
        if (result.success) { alert(result.message); loadDeposits(); } 
        else { alert("Lỗi: " + result.message); }
    } catch (err) { alert("Lỗi kết nối Server"); }
}

// --- 7. LỊCH SỬ NẠP TOÀN BỘ ---
async function loadDepositHistory() {
    const tbody = document.getElementById("deposit-history-list");
    try {
        const res = await fetch('/api/admin/all-deposits');
        const list = await res.json();
        tbody.innerHTML = "";
        if (list.length === 0) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center'>Chưa có giao dịch.</td></tr>";
            return;
        }
        list.forEach(item => {
            const date = new Date(item.CreatedAt).toLocaleString('vi-VN');
            const amount = new Intl.NumberFormat('vi-VN').format(item.Amount);
            let statusBadge = item.Status === 'Approved' ? '<span style="color:#00e676">Thành công</span>' 
                            : item.Status === 'Rejected' ? '<span style="color:#ff3d00">Thất bại</span>' 
                            : '<span style="color:#ffc107">Chờ duyệt</span>';
            
            const row = `
                <tr class="deposit-row" data-status="${item.Status}">
                    <td>#${item.DepositID}</td>
                    <td style="color:#00b4ff; font-weight:600">${item.Username}</td>
                    <td>${item.CardType} <span style="color:#ffc107">(${amount}đ)</span></td>
                    <td style="font-size:12px">SR: ${item.Serial}<br>Code: ${item.Code}</td>
                    <td>${statusBadge}</td>
                    <td style="font-size:12px">${date}</td>
                </tr>`;
            tbody.innerHTML += row;
        });
        filterDepositHistory();
    } catch (err) { console.error(err); }
}
function filterDepositHistory() {
    const keyword = document.getElementById('search-deposit').value.toLowerCase();
    const statusFilter = document.getElementById('filter-deposit-status').value;
    const rows = document.querySelectorAll('.deposit-row');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        const status = row.getAttribute('data-status');
        if (text.includes(keyword) && (statusFilter === 'all' || statusFilter === status)) row.style.display = "";
        else row.style.display = "none";
    });
}

// --- 8. LỊCH SỬ ĐƠN HÀNG (ĐÃ BÁN) ---
async function loadOrders() {
    const tbody = document.getElementById("order-list");
    try {
        const res = await fetch('/api/admin/orders');
        const list = await res.json();
        tbody.innerHTML = "";
        if (list.length === 0) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center'>Chưa bán được đơn nào.</td></tr>";
            return;
        }
        list.forEach(item => {
            const date = new Date(item.OrderDate).toLocaleString('vi-VN');
            const price = new Intl.NumberFormat('vi-VN').format(item.Price);
            const row = `
                <tr class="order-row">
                    <td>#${item.OrderID}</td>
                    <td style="color:#00b4ff; font-weight:bold">${item.Username}</td>
                    <td>${item.Title}</td>
                    <td style="font-family: monospace; background: rgba(255,255,255,0.05); padding: 5px;">
                        TK: ${item.GameAccount} <br> MK: ${item.GamePassword}
                    </td>
                    <td style="color:#00e676; font-weight:bold">+${price} đ</td>
                    <td style="font-size: 12px; color: #888;">${date}</td>
                </tr>`;
            tbody.innerHTML += row;
        });
        filterOrders();
    } catch (err) { console.error(err); }
}
function filterOrders() {
    const keyword = document.getElementById('search-order').value.toLowerCase();
    const rows = document.querySelectorAll('.order-row');
    rows.forEach(row => row.style.display = row.innerText.toLowerCase().includes(keyword) ? "" : "none");
}

// --- 9. HỖ TRỢ KHÁCH HÀNG ---
async function loadSupports() {
    const tbody = document.getElementById("support-list");
    try {
        const res = await fetch('/api/admin/supports');
        const list = await res.json();
        tbody.innerHTML = "";
        if (list.length === 0) {
            tbody.innerHTML = "<tr><td colspan='7' style='text-align:center'>Chưa có yêu cầu hỗ trợ.</td></tr>";
            return;
        }
        list.forEach(item => {
            const date = new Date(item.CreatedAt).toLocaleString('vi-VN');
            const statusBadge = item.Status === 'Done' ? '<span style="color:#00e676">Đã xong</span>' : '<span style="color:yellow">Chờ xử lý</span>';
            const row = `
                <tr>
                    <td>#${item.RequestID}</td>
                    <td style="font-weight:bold; color:#00b4ff">${item.Name}</td>
                    <td>${item.Email}</td>
                    <td>${item.OrderID || '-'}</td>
                    <td style="white-space: pre-wrap; color: #e2e8f0;">${item.Message}</td>
                    <td style="font-size: 12px; color: #888;">${date}</td>
                    <td>${statusBadge}</td>
                </tr>`;
            tbody.innerHTML += row;
        });
    } catch (err) { console.error(err); }
}

function logoutAdmin() {
    localStorage.removeItem("user");
    window.location.href = "/user/html/login.html";
}