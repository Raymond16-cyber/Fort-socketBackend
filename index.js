import { Server } from "socket.io";

const io = new Server(8000, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Add user
let users = [];

// const addUser = (userId, userInfo, socketID) => {
//   const currentUser = users.some((user) => user.userId === userId);
//   currentUser ? currentUser : users.push({ userId, userInfo, socketID });
// };
const addUser = (userId, userInfo, socketID, friendsList) => {
  const exists = users.some((user) => user.userId === userId);
  if (!exists) {
    users.push({ userId, userInfo, socketID, friendsList });
    // console.log("first instance",users);
  }
};

// disconnected user
const removeUser = (socketID) => {
  users = users.filter((user) => user.socketID !== socketID);
  // console.log("updatedusers", users);
};

const findFriend = (id) => {
  return users.find((user) => user.userId === id);
};

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("addUser", async (userId, userInfo, friendsList) => {
    addUser(userId, userInfo, socket.id, friendsList);

    // Send updated online friends to the connected user
    const currentUser = users.find((user) => user.userId === userId);
    if (currentUser) {
      const onlineFriends = users.filter((user) =>
        currentUser.friendsList.includes(user.userId)
      );
      // console.log("userId:", userId, "onlineFriends:", onlineFriends);
      io.emit("getUser", onlineFriends);
    }

    // Also notify other users who have this new user as friend
    users.forEach((user) => {
      if (user.friendsList.includes(userId)) {
        const theirOnlineFriends = users.filter((u) =>
          user.friendsList.includes(u.userId)
        );
        io.to(user.socketID).emit("getUser", theirOnlineFriends);
      }
    });
  });

  socket.on("sendMessage", (data) => {
    const user = findFriend(data?.receiverID);
    if (user !== undefined) {
      console.log("first..", data);

      io.to(user.socketID).emit("getMessage", data);
    }
  });

  // Typing message indicator
  socket.on("typingmessage", (data) => {
    // ✅ FIRST: Destructure everything you need
    const { senderID, senderName, receiverID, msg } = data;

    // ✅ THEN: Use those values
    const user = findFriend(receiverID);

    if (user !== undefined) {
      io.to(user.socketID).emit("getTypedMessage", {
        senderID,
        receiverID,
        senderName,
        msg,
      });
    }

    // console.log("typing message", data);
  });

  // Seen messages
  socket.on("messageSeen", (msg) => {
    const user = findFriend(msg?.senderID);
    if (user !== undefined) {
      io.to(user.socketID).emit("messageSeenResponse", msg);
    }
  });

  // Delivered messages
  socket.on("messageDelivered", (msg) => {
    const user = findFriend(msg?.senderID);
    if (user !== undefined) {
      io.to(user.socketID).emit("messageDeliveredResponse", msg);
    }
  });

  socket.on("'seen", (data) => {
    const user = findFriend(data?.senderID);
    if (user !== undefined) {
      io.to(user.socketID).emit("seenSuccess", data);
    }
  });

  // listen for disconnect event
  socket.on("disconnect", () => {
    // console.log("A user disconnected");
    removeUser(socket.id);
    io.emit("getUser", users);
  });
});
