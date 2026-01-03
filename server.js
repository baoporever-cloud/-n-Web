const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');
const app = express();

// --- 1. CẤU HÌNH KẾT NỐI SQL SERVER ---
const config = {
    user: 'sa',
    password: '123456', // <--- Kiểm tra lại mật khẩu SQL của bạn
    server: 'localhost',
    database: 'ShopGame',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

// --- 2. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Kiểm tra kết nối Database
sql.connect(config).then(pool => {
    if (pool.connected) console.log("✅ Đã kết nối SQL Server thành công!");
}).catch(err => console.error("❌ Lỗi kết nối SQL:", err.message));

// ==========================================
// API ADMIN: ĐĂNG BÁN SẢN PHẨM (ĐÃ NÂNG CẤP)
// ==========================================
app.post('/api/admin/add-product', async (req, res) => {
    try {
        const { title, code, price, image, account, password, desc } = req.body;
        const pool = await sql.connect(config);

        // --- 1. KIỂM TRA TRÙNG LẶP (LOGIC MỚI) ---
        // Chỉ kiểm tra GameAccount (Tài khoản) và Title (Tiêu đề)
        // Bỏ qua GamePassword (Mật khẩu trùng nhau vẫn được)
        const checkDuplicate = await pool.request()
            .input('acc', sql.VarChar, account)
            .input('t', sql.NVarChar, title)
            .query(`
                SELECT ProductID FROM Products 
                WHERE GameAccount = @acc OR Title = @t
            `);

        if (checkDuplicate.recordset.length > 0) {
            return res.json({ 
                success: false, 
                message: "⛔ Lỗi: Tài khoản Game hoặc Tiêu đề này đã tồn tại trên Shop!" 
            });
        }
        // ------------------------------------------

        // 2. Tìm CategoryID từ mã code (VD: LMHT)
        const cat = await pool.request().input('c', sql.VarChar, code).query("SELECT CategoryID FROM Categories WHERE CategoryCode = @c");
        if(cat.recordset.length === 0) return res.json({success:false, message: "Mã game không đúng"});

        // 3. Thêm vào Database (Nếu không trùng)
        await pool.request()
            .input('cid', sql.Int, cat.recordset[0].CategoryID)
            .input('t', sql.NVarChar, title)
            .input('p', sql.Decimal, price)
            .input('i', sql.VarChar, image)
            .input('a', sql.VarChar, account)
            .input('pw', sql.VarChar, password)
            .input('d', sql.NVarChar, desc)
            .query(`
                INSERT INTO Products (CategoryID, Title, Price, ImageURL, GameAccount, GamePassword, Description, IsSold) 
                VALUES (@cid, @t, @p, @i, @a, @pw, @d, 0)
            `);

        res.json({ success: true, message: "✅ Đăng bán thành công!" });

    } catch (err) { 
        console.error(err);
        res.status(500).json({ success: false, message: "Lỗi Server: " + err.message }); 
    }
});

// ==========================================
// CÁC API KHÁC (GIỮ NGUYÊN)
// ==========================================

// Auth & User
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const pool = await sql.connect(config);
        const check = await pool.request().input('u', sql.VarChar, username).query("SELECT * FROM Users WHERE Username = @u");
        if (check.recordset.length > 0) return res.json({ success: false, message: 'Tên tài khoản đã tồn tại!' });
        await pool.request().input('u', sql.VarChar, username).input('e', sql.VarChar, email).input('p', sql.VarChar, password).query("INSERT INTO Users (Username, Email, Password, Role, Balance) VALUES (@u, @e, @p, 'User', 0)");
        res.json({ success: true, message: 'Đăng ký thành công!' });
    } catch (err) { res.status(500).json({ success: false, message: 'Lỗi Server' }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const pool = await sql.connect(config);
        const result = await pool.request().input('u', sql.VarChar, username).input('p', sql.VarChar, password).query("SELECT * FROM Users WHERE Username = @u AND Password = @p");
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            res.json({ success: true, user: { username: user.Username, balance: user.Balance, role: user.Role, email: user.Email } });
        } else { res.json({ success: false, message: 'Sai tài khoản hoặc mật khẩu!' }); }
    } catch (err) { res.status(500).json({ success: false, message: 'Lỗi Server' }); }
});

app.get('/api/user/me/:username', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().input('u', sql.VarChar, req.params.username).query("SELECT UserID, Username, Balance, Role FROM Users WHERE Username = @u");
        if (result.recordset.length > 0) res.json({ success: true, user: result.recordset[0] });
        else res.json({ success: false });
    } catch (err) { res.status(500).send("Lỗi"); }
});
// --- API CẬP NHẬT THÔNG TIN USER (Đổi tên, pass, email) ---
app.post('/api/user/update', async (req, res) => {
    try {
        const { currentUsername, newUsername, newEmail, oldPassword, newPassword } = req.body;
        const pool = await sql.connect(config);

        // 1. Kiểm tra User cũ có đúng mật khẩu không
        const userCheck = await pool.request()
            .input('u', sql.VarChar, currentUsername)
            .input('p', sql.VarChar, oldPassword)
            .query("SELECT UserID FROM Users WHERE Username = @u AND Password = @p");

        if (userCheck.recordset.length === 0) {
            return res.json({ success: false, message: "Mật khẩu cũ không chính xác!" });
        }

        const userId = userCheck.recordset[0].UserID;

        // 2. Kiểm tra nếu đổi tên đăng nhập -> Tên mới đã tồn tại chưa?
        if (newUsername !== currentUsername) {
            const nameCheck = await pool.request()
                .input('u', sql.VarChar, newUsername)
                .query("SELECT UserID FROM Users WHERE Username = @u");
            if (nameCheck.recordset.length > 0) {
                return res.json({ success: false, message: "Tên đăng nhập mới đã có người dùng!" });
            }
        }

        // 3. Tiến hành cập nhật
        await pool.request()
            .input('id', sql.Int, userId)
            .input('u', sql.VarChar, newUsername)
            .input('e', sql.VarChar, newEmail)
            .input('p', sql.VarChar, newPassword) // Nếu user không đổi pass thì client gửi pass cũ lên
            .query("UPDATE Users SET Username = @u, Email = @e, Password = @p WHERE UserID = @id");

        res.json({ success: true, message: "Cập nhật thành công! Vui lòng đăng nhập lại." });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Lỗi Server" });
    }
});

// Sản phẩm & Mua hàng
app.get('/api/products/:categoryCode', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().input('code', sql.VarChar, req.params.categoryCode)
            .query("SELECT p.* FROM Products p JOIN Categories c ON p.CategoryID = c.CategoryID WHERE c.CategoryCode = @code AND p.IsSold = 0");
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Lỗi"); }
});

app.get('/api/product/detail/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().input('id', sql.Int, req.params.id)
            .query("SELECT p.*, c.CategoryName, c.CategoryCode FROM Products p JOIN Categories c ON p.CategoryID = c.CategoryID WHERE p.ProductID = @id");
        if (result.recordset.length > 0) res.json({ success: true, data: result.recordset[0] });
        else res.json({ success: false });
    } catch (err) { res.status(500).send("Lỗi"); }
});

app.post('/api/buy', async (req, res) => {
    const { username, productId } = req.body;
    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const userReq = await transaction.request().input('u', sql.VarChar, username).query("SELECT UserID, Balance FROM Users WHERE Username = @u");
        const prodReq = await transaction.request().input('id', sql.Int, productId).query("SELECT * FROM Products WHERE ProductID = @id");
        if (userReq.recordset.length === 0 || prodReq.recordset.length === 0) throw new Error("Dữ liệu không tồn tại");
        const user = userReq.recordset[0];
        const product = prodReq.recordset[0];
        if (product.IsSold) throw new Error("Acc đã bị mua!");
        if (user.Balance < product.Price) throw new Error("Số dư không đủ!");
        await transaction.request().input('uid', sql.Int, user.UserID).input('p', sql.Decimal, product.Price).query("UPDATE Users SET Balance = Balance - @p WHERE UserID = @uid");
        await transaction.request().input('pid', sql.Int, productId).query("UPDATE Products SET IsSold = 1 WHERE ProductID = @pid");
        await transaction.request().input('uid', sql.Int, user.UserID).input('pid', sql.Int, productId).input('p', sql.Decimal, product.Price).query("INSERT INTO Orders (UserID, ProductID, Price, OrderDate) VALUES (@uid, @pid, @p, GETDATE())");
        await transaction.commit();
        res.json({ success: true, message: "Mua thành công!" });
    } catch (err) { await transaction.rollback(); res.json({ success: false, message: err.message }); }
});

// Admin: Quản lý & Thống kê
app.get('/api/admin/stats', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const sales = await pool.request().query("SELECT ISNULL(SUM(Price), 0) AS T FROM Orders");
        const deposit = await pool.request().query("SELECT ISNULL(SUM(Amount), 0) AS T FROM Deposits WHERE Status = 'Approved'");
        const users = await pool.request().query("SELECT COUNT(*) AS T FROM Users");
        const stock = await pool.request().query("SELECT COUNT(*) AS T FROM Products WHERE IsSold = 0");
        res.json({ success: true, data: { sales: sales.recordset[0].T, deposit: deposit.recordset[0].T, users: users.recordset[0].T, stock: stock.recordset[0].T } });
    } catch (err) { res.status(500).send("Lỗi"); }
});

app.get('/api/admin/products', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT p.*, c.CategoryName FROM Products p LEFT JOIN Categories c ON p.CategoryID = c.CategoryID ORDER BY p.ProductID DESC");
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Lỗi"); }
});

app.post('/api/admin/product/update', async (req, res) => {
    try {
        const { id, catId, title, price, image, account, password, desc } = req.body;
        const pool = await sql.connect(config);
        await pool.request().input('id', sql.Int, id).input('cid', sql.Int, catId).input('t', sql.NVarChar, title).input('p', sql.Decimal, price).input('i', sql.VarChar, image).input('a', sql.VarChar, account).input('pw', sql.VarChar, password).input('d', sql.NVarChar, desc)
            .query("UPDATE Products SET CategoryID=@cid, Title=@t, Price=@p, ImageURL=@i, GameAccount=@a, GamePassword=@pw, Description=@d WHERE ProductID=@id");
        res.json({ success: true, message: "Cập nhật thành công!" });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/admin/product/delete', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        await pool.request().input('id', sql.Int, req.body.id).query("DELETE FROM Products WHERE ProductID = @id");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: "Lỗi xóa" }); }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT UserID, Username, Email, Balance, Role, CreatedAt FROM Users ORDER BY UserID DESC");
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Lỗi"); }
});

app.post('/api/admin/user/balance', async (req, res) => {
    try {
        const { userId, amount, type } = req.body;
        const pool = await sql.connect(config);
        let final = type === 'SUB' ? -Number(amount) : Number(amount);
        await pool.request().input('id', sql.Int, userId).input('a', sql.Decimal, final).query("UPDATE Users SET Balance = Balance + @a WHERE UserID = @id");
        res.json({ success: true, message: "Đã cập nhật số dư!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/user/delete', async (req, res) => {
    const { userId } = req.body;
    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        await transaction.request().input('id', sql.Int, userId).query("DELETE FROM Deposits WHERE UserID = @id");
        await transaction.request().input('id', sql.Int, userId).query("DELETE FROM Orders WHERE UserID = @id");
        await transaction.request().input('id', sql.Int, userId).query("DELETE FROM SupportRequests WHERE Name = (SELECT Username FROM Users WHERE UserID = @id)");
        await transaction.request().input('id', sql.Int, userId).query("DELETE FROM Users WHERE UserID = @id");
        await transaction.commit();
        res.json({ success: true, message: "Đã xóa thành viên!" });
    } catch (err) { await transaction.rollback(); res.status(500).json({ success: false }); }
});

app.get('/api/admin/deposits', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT d.*, u.Username FROM Deposits d JOIN Users u ON d.UserID = u.UserID WHERE d.Status = 'Pending' ORDER BY d.CreatedAt DESC");
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Lỗi"); }
});

app.post('/api/admin/deposit-process', async (req, res) => {
    const { id, action } = req.body;
    const pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        if (action === 'approve') {
            const d = await transaction.request().input('id', sql.Int, id).query("SELECT UserID, Amount FROM Deposits WHERE DepositID = @id");
            if(d.recordset.length > 0) {
                await transaction.request().input('uid', sql.Int, d.recordset[0].UserID).input('a', sql.Decimal, d.recordset[0].Amount).query("UPDATE Users SET Balance = Balance + @a WHERE UserID = @uid");
                await transaction.request().input('id', sql.Int, id).query("UPDATE Deposits SET Status = 'Approved' WHERE DepositID = @id");
            }
        } else {
            await transaction.request().input('id', sql.Int, id).query("UPDATE Deposits SET Status = 'Rejected' WHERE DepositID = @id");
        }
        await transaction.commit();
        res.json({ success: true, message: "Đã xử lý!" });
    } catch (err) { await transaction.rollback(); res.status(500).json({ success: false }); }
});

app.get('/api/admin/all-deposits', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT d.*, u.Username FROM Deposits d JOIN Users u ON d.UserID = u.UserID ORDER BY d.CreatedAt DESC");
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Lỗi"); }
});

app.get('/api/admin/orders', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT o.OrderID, u.Username, p.Title, p.GameAccount, p.GamePassword, o.Price, o.OrderDate FROM Orders o JOIN Users u ON o.UserID = u.UserID JOIN Products p ON o.ProductID = p.ProductID ORDER BY o.OrderDate DESC");
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Lỗi"); }
});

app.get('/api/admin/supports', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT * FROM SupportRequests ORDER BY CreatedAt DESC");
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Lỗi"); }
});

app.get('/api/categories', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT * FROM Categories");
        res.json(result.recordset);
    } catch (err) { res.status(500).send("Lỗi"); }
});

app.post('/api/topup', async (req, res) => {
    try {
        const { username, cardType, amount, code, serial } = req.body;
        const pool = await sql.connect(config);
        const u = await pool.request().input('n', sql.VarChar, username).query("SELECT UserID FROM Users WHERE Username = @n");
        if(u.recordset.length === 0) return res.json({success:false});
        await pool.request().input('uid', sql.Int, u.recordset[0].UserID).input('t', sql.NVarChar, cardType).input('s', sql.VarChar, serial).input('c', sql.VarChar, code).input('a', sql.Decimal, amount)
            .query("INSERT INTO Deposits (UserID, CardType, Serial, Code, Amount, Status) VALUES (@uid, @t, @s, @c, @a, 'Pending')");
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/support/send', async (req, res) => {
    try {
        const { name, email, orderId, message } = req.body;
        const pool = await sql.connect(config);
        await pool.request().input('n', sql.NVarChar, name).input('e', sql.VarChar, email).input('o', sql.VarChar, orderId).input('m', sql.NVarChar, message)
            .query("INSERT INTO SupportRequests (Name, Email, OrderID, Message) VALUES (@n, @e, @o, @m)");
        res.json({ success: true, message: "Đã gửi hỗ trợ!" });
    } catch (err) { res.status(500).json({ success: false }); }
});
// --- BỔ SUNG: API LẤY LỊCH SỬ MUA ACC ---
app.get('/api/user/orders/:username', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().input('u', sql.VarChar, req.params.username)
            .query(`
                SELECT o.OrderID, p.Title, p.GameAccount, p.GamePassword, o.Price, o.OrderDate 
                FROM Orders o 
                JOIN Products p ON o.ProductID = p.ProductID 
                JOIN Users u ON o.UserID = u.UserID
                WHERE u.Username = @u 
                ORDER BY o.OrderDate DESC
            `);
        res.json(result.recordset);
    } catch (err) { 
        console.error(err);
        res.status(500).send("Lỗi Server"); 
    }
});

// --- BỔ SUNG: API LẤY LỊCH SỬ NẠP TIỀN ---
app.get('/api/user/deposits/:username', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().input('u', sql.VarChar, req.params.username)
            .query(`
                SELECT d.* FROM Deposits d 
                JOIN Users u ON d.UserID = u.UserID 
                WHERE u.Username = @u 
                ORDER BY d.CreatedAt DESC
            `);
        res.json(result.recordset);
    } catch (err) { 
        console.error(err);
        res.status(500).send("Lỗi Server"); 
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});