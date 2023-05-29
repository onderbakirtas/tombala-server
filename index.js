import { createServer } from "http";
import { Server } from "socket.io";

const port = process.env.PORT || 8080;

const httpServer = createServer();

const gameNumbers = Array.from(Array(90).keys(), (e) => e + 1);

const sockets = async () => {
  let users = await io.fetchSockets();

  return users;
};

let loopInterval = null;
let remainingDraws = 5;
let currentNumber = -1;

let winner = "";

let users = [];

function selectRandom() {
  if (gameNumbers.length === 0) {
    return -1;
  }
  let index = Math.floor(Math.random() * gameNumbers.length);
  let number = gameNumbers[index];
  gameNumbers.splice(index, 1);

  return number;
}

function startGame() {
  currentNumber = selectRandom();
  io.emit("game:started");
  io.emit("game:draw", currentNumber);
  console.log("game:started");

  loopInterval = setInterval(() => {
    remainingDraws -= 1;

    if (remainingDraws === 0) {
      endGame();
      return;
    }

    currentNumber = selectRandom();
    io.emit("game:draw", currentNumber);
    console.log("game:draw", remainingDraws, currentNumber);
  }, 1000);
}

function endGame() {
  io.emit("game:ended", {
    started: false,
    finished: true,
  });
  clearInterval(loopInterval);
  remainingDraws = 5;
  console.log("game:ended");
  console.log("socket", sockets);
}

function restartGame() {
  loopInterval = null;
  remainingDraws = 5;
  currentNumber = -1;
  io.emit("game:restarted");
}

const finishGame = () => {
  io.emit("game:finished", winner);
  console.log("game:finished");
};

// Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Socket.io
io.on("connection", (socket) => {
  const _id = socket.id;

  io.emit("game:connect", users);

  socket.on("game:start", (data) => {
    console.log("> Game started");
    startGame();
  });

  socket.on("player:join", (data) => {
    console.log("> Player joined", data);
    let player = { id: _id, name: data }
    users.push(player);

    io.emit("player:joined", player);
  });

  socket.on("game:end", () => {
    console.log("> Game ended");
    endGame();
  });

  socket.on("game:restart", () => {
    console.log("> Game restarted");
    restartGame();
  });

  socket.on("game:finish", (data) => {
    console.log("> Game finish", data);
    winner = data;
    finishGame();
  });

  socket.on("disconnect", (ss) => {
    console.log("> Player disconnected", users, _id);
    users = users.filter((user) => user.id !== _id);
    io.emit("player:disconnected", _id);
    console.log("ss", ss);
  });

  socket.on("player:leave", (data) => {
    console.log("> Player left", data);
    users = users.filter((user) => user !== data);
    io.emit("player:left", data);
  });
});

httpServer.listen(port, () => {
  console.log("listening on *:8080");
});
