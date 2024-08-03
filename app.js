const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require("cookie-parser")

// const bcrypt = require('bcryptjs');
const db = require('./database');
const { hashPassword, comparePassword } = require("./auth")

const corsOptions = {
    origin:'http://localhost:3003', // Replace with the origin of your frontend
    credentials: true, // Allow credentials (cookies, HTTP authentication)
};
const app = express();
app.use(cookieParser())


app.use(cors(corsOptions));
app.use(bodyParser.json());

// Replace 'your_jwt_secret' with a secure secret key
const JWT_SECRET = 'your_jwt_secret';

// Registration Route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    try {
        const hashedPassword = await hashPassword(password);
        await db.runQuery('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.status(201).json({ message: 'User created' });
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).json({ error: 'User creation failed' });
    }

});

// Login Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Fetch user from the database
        const user = await db.getUserByUsername(username);

        // Log the user object to check if it's being retrieved correctly
        // console.log('User from database:', user);

        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        // Compare the provided password with the hashed password
        const match = await comparePassword(password, user.password);

        // Log the result of the password comparison
        // console.log('Password match result:', match);

        if (match) {
            // Generate JWT token if password matches
            jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {}, (err, token) => {
                if (err) {
                    console.error('JWT signing error:', err);
                    return res.status(500).json({ error: 'Server error' });
                }
                res.cookie('token', token).json({ message: 'Login successful',user });
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/todo', async (req, res) => {
    const { description, status } = req.body;

    const { token } = req.cookies

    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });

        if (!description || !status) {
            return res.status(400).json({ error: 'Description and status are required' });
        }
        try {
            await db.runQuery('INSERT INTO todos (user_id, description, status) VALUES (?, ?, ?)', [decoded.id, description, status]);
            res.status(201).json({ message: 'Todo created' });
        } catch (err) {
            console.error('Error creating todo:', err);
            res.status(500).json({ error: 'Failed to create todo' });
        }
    });
});


// Protected Route Example
app.get('/getAllTodos', async (req, res) => {
    const { token } = req.cookies
    console.log(token)
    if (!token) return res.status(401).json({ error: 'No token provided' });
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });
        else{
            const getTodo = async () => {
                const todos = await db.getAllTodos(decoded.id)
                res.json(todos)
            }
            getTodo()
        }

    });
});

app.delete('/todo/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.deleteTodo(id);
        res.json({ message: 'Todo deleted successfully' });
    } catch (err) {
        console.error('Error deleting todo:', err.message);
        res.status(500).json({ message: 'Error deleting todo' });
    }
});

// Get all users
app.get('/users', async (req, res) => {
    try {
        // Query to get all users
        const users = await db.getAllUsers();
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/todo/:id', async (req, res) => {
    const { id } = req.params;
    const { description, status } = req.body;
    const { token } = req.cookies;

    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });

        if (!description || !status) {
            return res.status(400).json({ error: 'Description and status are required' });
        }

        try {
            const changes = await db.updateTodo(id, decoded.id, description, status);

            if (changes === 0) {
                return res.status(404).json({ error: 'Todo not found or not authorized' });
            }

            res.json({ message: 'Todo updated successfully' });
        } catch (err) {
            console.error('Error updating todo:', err);
            res.status(500).json({ error: 'Failed to update todo' });
        }
    });
});

app.get("/profile", (req, res) => {
    const { token } = req.cookies

    if (token) {
        jwt.verify(token, JWT_SECRET, {}, (err, user) => {
            if (err) throw err;
            res.json(user)
        })
    } else {
        res.json(null)
    }
})

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Server running on port http://${PORT}`));
