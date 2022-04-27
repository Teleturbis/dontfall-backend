const express = require('express');
const cors = require('cors');

const cookieParser = require('cookie-parser');
const path = require('path');
const app = express();

const connection = require('./connection');

// Config
connection(app);

// Routes
const usersRouter = require('../routes/users');
const gameRoute = require('../routes/game');

// Middlewares
app.use(
  cors({
    origin: [
      'https://93.198.222.25:3000',
      'https://84.166.31.174:3000',
      'https://84.166.31.174:8000',
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

app.use('/users', usersRouter);
app.use('/game', gameRoute);

// Testroute
app.get('/test', cors({ origin: '*' }), (req, res) => {
  res.send('Hello world!!!');
});

// Send the Requester Informations about the BackEnd
app.get('/info', cors({ origin: '*' }), (req, res) => {
  res.sendFile(path.join(__dirname, '../ReadMe.html'));
});
