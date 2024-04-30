const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const expressJwt = require('express-jwt'); 
const jwt = require('jsonwebtoken');
const compression = require('compression');
const app = express();
const port = process.env.PORT || 3000;

app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.json());
const secretKey = 'My secret key';
const jwtMW = expressJwt({
  secret: secretKey,
  algorithms: ['HS256']
});

var connection = mysql.createConnection({
  host: 'sql5.freemysqlhosting.net',
  user: 'sql5701489',
  password: 'd9SaH8aHPS',
  database: 'sql5701489'
});

function  changeDateFormat(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

app.listen(port, () => {
  console.log(`API served at http://localhost:${port}`);
});

app.post('/login', (req, res) => {
  const sql = 'SELECT * FROM UserData WHERE email=? AND password=?';
  const values = [req.body.email, req.body.password];

  connection.query(sql, values, (error, results) => {
    if (error) throw error;

    const userdata = results[0]; 

    if (userdata) {
      const token = jwt.sign({ email: userdata.email }, secretKey, { expiresIn: '1m' });

      res.json({
        success: true,  
        token: token,
        username: userdata.username, 
      });
    } else {
      res.status(401).json({
        success: false,
        token: null,
        err: 'Email or Password is incorrect',
      });
    }
  });
});

app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const date = changeDateFormat(new Date());
    connection.connect();
    const sql = `
    INSERT INTO UserData VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE
    username = VALUES(username),
    date = VALUES(date),
    password = VALUES(password)
  `;

    connection.query(sql, [username, email, password, date], function (error, results, fields) {
      if (error) {
        console.error('Error inserting user:', error);
        res.status(500).json({
          success: false,
          error: 'Internal Server Error'
        });
        return;
      }

      res.json({
        success: true
      });
    });
  } catch (err) {
    console.error('Unexpected error during signup:', err);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }
});

app.get('/budget/:username', (req, res) => {
  const username = req.params.username;

  const sql = 'SELECT * FROM Budget WHERE username = ?';

  connection.query(sql, [username], (error, results) => {
    if (error) {
      console.error('Error querying the database:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(results);
    }
  });
});


app.post('/addbudget', async (req, res) => {
  try {
    const {
      title,
      budget,
      color,
      expense,
      username,
      month
    } = req.body;

    connection.connect();

    const sql = `
      INSERT INTO Budget (title, budget, color, expense, username, month)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        budget = VALUES(budget),
        color = VALUES(color),
        expense = VALUES(expense)
    `;

    connection.query(sql, [title.toLowerCase(), budget, color.toLowerCase(), expense, username, month], function (error, results, fields) {

      if (error) {
        console.error('Error inserting or updating budget:', error);
        res.status(500).json({
          success: false,
          error: 'Internal Server Error'
        });
        return;
      }

      res.json({
        success: true
      });
    });
  } catch (err) {
    console.error('Unexpected error during budget operation:', err);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error'
    });
  }
});

app.post('/deletebudget', jwtMW, (req, res) => {
  const { title, month,username } = req.body;
  console.log('title-',title);
  console.log('month-',month);
  const deleteQuery = `
    DELETE FROM Budget
    WHERE title = ? AND username = ? AND month = ? ;
  `;

  connection.query(deleteQuery, [title, username, month], (error, results) => {
    if (error) {
      console.error('Error executing delete query:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    } else {
      console.log('Delete successful:', results);
      res.json({ success: true, message: 'Category deleted successfully' });
    }
  });
});
