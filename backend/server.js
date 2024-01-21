const express = require('express');
const session = require('express-session');
const expressValidator = require('express-validator');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const MongoStore = require('connect-mongo/es5')(session);
const routes = require('./routes/routes');
const auth = require('./routes/auth');
const mongoose = require('mongoose');
const models = require('./models/models.js');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const _ = require('underscore');

const online = [];
const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'violet'];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressValidator());
app.use(cookieParser('secretCookie'));
app.use(express.static('build'));

app.use(session({
    secret: 'Catscoookie',
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    resave: true,
}));

passport.serializeUser(function(user, done) {
    console.log("SERIALIZE");
    done(null, user._id);
});

passport.deserializeUser(function(id, done) {
    console.log("DESERIAL");
    models.User.findById(id, function(err, user) {
        done(err, user);
    });
});

passport.use(new LocalStrategy({ usernameField: "email", passwordField: "password" }, function(email, password, done) {
    console.log("LOCAL");
    models.User.findOne({ email: email }, function(err, user) {
        if (err) {
            console.error('error in passport local strategy finding user with that email', err);
            return done(err);
        }
        if (!user) {
            console.log(user);
            return done(null, false, { message: 'Incorrect email/username.' });
        }
        if (user.password !== password) {
            return done(null, false, { message: 'Incorrect password.' });
        }
        return done(null, user);
    });
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', auth(passport));
app.use('/', routes);

if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not in the environmental variables. Try running 'source env.sh'");
}

mongoose.connection.on('connected', function() {
    console.log('Success: connected to MongoDb!');
});

mongoose.connection.on('error', function() {
    console.log('Error connecting to MongoDb. Check MONGODB_URI in env.sh');
    process.exit(1);
});

mongoose.connect(process.env.MONGODB_URI);

server.listen(process.env.PORT || 3000, function() {
    console.log('Backend server for Electron App running on port 3000!');
});

io.on('connection', (socket) => {
    socket.on('joined', ({ doc, user }) => {
        socket.join(doc);
        if (io.nsps['/'].adapter.rooms[doc].length >= 6) {
            socket.emit('redirect');
            return;
        }

        socket.emit('welcome', { doc });
        socket.documentRoom = doc;

        online.push(user);
        online[online.length - 1].color = colors[online.length - 1];
        online = _.uniq(online, '_id');

        io.to(doc).emit('onlineUpdated', { online });
        socket.broadcast.to(doc).emit('userjoined');
    });

    socket.on('newContent', stringifiedContent => {
        socket.broadcast.to(socket.documentRoom).emit('receivedNewContent', stringifiedContent);
    });

    socket.on('newContentHistory', contentHistory => {
        console.log("In socket");
        io.to(socket.documentRoom).emit('receivedNewContentHistory', contentHistory);
    });

    socket.on('cursorMove', selection => {
        socket.broadcast.to(socket.documentRoom).emit('receiveNewCursor', selection);
    });

    socket.on('disconnect', ({ userleft }) => {
        if (!userleft) {
            return;
        }
        console.log('user disconnected');
        const index = online.findIndex(u => u._id === userleft._id);
        if (index !== -1) {
            online.splice(index, 1);
        }
        socket.leave(socket.documentRoom);
        io.to(doc).emit('onlineUpdated', { online });
        socket.broadcast.to(socket.documentRoom).emit('userleft');
    });
});
