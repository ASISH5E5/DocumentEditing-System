const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const models = require('../models/models');
const User = mongoose.model('User');
const bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));

module.exports = function(passport) {

  router.get('/login/success', function (req, res) {
    res.status(200).json({ success: true, user: req.user });
  });

  router.get('/register', function(req, res) {
    console.log('in register');
  });

  var validateReq = function(userData) {
    return (userData.password === userData.passwordRepeat);
  };

  router.post('/register', function(req, res) {
    console.log('register');
    var newUser = new models.User({
      name: req.body.name,
      password: req.body.password,
      email: req.body.email
    });

    User.find({ email: req.body.email }, function(err, existingUser) {
      if (err) {
        console.log("Error in register", err);
        res.status(500).redirect('/register');
        return;
      }
      if (existingUser) {
        console.log("User exists");
        res.redirect('/login');
      } else {
        newUser.save(function(err, user) {
          if (err) {
            console.log(err);
            res.status(500).redirect('/register');
            return;
          }
          console.log(user);
          res.status(200).json({ success: true, user: user });
        });
      }
    });
  });

  router.get('/login/failure', function(req, res) {
    console.log('in auth.js get login failure');
    res.status(500).json({ success: false });
  });

  router.post('/login', passport.authenticate('local', { 
    successRedirect: '/login/success',
    failureRedirect: '/login/failure' 
  }));

  router.get('/logout', function(req, res) {
    req.logout();
    res.send({ success: true });
  });

  return router;
};
