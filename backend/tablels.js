const mysql = require('mysql');

// Connect to MySQL Database on WAMP Server
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',  // Default WAMP MySQL user
    password: '',   // Default WAMP has no password
    database: 'expense_tracker'
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('❌ Database Connection Failed:', err);
        return;
    }
    console.log('✅ Connected to MySQL Database');

    // Create Users Table (Primary Key: email)
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            email VARCHAR(255) PRIMARY KEY,
            full_name VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL
        )
    `;

    // Create Budget Table (Primary Key: email)
    const createBudgetTable = `
        CREATE TABLE IF NOT EXISTS budget (
            email VARCHAR(255) PRIMARY KEY,
            budget_amount DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
        )
    `;

    // Create Expenses Table
    const createExpensesTable = `
   
   CREATE TABLE expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        expense_date DATE NOT NULL,
        FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
    );
`;


    // Execute Table Creation Queries
    db.query(createUsersTable, (err, result) => {
        if (err) console.error('❌ Users Table Error:', err);
        else console.log('✅ Users Table Created Successfully');
    });

    db.query(createBudgetTable, (err, result) => {
        if (err) console.error('❌ Budget Table Error:', err);
        else console.log('✅ Budget Table Created Successfully');
    });

    db.query(createExpensesTable, (err, result) => {
        if (err) console.error('❌ Expenses Table Error:', err);
        else console.log('✅ Expenses Table Created Successfully');
    });

    // Close Connection
    db.end();
});
