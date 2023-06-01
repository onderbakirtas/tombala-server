const { createServer } = require("http");
const { Server } = require("socket.io");

const port = process.env.PORT || 8080;

const httpServer = createServer();

const gameNumbers = Array.from(Array(90).keys(), (e) => e + 1);

let shadowNumbers = [...gameNumbers];

let loopInterval = null;
let remainingDraws = 90;
let currentNumber = -1;

let winner = "";

let users = [];

function selectRandom() {
  if (shadowNumbers.length === 0) {
    return -1;
  }
  let index = Math.floor(Math.random() * shadowNumbers.length);
  let number = shadowNumbers[index];
  shadowNumbers.splice(index, 1);

  return number;
}

function startGame() {
  io.emit("game:started");

  loopInterval = setInterval(() => {
    if (remainingDraws === 0) {
      endGame();
      return;
    }

    currentNumber = selectRandom();
    remainingDraws -= 1;
    io.emit("game:draw", currentNumber);
    console.log("game:draw", remainingDraws, currentNumber);
  }, 1000);
}

function endGame() {
  clearInterval(loopInterval);
  remainingDraws = 90;
  currentNumber = -1;
  shadowNumbers = [...gameNumbers];
  io.emit("game:ended", {
    started: false,
    finished: true,
  });
  console.log("game:ended");
}

function restartGame() {
  clearInterval(loopInterval);
  remainingDraws = 90;
  currentNumber = -1;
  shadowNumbers = [...gameNumbers];
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
    allowedHeaders: ["my-custom-header"],
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
    let player = { id: _id, name: data, admin: false };
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
    console.log("> Player disconnected", _id);
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
