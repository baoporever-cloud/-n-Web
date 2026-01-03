document.addEventListener("DOMContentLoaded", () => {
    // 1. Lấy ID từ thanh địa chỉ (URL)
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        loadProductDetail(productId);
    } else {
        alert("Không tìm thấy sản phẩm!");
        window.location.href = "/index.html";
    }
});

async function loadProductDetail(id) {
    try {
        const res = await fetch(`/api/product/detail/${id}`);
        const result = await res.json();

        if (result.success) {
            const acc = result.data;

            // Điền thông tin vào HTML
            document.title = acc.Title + " - Shop Acc";
            document.getElementById("d-img").src = acc.ImageURL;
            document.getElementById("d-title").innerText = acc.Title;
            document.getElementById("d-id").innerText = "#" + acc.ProductID;
            document.getElementById("d-desc").innerText = acc.Description || "Không có mô tả chi tiết.";

            const gameName = acc.CategoryName || acc.CategoryCode || "Game Khác";
            document.getElementById("d-game").innerText = gameName;
            
            // Format giá tiền
            const price = new Intl.NumberFormat('vi-VN').format(acc.Price);
            document.getElementById("d-price").innerText = price + " VNĐ";

            // Gán sự kiện cho nút Mua
            document.getElementById("btn-buy").onclick = () => {
                // Gọi hàm buyNow đã có trong products.js
                buyNow(acc.ProductID); 
            };

        } else {
            alert("Sản phẩm không tồn tại!");
        }
    } catch (err) {
        console.error(err);
    }
}