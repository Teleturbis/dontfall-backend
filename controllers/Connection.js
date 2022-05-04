const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv').config();
const EventEmitter = require('events');

const User = require('../classes/User');
const UserSchema = require('../models/UserSchema');

const PORT = process.env.PORT || 5000;
const DATABASE_URL = `mongodb+srv://admin:${process.env.MONGO_PW}@cluster0.s1t7x.mongodb.net/test1?retryWrites=true&w=majority`;

class ConnectionEventType {
  static CONNECT = 'socket-connect'; // Socket connected
  static DISCONNECT = 'socket-disconnect'; // Socket disconnected
}

class GameEventType {
  static JOIN = 'game-join'; // Player joined game
}

class Connection extends EventEmitter {
  static _instance;

  static sockets = {}; // Active socket connections

  constructor() {
    super();
  }

  static getSocket(id) {
    return Connection.sockets[id];
  }

  connect(app) {
    this.httpServer = http.createServer(app);
    this.startSocketServer();
    this.connectToDatabaseAndStartServer();
  }

  startSocketServer() {
    const io = require('socket.io')(this.httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });

    io.on('connection', (socket) => {
      // A socket connected
      console.log('💻', 'Socket connected', socket.id);
      Connection.sockets[socket.id] = socket;

      //Subscribe to general-chat room
      socket.join('general-chat');

      const data = {
        userID: socket.request['_query'].userID,
        online: true,
      };

      console.log('🗃️ ', data);

      this.emit(ConnectionEventType.CONNECT, socket.id, data);

      socket.on('disconnect', () => {
        // A socket disconnected
        console.log('💀', 'Socket disconnected:', socket.id);
        if (Connection.sockets[socket.id]) delete Connection.sockets[socket.id];

        this.emit(ConnectionEventType.DISCONNECT, socket.id);
      });

      socket.on('join-game-room', (data) => {
        // A player joined a game
        console.log('🎮', 'Player joined game:', data);
        this.emit(GameEventType.JOIN, socket.id, data);
      });

      socket.on('chat', (message) => {
        // Get the user by socketId
        UserSchema.findOne({
          socketID: socket.id,
        })
          .catch(() => 'Error')
          .then((user) => {
            // Broadcast the message, date, and user (small) to the general-chat room
            const userSm = new User.Small(user);
            console.log('📩', userSm.username, message);
            io.to('general-chat').emit('chat', {
              message: message,
              time: new Date().getTime(),
              user: userSm,
            });
          });
      });

      // socket.on('join-game-room', (room) => {
      //   console.log('GAAME');
      //   // UserHandler.changeSocketRoom(socket.request['_query'], socket.id);
      //   console.log(socket.id, 'joined Game', room);
      //   game.joinGame(socket.id, room);
      //   socket.join(room);
      // });

      socket.on('join-room', (room) => {
        console.log('hey');
        // UserHandler.changeSocketRoom(socket.request['_query'], socket.id);
        console.log(socket.id, 'joined', room);
        socket.join(room);
      });
    });
  }

  connectToDatabaseAndStartServer() {
    // Connect to MongoDB
    mongoose
      .connect(DATABASE_URL)
      .then(() => {
        console.log('Connected to MongoDB');
        // Start the socket server
        this.httpServer.listen(PORT, () => {
          console.log('Socket server started at', `http://localhost:${PORT}`);
        });
      })
      .catch((err) => console.log('Error connecting to database:', err));
  }

  static get instance() {
    if (!this._instance) this._instance = new Connection();
    return this._instance;
  }
}

module.exports = {
  Connection,
  ConnectionEventType,
  GameEventType,
};
