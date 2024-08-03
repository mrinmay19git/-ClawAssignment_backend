const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db'); // Use ':memory:' for an in-memory database or specify a file path for persistent storage

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, description TEXT, status TEXT, FOREIGN KEY(user_id) REFERENCES users(id))");
});


const getUserByUsername = (username) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) reject(err);
            resolve(row);
        });
    });
};

const getAllUsers = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM users', [], (err, rows) => {
            if (err) {
                console.error('Error in getAllUsers:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const getAllTodos = (id) => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM todos WHERE user_id = ?', [id], (err, rows) => {
            if (err) {
                console.error('Error in getAllTodos:', err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const deleteTodo = (id) => {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM todos WHERE id = ?', [id], function (err) {
            if (err) {
                console.error('Error in deleteTodo:', err);
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
};


const updateTodo = (id, userId, description, status) => {
    return new Promise((resolve, reject) => {
        const query = 'UPDATE todos SET description = ?, status = ? WHERE id = ? AND user_id = ?';
        db.run(query, [description, status, id, userId], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this.changes);
            }
        });
    });
}




const runQuery = (query, params) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            resolve(this);
        });
    });
};

module.exports = {
    getUserByUsername,runQuery,getAllUsers,getAllTodos,deleteTodo,updateTodo
};