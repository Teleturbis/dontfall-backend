const express = require("express");
const router = express.Router();

const JWT = require("../controllers/JWT");
const gameHandler = require("../game/GameData");
const UserHandler = require("../controllers/UserHandler");
const Arcade = require("../game/Arcade");

router.get("/list", (req, res) => {
  res.send(Arcade.games.map((game) => game.toListItem()));
});

router.post("/host", JWT.check, async (req, res) => {
  console.log(req.body);
  const user = await UserHandler.getUserById(req.body.userID);
  const gameOptions = req.body.gameOptions;

  const gameID = Arcade.hostGame(user, gameOptions);
  if (gameID) res.status(200).send(gameID);
  else res.status(500).send("Error creating game");
});

router.post("/join", JWT.check, async (req, res) => {
  const user = await UserHandler.getUserById(req.body.userID);
  const gameID = req.body.gameID;

  Arcade.joinGame(user, gameID)
    ? res.status(200).send("Game joined")
    : res.status(500).send("Error joining game");
});

router.post("/leave", JWT.check, async (req, res) => {
  const user = await UserHandler.getUserById(req.body.userID);

  Arcade.leaveGame(user)
    ? res.status(200).send("Game left")
    : res.status(500).send("Error leaving game");
});

router.get("/:id", JWT.check, (req, res) => {
  // Return game state, this is called by clients when the game state is invalidated via socket
  const gameID = req.params.id;
  const game = Arcade.getGame(gameID);

  // Does game exist?
  if (!game) return res.status(404).send("Game not found");

  // Is the user in the game?
  console.log(req);

  res.status(200).send(game.toGameState());
});

router.get("/categories", JWT.check, (req, res) => {
  // Return available question categories
  res.send(gameHandler.categoriesCatalog());
});

module.exports = { router };
