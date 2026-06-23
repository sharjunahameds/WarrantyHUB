require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json());
app.use(cors());

// =====================
// JWT SECRET
// =====================
const SECRET_KEY = "warrantyhub_secret";

// =====================
// DB CONNECTION
// =====================
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.log("DB Error:", err);
    } else {
        console.log("MySQL Connected");
    }
});

// =====================
// REGISTER
// =====================
app.post("/register", (req, res) => {
    const { name, email, password } = req.body;

    const check = "SELECT * FROM users WHERE email = ?";

    db.query(check, [email], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: "DB Error" });
        }

        if (result.length > 0) {
            return res.status(409).json({ success: false, message: "User already exists" });
        }

        const insert = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

        db.query(insert, [name, email, password], (err2) => {
            if (err2) {
                return res.status(500).json({ success: false, message: "Insert failed" });
            }

            return res.status(201).json({ success: true, message: "Registered Successfully" });
        });
    });
});

// =====================
// LOGIN + JWT
// =====================
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    const query = "SELECT * FROM users WHERE email = ? AND password = ?";

    db.query(query, [email, password], (err, result) => {
        if (err) return res.json(err);

        if (result.length === 0) {
            return res.json({ message: "Invalid Credentials" });
        }

        const user = result[0];

        const token = jwt.sign(
            { id: user.id, email: user.email },
            SECRET_KEY,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login Success",
            token,
            user
        });
    });
});

// =====================
// JWT MIDDLEWARE
// =====================
function verifyToken(req, res, next) {
    const token = req.headers["authorization"];

    if (!token) {
        return res.json({ message: "No token provided" });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.json({ message: "Invalid token" });
        }

        req.user = decoded;
        next();
    });
}

// =====================
// ADD PRODUCT (USER LOCKED)
// =====================
app.post("/add-product", verifyToken, (req, res) => {
    const { product_name, brand, category, purchase_date, warranty_months, expiry_date, price, notes } = req.body;

    const user_id = req.user.id;

    const query = `
        INSERT INTO products (user_id, product_name, brand, category, purchase_date, warranty_months, expiry_date, price, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [user_id, product_name, brand, category, purchase_date, warranty_months, expiry_date, price, notes], (err, result) => {
        if (err) return res.json(err);

        res.json({ message: "Product Added", id: result.insertId });
    });
});

// =====================
// UPDATE PRODUCT (USER LOCKED)
// =====================
app.put("/update-product/:id", verifyToken, (req, res) => {
    const { product_name, brand, category, purchase_date, warranty_months, expiry_date, price, notes } = req.body;
    const productId = req.params.id;
    const user_id = req.user.id;

    const query = `
        UPDATE products 
        SET product_name = ?, brand = ?, category = ?, purchase_date = ?, warranty_months = ?, expiry_date = ?, price = ?, notes = ?
        WHERE id = ? AND user_id = ?
    `;

    db.query(query, [product_name, brand, category, purchase_date, warranty_months, expiry_date, price, notes, productId, user_id], (err, result) => {
        if (err) return res.json(err);

        res.json({ message: "Product Updated" });
    });
});

// =====================
// DELETE PRODUCT (USER LOCKED)
// =====================
app.delete("/delete-product/:id", verifyToken, (req, res) => {
    const productId = req.params.id;
    const user_id = req.user.id;

    const query = "DELETE FROM products WHERE id = ? AND user_id = ?";

    db.query(query, [productId, user_id], (err, result) => {
        if (err) return res.json(err);

        res.json({ message: "Product Deleted" });
    });
});

// =====================
// UPDATE PROFILE
// =====================
app.put("/update-profile", verifyToken, (req, res) => {
    const { name, email } = req.body;
    const user_id = req.user.id;

    const check = "SELECT * FROM users WHERE email = ? AND id != ?";
    db.query(check, [email, user_id], (err, result) => {
        if (err) return res.json(err);
        
        if (result.length > 0) {
            return res.json({ message: "Email already in use" });
        }

        const query = "UPDATE users SET name = ?, email = ? WHERE id = ?";
        db.query(query, [name, email, user_id], (err2, result2) => {
            if (err2) return res.json(err2);

            res.json({ message: "Profile Updated" });
        });
    });
});

// =====================
// GET PRODUCTS (USER LOCKED)
// =====================
app.get("/products", verifyToken, (req, res) => {

    const user_id = req.user.id;

    const query = "SELECT * FROM products WHERE user_id = ?";

    db.query(query, [user_id], (err, result) => {
        if (err) return res.json(err);

        res.json(result);
    });
});

// =====================
// SERVER START
// =====================

app.get("/", (req, res) => {
    res.send("WarrantyHUB Backend is Live ");
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});