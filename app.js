var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require("connect-mongo");
const flash = require("connect-flash")
var indexRouter = require('./routes/index');
require("dotenv").config({ path: "./.env" });
var usersRouter = require('./routes/users');
const { connectDB } = require('./config/db');
var app = express();
const path = require('path');
const usersRoutes = require("./routes/user.routes")
const profileRoutes = require("./routes/profile.routes")
const userFeedRoutes = require("./routes/feed.routes")
const postRoutes = require("./routes/post.routes")
const followRoutes = require("./routes/follow.routes")
const notesRoutes = require("./routes/notes.routes")
const storyRoutes = require("./routes/story.routes")
const highlightsRoutes = require("./routes/highlights.routes")
const settingsRoutes = require("./routes/settings.routes")
const messagesRoutes = require("./routes/messages.routes")




app.use(session({
    secret: process.env.GOOGLE_SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 2 * 60 * 60 * 1000 },
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        autoRemove: 'disabled'
    }),
}));

app.use(flash());

app.use(passport.authenticate('session'));

passport.serializeUser(function(user, cb) {
    cb(null, { id: user.id, username: user.username, name: user.name });
    process.nextTick(function() {
    });
});


passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
        return cb(null, user);
    });
});

//db connection
connectDB();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// setting up a static file js and stylesheets.
app.use(express.static(path.join(__dirname, 'public')));
app.use(logger('dev'));

//body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// active cookie-parser for reading a cookie in the backend
app.use(cookieParser());

// user routes
app.use("/", usersRoutes)

// profile routes
app.use("/", profileRoutes)

// user feed routes
app.use("/", userFeedRoutes)

// post routes
app.use("/", postRoutes)

//follow routes
app.use("/", followRoutes)

// notes routes
app.use("/", notesRoutes)

// stroy routes
app.use("/", storyRoutes)

// highlights  routes
app.use("/", highlightsRoutes)

// settings routes
app.use("/", settingsRoutes)

// messages routes
app.use("/", messagesRoutes)




// unknown routes
app.all("*", function(req, res) {
    res.status(404).render("error");
    // res.status(404).json({success:false, message : `${req.url} not found`})

})



module.exports = app;