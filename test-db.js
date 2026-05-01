const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sample.db');
const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        age INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL,
        stock INTEGER DEFAULT 0,
        category TEXT,
        description TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product_id INTEGER,
        quantity INTEGER,
        total_price REAL,
        order_date TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

    CREATE VIEW IF NOT EXISTS order_details AS
    SELECT 
        o.id as order_id,
        u.username,
        u.email,
        p.name as product_name,
        o.quantity,
        o.total_price,
        o.order_date,
        o.status
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN products p ON o.product_id = p.id;
`);

const insertUser = db.prepare(`
    INSERT INTO users (username, email, age, is_active) 
    VALUES (?, ?, ?, ?)
`);

const insertProduct = db.prepare(`
    INSERT INTO products (name, price, stock, category, description) 
    VALUES (?, ?, ?, ?, ?)
`);

const insertOrder = db.prepare(`
    INSERT INTO orders (user_id, product_id, quantity, total_price, status) 
    VALUES (?, ?, ?, ?, ?)
`);

const users = [
    ['admin', 'admin@example.com', 35, 1],
    ['john_doe', 'john@example.com', 28, 1],
    ['jane_smith', 'jane@example.com', 32, 1],
    ['bob_wilson', 'bob@example.com', 45, 0],
    ['alice_brown', 'alice@example.com', 26, 1],
    ['charlie_davis', 'charlie@example.com', 38, 1],
    ['eva_miller', 'eva@example.com', 29, 1],
    ['frank_garcia', 'frank@example.com', 41, 0],
    ['grace_martinez', 'grace@example.com', 33, 1],
    ['henry_anderson', 'henry@example.com', 27, 1]
];

users.forEach(u => insertUser.run(u[0], u[1], u[2], u[3]));

const products = [
    ['iPhone 15 Pro', 999.99, 50, 'Electronics', 'Latest iPhone with A17 Pro chip'],
    ['MacBook Pro 14"', 1999.99, 25, 'Electronics', 'M3 Pro chip, 16GB RAM'],
    ['iPad Air', 599.99, 75, 'Electronics', '10.9" display, M1 chip'],
    ['AirPods Pro', 249.99, 100, 'Accessories', 'Active noise cancellation'],
    ['Magic Mouse', 79.99, 150, 'Accessories', 'Multi-Touch surface'],
    ['Apple Watch Series 9', 399.99, 60, 'Wearables', 'S9 chip, Double tap gesture'],
    ['USB-C Cable', 19.99, 200, 'Accessories', '2m length, braided'],
    ['Keyboard', 299.99, 40, 'Accessories', 'Wireless, Touch ID'],
    ['Studio Display', 1599.99, 15, 'Displays', '27" 5K Retina display'],
    ['HomePod mini', 99.99, 80, 'Audio', 'Smart speaker, Siri']
];

products.forEach(p => insertProduct.run(p[0], p[1], p[2], p[3], p[4]));

const orders = [
    [1, 1, 1, 999.99, 'completed'],
    [2, 2, 1, 1999.99, 'completed'],
    [3, 3, 2, 1199.98, 'shipped'],
    [1, 4, 3, 749.97, 'pending'],
    [5, 5, 1, 79.99, 'completed'],
    [6, 6, 1, 399.99, 'processing'],
    [2, 7, 5, 99.95, 'completed'],
    [7, 8, 1, 299.99, 'shipped'],
    [3, 9, 1, 1599.99, 'pending'],
    [8, 10, 2, 199.98, 'completed'],
    [9, 1, 1, 999.99, 'processing'],
    [10, 2, 1, 1999.99, 'shipped'],
    [1, 3, 1, 599.99, 'completed'],
    [4, 4, 1, 249.99, 'cancelled'],
    [6, 5, 2, 159.98, 'completed']
];

orders.forEach(o => insertOrder.run(o[0], o[1], o[2], o[3], o[4]));

db.close();

console.log(`Sample database created at: ${dbPath}`);
console.log('Tables created: users, products, orders');
console.log('View created: order_details');
console.log('Indexes created: idx_users_email, idx_orders_user');
console.log('Sample data inserted.');
