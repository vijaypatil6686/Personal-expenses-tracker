const express = require("express");
const mysql = require("mysql");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "expense_tracker"
});

db.connect((err) => {
    if (err) {
        console.error("❌ Database Connection Failed:", err);
        return;
    }
    console.log("✅ Connected to MySQL Database");
});

// Signup Route
app.post("/signup", (req, res) => {
    const { name, email, password } = req.body;
    const query = "INSERT INTO users (email, full_name, password) VALUES (?, ?, ?)";

    db.query(query, [email, name, password], (err) => {
        if (err) return res.json({ success: false, message: "Email already exists!" });
        res.json({ success: true, message: "User registered successfully" });
    });
});

// Login Route
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    db.query("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, results) => {
        if (err || results.length === 0) return res.json({ success: false, message: "Invalid credentials!" });
        res.json({ success: true, message: "Login successful!" });
    });
});

// Get budget of a specific user
app.get('/api/budget/:email', (req, res) => {
    const email = req.params.email;
    console.log(`📩 Incoming request: GET /api/budget/${email}`);

    const sql = 'SELECT budget_amount FROM budget WHERE email = ?';
    db.query(sql, [email], (err, result) => {
        if (err) {
            console.error('❌ Error fetching budget:', err);
            res.status(500).json({ success: false, message: "Database Error" });
            return;
        }
        const budgetData = result.length > 0 ? result[0] : { budget_amount: 0 };
        console.log(`📤 Response for /api/budget/${email}:`, budgetData);
        res.json(budgetData);
    });
});

// Get expenses over time for a specific user
app.get('/api/expenses/time/:email', (req, res) => {
    const email = req.params.email;
    console.log(`📩 Incoming request: GET /api/expenses/time/${email}`);

    const sql = `
        SELECT expense_date, SUM(amount) AS daily_spent 
        FROM expenses 
        WHERE email = ? 
        GROUP BY expense_date
        ORDER BY expense_date ASC
    `;
    db.query(sql, [email], (err, results) => {
        if (err) {
            console.error('❌ Error fetching expenses over time:', err);
            res.status(500).json({ success: false, message: "Database Error" });
            return;
        }
        console.log(`📤 Response for /api/expenses/time/${email}:`, results);
        res.json(results);
    });
});

app.post("/api/add-expense", (req, res) => {
    console.log("POST /api/add-expense", req.body);

    const { email,title,category, amount, expense_date } = req.body;

    if (!email || !category || !amount || !expense_date) {
        return res.status(400).json({ success: false, message: "Missing required fields!" });
    }

    const sql = "INSERT INTO expenses (email,title, category, amount, expense_date) VALUES (?, ?, ?, ?, ?)";
    
    db.query(sql, [email, title ,category, amount, expense_date], (err) => {
        if (err) {
            console.error("Error inserting expense:", err);
            return res.status(500).json({ success: false, message: "Database Error" });
        }
        console.log("Expense added successfully for:", email);
        res.json({ success: true, message: "Expense added successfully!" });
    });
});



app.get("/api/expenses/:email", (req, res) => {
    console.log("GET /api/expenses", req.params.email);

    const sql = "SELECT id,title, category, amount, expense_date FROM expenses WHERE email = ?";
    db.query(sql, [req.params.email], (err, results) => {
        if (err) {
            console.error("Error fetching expenses:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }
        res.json(results);
    });
});

app.delete("/api/delete-expense/:id", (req, res) => {
    const expenseId = req.params.id;
    console.log(`DELETE /api/delete-expense/${expenseId}`);

    const sql = "DELETE FROM expenses WHERE id = ?";
    db.query(sql, [expenseId], (err, result) => {
        if (err) {
            console.error("❌ Error deleting expense:", err);
            return res.status(500).json({ success: false, message: "Database Error" });
        }
        console.log(`🗑️ Expense with ID ${expenseId} deleted`);
        res.json({ success: true, message: "Expense deleted successfully!" });
    });
});



app.post('/api/getExpenseReport', (req, res) => {

    console.log("reporting\n")
    const { email, fromDate, toDate } = req.body;

    if (!email || !fromDate || !toDate) {
        return res.status(400).json({ error: "Invalid request parameters" });
    }
     
    // SQL query to fetch expenses based on email and date range
    const query = `
        SELECT title, category, amount, expense_date AS date
        FROM expenses
        WHERE email = ? AND expense_date BETWEEN ? AND ?
        ORDER BY expense_date;
    `;

    db.query(query, [email, fromDate, toDate], (err, results) => {
        if (err) {
            console.error('❌ Error fetching expenses:', err);
            return res.status(500).json({ error: "Database query error" });
        }

        // Send the fetched expenses to the front end
        return res.json({ expenses: results });
    });
});

// Fetch user details by email
app.get("/user-details", (req, res) => {
    const { email } = req.query;

    const userQuery = `
        SELECT users.email, users.full_name, users.password, budget.budget_amount
        FROM users
        LEFT JOIN budget ON users.email = budget.email
        WHERE users.email = ?
    `;

    db.query(userQuery, [email], (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const user = results[0];
        res.json({
            fullname: user.full_name,
            email: user.email,
            password: user.password,
            budget: user.budget_amount
        });
    });
});
// Update user details (name, password, and budget)
app.put("/update-user", (req, res) => {
    const { email, fullname, password, budget } = req.body;

    const updateUserQuery = `UPDATE users SET full_name = ?, password = ? WHERE email = ?`;
    const updateBudgetQuery = `INSERT INTO budget (email, budget_amount) VALUES (?, ?)
                                ON DUPLICATE KEY UPDATE budget_amount = ?`;

    // First update user info
    db.query(updateUserQuery, [fullname, password, email], (err, result) => {
        if (err) {
            console.error("Error updating user:", err);
            return res.status(500).json({ success: false, message: "Failed to update user" });
        }

        // Then update or insert budget
        db.query(updateBudgetQuery, [email, budget, budget], (err, result) => {
            if (err) {
                console.error("Error updating budget:", err);
                return res.status(500).json({ success: false, message: "Failed to update budget" });
            }

            res.json({ success: true, message: "User updated successfully" });
        });
    });
});



app.listen(3000, () => console.log("Server running on port 3000"));
