const { v4: uuidv4 } = require('uuid');
// const UserHandler = require('../controllers/UserHandler');
const {
  Connection,
  GameEventType,
  ConnectionEventType
} = require('../controllers/Connection');

class Game {
  constructor(options) {
    this.name = options.name;
    this.roomID = uuidv4();
    this.hostID = options.hostID;
    this.password = options.password ? options.password : null;
    this.maxPlayer = options.maxPlayer;
    this.players = options.players ? options.players : [];
    this.spectators = options.spectators ? options.spectators : [];
    this.gameMode = options.gameMode;
    this.gameCategory = options.category;
    this.gameDifficulty = options.difficulty;
    this.gameRounds = options.rounds;
    this.currentRound = 0;

    this.addConnectionListeners();
  }

  addConnectionListeners() {
    Connection.instance.on(GameEventType.JOIN, this.onGameJoin);
  }

  async onGameJoin(socketID, data) {
    console.log('Game-Join: ', socketID, data);

    // const user = new User.Small(await UserHandler.getUserBySocketID(socketID));
    // currentGames.find((el) => el.roomID === roomID)?.players.push(user);
    // this.players.push(user);
  }

  startCountdown() {
    let counter = 3;
    const interval = setInterval(() => {
      if (counter !== 'START') counter--;
      if (counter === 0) {
        counter = 'START';
        return counter;
      }
      if (counter === 'START') {
        clearInterval(interval);
        return;
      }
      if (counter) return counter;
    }, 1000);
  }

  async getQuestions() {
    const difficulty = this.difficulty ? `&difficulty=${this.difficulty}` : '';
    const type = this.gameMode ? `&type=${this.gameMode}` : '&type=multiple';
    const category = this.category
      ? `&category=${this.getCategoryID(this.category)}`
      : '';

    if (this.currentRound <= this.gameRounds) {
      // Build URL from Options

      const url = `https://opentdb.com/api.php?${
        amount + type + difficulty + category
      }`;

      // Fetch Questions

      return (await axios.get(url)).data.results;
    } else {
      return;
    }
  }

  async checkLevel(userID) {
    let user = await UserHandler.getFullUserById(userID);
    let requiredXP = 100 + ((user.level / 7) ^ 2);
    let lvlUp = true;

    if (user.experience >= requiredXP) {
      do {
        user.level++;
        user.experience = user.experience - requiredXP;
        requiredXP = (100 + user.level / 7) ^ 2;
        lvlUp = user.experience >= requiredXP ? true : false;
      } while (lvlUp);

      UserSchema.findByIdAndUpdate(
        { _id: userID },
        { level: user.level, experience: user.experience }
      ).catch((err) => console.log(err));

      return 228;
    } else {
      return 227;
    }
  }

  async addExperience(userID, experience) {
    let error = null;

    await UserSchema.findByIdAndUpdate(
      { _id: userID },
      { experience: experience }
    ).catch((err) => {
      console.log('AddXP-Error: ', err);
      error = 512;
    });

    return error !== null ? error : checkLevel(userID);
  }

  async addGold(userID, gold) {
    let error = null;

    await UserSchema.findByIdAndUpdate({ _id: userID }, { gold: gold }).catch(
      (err) => {
        console.log('AddGold-Error: ', err);
        error = 512;
      }
    );

    return error !== null ? error : 201;
  }

  getCategoryID(category) {
    // Get ID for Category

    switch (category) {
      case 'General Knowledge':
        return '9';

      case 'Books':
        return '10';

      case 'Film':
        return '11';

      case 'Music':
        return '12';

      case 'Musicals & Theatres':
        return '13';

      case 'TV':
        return '14';

      case 'Video Games':
        return '15';

      case 'Board Games':
        return '16';

      case 'Science & Nature':
        return '17';

      case 'Computers':
        return '18';

      case 'Mathematics':
        return '19';

      case 'Mythology':
        return '20';

      case 'Sports':
        return '21';

      case 'Geography':
        return '22';

      case 'History':
        return '23';

      case 'Politics':
        return '24';

      case 'Art':
        return '25';

      case 'Celebrities':
        return '26';

      case 'Animals':
        return '27';

      case 'Vehicles':
        return '28';

      case 'Comics':
        return '29';

      case 'Gadgets':
        return '30';

      case 'Anime & Manga':
        return '31';

      case 'Cartoon & Animations':
        return '32';

      default:
        return '9';
    }
  }
}

module.exports = Game;
