const { v4: uuidv4 } = require("uuid");
const {
  Connection,
  GameEventType,
  ConnectionEventType
} = require("../controllers/Connection");
const UserHandler = require("../controllers/UserHandler");
const User = require("../classes/User");
const UserSchema = require("../models/UserSchema");
const axios = require("axios");
const ResourceHandler = require("../controllers/ResourceHandler");
const { shuffle, isValidQuestion } = require("../utils/Util");

class Mode {
  static GAME = "mode-game";
  static LOBBY = "mode-lobby";
}

class Player {
  user; // Reference to the user
  isPlaying; // True: Player is currently playing, False: Player is spectating
  state; // Current player state
  points;
}

class Game {
  constructor(options, hostUser) {
    this.name = options.name; // Unique name of this game instance
    this.gameID = uuidv4(); // Unique ID of this game instance

    this.hostUser = hostUser; // Reference to the host user

    this.password = options.password; // Password is string or null
    this.maxPlayers = options.maxPlayers; // Maximum number of players allowed

    this.players = []; // Array of current players
    this.gameMode = Mode.LOBBY; // Current mode of the game

    this.category = options.category;
    this.difficulty = options.difficulty;

    this.numberOfRounds = options.numberOfRounds ? options.numberOfRounds : 10; // Number of rounds to play
    this.roundIndex = 0; // Current round index
    this.question;
    this.correctAnswer;

    this.coordinates = {}; // Coordinates of player cursors

    this.questionDuration = 5; // Questions will be shown for this amount of seconds
    this.resultsDuration = 3; // Round-Results will be shown for this amount of seconds

    // Broadcast the cursor coordinates to all players every tick
    this.tickInterval = setInterval(() => {
      this.broadcast(GameEventType.GAME_TICK, this.coordinates);
    }, 50);

    this.disposed = false;

    this.addConnectionListeners();
  }

  start() {
    if (this.gameMode == Mode.GAME) {
      console.log("Cannot start the game; game is already started");
      return;
    }

    // Start the game
    this.gameMode = Mode.GAME;

    // Start the Game with current options
    this.roundIndex = 0;
    this.spectators = [];
    this.players.forEach((player) => {
      player.points = 0;
      player.isPlaying = true;
    });

    console.log("🎮", "Game", `'${this.name}'`, "started");

    this.startRound();
  }

  async startRound() {
    if (this.disposed) return;

    console.log(`Starting round ${this.roundIndex}/${this.numberOfRounds}`);

    // Reset player answers
    this.players.forEach((player) => (player.answer = -1));

    await this.assignQuestion();
    this.invalidateGameData();

    this.timer = setTimeout(
      this.endRound.bind(this),
      1000 * this.questionDuration
    );
  }

  invalidateGameData() {
    Connection.instance.io.to(this.gameID).emit(GameEventType.INVALIDATE);
  }

  endRound() {
    // Include the correct answer
    this.question.correctAnswer = this.correctAnswer;

    // Apply points to players
    this.players.forEach((player) => {
      console.log(
        `Player answered ${player.answer}. Correct answer: ${
          this.correctAnswer
        }. Correct? ${player.answer === this.correctAnswer}`
      );

      if (player.answer === this.correctAnswer) player.points += 5;
    });

    // End the round
    console.log("Round Ended!");
    console.log(
      this.players.map((player) => `${player.user.username} - ${player.points}`)
    );

    this.invalidateGameData();

    setTimeout(this.queueNextRound.bind(this), this.resultsDuration * 1000);
  }

  queueNextRound() {
    // Increment the round index and check if we need to end the game
    this.roundIndex++;
    if (this.roundIndex >= this.numberOfRounds) {
      this.roundIndex = 0;
      this.endGame();
    } else {
      this.startRound();
    }
  }

  endGame() {
    // End the game
    this.gameMode = Mode.LOBBY;

    this.broadcast(GameEventType.END_GAME);
    this.invalidateGameData();
  }

  toListItem() {
    // Return a small object with the game's data intended to be displayed in a list of games
    return {
      gameID: this.gameID,
      name: this.name,
      host: this.hostUser.toPlayerData(),
      playerCount: this.players.length
    };
  }

  toGameState() {
    // Return a small object with the game's data representing the full game state
    return {
      ...this.toListItem(),
      maxPlayers: this.maxPlayers,
      players: this.players.map((player) => {
        return {
          isPlaying: player.isPlaying,
          state: player.state,
          user: player.user.toPlayerData(),
          points: player.points,
          answer: player.answer
        };
      }),
      gameMode: this.gameMode,
      roundIndex: this.roundIndex + 1,
      numberOfRounds: this.numberOfRounds,
      question: this.question
    };
  }

  addPlayer(user) {
    const player = {
      user: user,
      isPlaying: false,
      socket: Connection.getSocket(user.socketID),
      answer: -1,
      points: 0
    };

    user.gameID = this.gameID;

    UserHandler.getUserSchemaById(user.id).then((userSchema) => {
      userSchema.currentRoom = this.gameID;
      userSchema.save();

      // TODO: Send the following when userSchema.save() is successful
      // for now, wait one second
      setTimeout(() => {
        Connection.invalidateUserBySocketID(user.socketID);
      }, 1000);
    });

    // Subscribe the player's socket to the gameID room so they are included in game broadcasts
    player.socket.join(this.gameID);
    this.players.push(player);

    setTimeout(this.invalidateGameData.bind(this), 200);
  }

  removePlayer(user) {
    const player = this.players.find((p) => p.user.id === user.id);

    if (!player) return;

    user.gameID = "";
    UserHandler.getUserSchemaById(user.id).then((userSchema) => {
      userSchema.currentRoom = "";
      userSchema.save();

      // TODO: Send the following when userSchema.save() is successful
      // for now, wait one second
      setTimeout(
        () => Connection.invalidateUserBySocketID(user.socketID),
        1000
      );
    });

    player.socket.leave(this.gameID);

    // Remove the player
    this.players = this.players.filter((p) => p.user.id !== user.id);
  }

  broadcast(event, data) {
    // Broadcasts an event/data to members of this game's room
    Connection.instance.io.to(this.gameID).emit(event, data);
  }

  addConnectionListeners() {
    const connection = Connection.instance;
    connection.on(GameEventType.MOVE_CURSOR, this.onMoveCursor.bind(this));
  }

  onMoveCursor(data) {
    // Add the cursor coordinates to the list of coordinates
    // { userID, x, y }
    this.coordinates[data.userID] = { x: data.x, y: data.y };
  }

  dispose() {
    // Dispose of the game
    clearInterval(this.tickInterval);
    this.disposed = true;
  }

  async assignQuestion() {
    const q = await this.createQuestion();
    this.correctAnswer = q.correctAnswer;
    delete q.correctAnswer;
    this.question = q;
  }

  submitAnswer(userID, answer) {
    console.log(userID, answer);
    const player = this.players.find((p) => p.user.id === userID);
    if (!player) return;

    player.answer = answer;

    this.invalidateGameData();
  }

  async createQuestion() {
    // Category 22 is geography
    const url = `https://opentdb.com/api.php?amount=1&difficulty=easy&type=multiple&category=22`;

    // Fetch Questions

    let u;
    do {
      u = (await axios.get(url)).data.results[0];
    } while (!isValidQuestion(u));
    const q = {
      prompt: u.question,
      answers: shuffle(u.incorrect_answers.concat(u.correct_answer))
    };

    q.correctAnswer = q.answers.indexOf(u.correct_answer);

    return q;
  }
}

module.exports = { Game, GameMode: Mode };
