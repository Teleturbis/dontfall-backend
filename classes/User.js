class User {
  // Create User-Object for Response to Frontend without critical Data like Password
  constructor(data, token) {
    this.username = data.username;
    this.email = data.email;
    this.id = data._id;
    this.currentSkin = data.currentSkin;
    this.experience = data.experience;
    this.gold = data.gold;
    this.level = data.level;
    this.skins = data.skins;
    this.friends = data.friends;
    this.friendRequestsIncoming = data.friendRequestsIncoming;
    this.friendRequestsOutgoing = data.friendRequestsOutgoing;
    this.isGuest = data.isGuest;
  }
}

// User data (light)
class Small {
  constructor(data) {
    this.username = data.username;
    this.id = data._id;
    this.currentSkin = data.currentSkin;
    this.experience = data.experience;
    this.level = data.level;
    this.isGuest = data.isGuest;
  }
}

// User details
class Medium extends Small {
  constructor(data) {
    super(data);
    this.email = data.email;
    this.gold = data.gold;
    this.skins = data.skins;
    this.friends = data.friends;
  }
}

// Self
class Full extends Medium {
  constructor(data) {
    super(data);
    this.isOnline = data.isOnline;
    this.skins = data.skins;
    this.friendRequestsIncoming = data.friendRequestsIncoming;
    this.friendRequestsOutgoing = data.friendRequestsOutgoing;
    this.socketID = data.socketID;
    this.currentRoom = data.currentRoom;
  }
}

module.exports = { Full, Medium, Small };
