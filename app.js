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


app.use('/', indexRouter);
app.use('/users', usersRouter);

// unknown routes
app.all("*", function(req, res) {
    res.status(404).render("error");
})



module.exports = app;