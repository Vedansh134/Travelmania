if(process.env.NODE_ENV != "production"){
    require('dotenv').config();
    //console.log(process.env);
};
//console.log(process.env.KEY) // remove this after you've confirmed it is working

const express = require("express");
const app = express();
const port = 8080;
const mongoose = require("mongoose");
const methodOverride = require("method-override");
//const mongo_url = "mongodb://127.0.0.1:27017/travelmania";
const dbURL = process.env.ATLASDB_URL;

const path = require("path");
const ejsMate = require("ejs-mate");
const expressError = require("./utils/expressError.js");

//routes
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

//session and flash
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");

//passport
const passport = require("passport");
const LocalStrategy = require("passport-local");
//requires the model with Passport-Local Mongoose plugged in
const User = require("./models/user.js");

app.set("views", path.join(__dirname, "./views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "public/js")));
app.use(express.urlencoded({ extended: true }));

app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);

//mongosession store
const store = MongoStore.create({
    mongoUrl : dbURL,
    crypto: {
        secret : process.env.SECRET,
    },
    touchAfter : 24 * 3600,
});

store.on("error", () => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

//session
const sessionOption = {
    store,
    secret : process.env.SECRET,
    resave : false,
    saveUninitialized : true,
    cookie : {
        expires : Date.now()+7*24*60*60*1000,
        maxAge : 7*24*60*60*1000,
        httpOnly : true
    },
};


main()
    .then((res) => {
        console.log("connection successful");
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(dbURL);
};

// app.get("/",(req,res)=>{
//     res.send("app working");
// });

app.use(session(sessionOption));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// middleware
app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// use from router => listing.js and review.js and user.js
app.use("/listings",listingRouter);
app.use("/listings/:id/reviews",reviewRouter);
app.use("/", userRouter);

//response for all route
app.all("*",(req,res,next)=>{
    next(new expressError(404,"page not found!"));
});

//middleware for handle error
app.use((err, req, res, next) => {
    let {status=404,message="Somethong went wrong"} = err;
    res.status(status).render("error.ejs", {message});
});

app.listen(port, () => {
    console.log(`app listen on port number ${port}`);
});

