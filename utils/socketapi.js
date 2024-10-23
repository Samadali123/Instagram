const { Server } = require("socket.io");
const userModel = require("../routes/users");
const messageModel = require("../routes/messages")



let io;

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",  // Configure this according to your needs
      methods: ["GET", "POST"]
    }
  });

  // Listen for connection events
  io.on("connection", async function (socket) {
    console.log(`A user connected`);
    let loggedInUser = null;
    socket.on(`join-server`, async (userdets) => {
      await userModel.findOneAndUpdate({ username: userdets.username }, { socketId: socket.id }, { new: true })
      console.log(userdets.username + "connected ");
      loggedInUser = await userModel.findOne({ username: userdets.username });

      //send message to the server
      socket.on("send-message", async(data)=>{
        const receiver = await userModel.findOne({_id :data.receiver})
        const sender =  loggedInUser._id;
        const message = data.message;
        if(! receiver) {
          console.log("receiver not found")
        }
        if(! sender){
          console.log("sender not found")
        }
        if(! message){
          console.log("message not found")
        }

        const newMessage =  await messageModel.create({
             message :  message,
             sender : sender,
             receiver : receiver._id
        })

        socket.to(receiver.socketId).emit("recieve-message", newMessage)
        
      })


    })

    socket.on("disconnect", async function () {
      await userModel.findOneAndUpdate({ socketId: socket.id }, { socketId: "" }, { new: true })
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
