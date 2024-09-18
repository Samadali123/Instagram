const { Server } = require("socket.io");
const userModel = require("../routes/users");


let io;

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",  // Configure this according to your needs
      methods: ["GET", "POST"]
    }
  });

  // Listen for connection events
  io.on("connection", async function(socket) {
    console.log(`A user connected`);


    socket.on(`join-server`, async(userdets) => {

        await userModel.findOneAndUpdate({username : userdets.username}, {socketId : socket.id}, {new:true})
        console.log(userdets.username + "connected successfully")
    })

    socket.on("disconnect", async function() {
        await userModel.findOneAndUpdate({
            socketId: socket.id
        }, {
            socketId: ""
        })
      console.log(`A user disconnected `);
    });



  });
}

// Export the initializeSocket function and io getter
module.exports = {
  initializeSocket,
  get io() {
    return io;  // This allows you to access the io instance if needed elsewhere
  }
};
