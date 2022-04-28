const express = require('express');
const router = express.Router();

const Password = require('../controllers/Password');
const JWT = require('../controllers/JWT');
const User = require('../classes/User');
const CookieMaker = require('../classes/CookieMaker');

const UserHandler = require('../controllers/UserHandler');
const { cookie } = require('express/lib/response');

router.post('/login', (req, res) => {
  if (req.body.isGuest) {
    // Create new Guest with Standard PW and Email in DB
    UserHandler.createNewUser('123', true, 'GUEST@GUEST.de').then((result) => {
      // Send User-Object to Frontend & Generate new Token
      const user = new User(result);
      CookieMaker.createCookie(true, user).then((cookieContent) => {
        // Send user-Model to FrontEnd

        res.cookie(
          cookieContent.name,
          cookieContent.token,
          cookieContent.options
        );
        res.send(user);
      });
    });
  } else {
    UserHandler.getUserByMail(req.body.email).then((response) => {
      if (response.length > 0) {
        // check Password with BCrypt and recieve new Token
        const check = Password.check(
          req.body.password,
          response[0].password,
          response[0].username
        );

        if (check) {
          // Create new User without critical Data like Password etc
          const user = new User(response[0]);

          const token = JWT.generate(user.username, user.email, user.id);

          // Update Token in DB
          UserHandler.updateToken(user.id, token);
          CookieMaker.createCookie(false, user, token).then((cookieContent) => {
            // Send user-Model to FrontEnd
            res.cookie(
              cookieContent.name,
              cookieContent.token,
              cookieContent.options
            );
            res.send(user);
          });
        } else {
          // If Password is incorrect
          res.status(401).send('Wrong Password!');
        }
      } else {
        // If no User was found
        res.send(`User not Found`);
      }
    });
  }
});

router.post('/registration', (req, res) => {
  // Create new User in DB
  UserHandler.createNewUser(req.body.password, false, req.body.email).then(
    res.send('Success')
  );
});

router.get('/delete', JWT.check, (req, res) => {
  // Delete a User in DB
  const id = req.query.id;
  UserHandler.deleteUser(id).then((response) => res.send(response));
});

router.post('/update', JWT.check, (req, res) => {
  // Update User | Must recieve ID!
  UserHandler.updateUser(
    req.body.id,
    req.body.newUsername,
    req.body.password,
    req.body.newPassword,
    req.body.newSkin,
    req.body.newEmail
  ).then((response) => {
    // Respond with true or false to Frontend, depending on Success
    res.send(response);
  });
});

router.post('/setonline', JWT.check, (req, res) => {
  // Log User to currentlyonlines-Collection in or out.
  // Requiers UserID & Boolean "online"
  // Returns "Logged in" || "Logged Out"

  UserHandler.changeOnlineState(req.body).then((response) =>
    res.send(response)
  );
});

router.get('/:id', JWT.check, (req, res) => {
  // Send a User-Model to the FrontEnd, without critical Data like Password
  UserHandler.getUserById(req.params.id).then((response) => res.send(response));
});

router.post('/multi/medium', JWT.check, async (req, res) => {
  const ids = req.body.idsArray;

  let usersArray = [];
  let temp;

  for (let i = 0; i < ids.length; i++) {
    temp = await UserHandler.getMediumUserById(ids[i]);
    usersArray.push(temp);
  }

  if (usersArray.length > 0) {
    res.status(200).send(usersArray);
  } else {
    res.status(204).send('No Content');
  }
});

router.post('/multi/light', JWT.check, async (req, res) => {
  const ids = req.body.idsArray;

  let usersArray = [];
  let temp;

  for (let i = 0; i < ids.length; i++) {
    temp = await UserHandler.getSmallUserById(ids[i]);
    usersArray.push(temp);
  }

  if (usersArray.length > 0) {
    res.status(200).send(usersArray);
  } else {
    res.status(204).send('No Content');
  }
});

module.exports = router;
