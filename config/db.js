const mongoose = require("mongoose")
require("dotenv").config();

 exports.connectDB = async ()=>{
        try {
            await mongoose.connect(process.env.MONGO_URI)
            console.log("Db Connected  Successfully.");
        } catch (error) {
            console.log("Error connecting to MongoDB", error);
        }
}


