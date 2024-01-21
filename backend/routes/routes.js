const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const models = require('../models/models.js');
const Document = models.Document;
const User = models.User;

function uniq(a) {
  return Array.from(new Set(a));
}

const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.get('/isLoggedIn', function (req, res) {
  if (!req.session.user) {
    res.send({ loggedIn: false });
  } else {
    res.send({ loggedIn: true });
  }
});

router.get('/documents/all/:userId', function(req, res) {
  const userId = req.params.userId;
  if (!userId) {
    console.log('the user id was undefined in get all documents');
  }
  User.findById(userId, function(err, user) {
    if (err) {
      console.log('error finding user for all documents', err);
      res.status(500).json({ success: false });
    } else if (user) {
      user.getAllDocuments(function(err, documents) {
        if (err) {
          console.log('error getting documents', err);
          res.status(500).json({ success: false, message: 'Unable to get user information' });
        } else {
          if (documents) {
            res.status(200).json({ success: true, documents: documents });
          } else {
            console.log('user found but had no documents');
            res.status(200).json({ success: true, documents: [] });
          }
        }
      });
    } else {
      console.log('user not found');
      res.status(400).json({ err: err });
    }
  });
});

router.get('/documents/:docId', function(req, res) {
  const docId = req.params.docId;
  Document.findById(docId)
    .populate('collaborators')
    .populate('author')
    .exec()
    .then((doc) => {
      if (doc) {
        res.status(200).json({ success: true, document: doc });
      } else {
        console.log('document not found');
        res.status(400).json({ err: err });
      }
    })
    .catch((err) => {
      console.log('document not found');
      res.status(400).json({ err: err });
    });
});

router.get('/documents/owned/:userId', function(req, res) {
  const userId = req.params.userId;
  User.findById(userId, function(err, user) {
    if (err) {
      console.log('error finding user for owned documents');
      res.status(500).json({ err: err });
    } else if (user) {
      user.getOwnedDocuments(function(err, documents) {
        if (err) {
          console.log('error getting owned documents', err);
          res.status(500).json({ err: err, message: 'Unable to get user information' });
        } else {
          if (documents) {
            res.status(200).json({ documents: documents });
          } else {
            console.log('user found but had no owned documents');
            res.status(200).json({ documents: [] });
          }
        }
      });
    } else {
      console.log('user not found');
      res.status(400).json({ err: err });
    }
  });
});

router.get('/documents/collaborate/:userId', function(req, res) {
  const userId = req.params.userId;
  User.findById(userId, function(err, user) {
    if (err) {
      console.log('error finding user for collaborated documents');
      res.status(500).json({ err: err });
    } else if (user) {
      user.getCollaboratedDocuments(function(err, documents) {
        if (err) {
          console.log('error getting collaborated documents', err);
          res.status(500).json({ err: err, message: 'Unable to get user information' });
        } else {
          if (documents) {
            console.log('collaborated documents found ', documents);
            res.status(200).json({ documents: documents });
          } else {
            console.log('user found but had no collaborated only documents');
            res.status(200).json({ documents: [] });
          }
        }
      });
    } else {
      console.log('user not found');
      res.status(400).json({ err: err });
    }
  });
});

router.post('/documents/add/collaborator/:documentId', function(req, res) {
  console.log('entered router collaborator route');
  const docId = req.params.documentId;
  const collaboratorEmails = req.body.collaboratorEmails;
  let duplicateEmails = '';
  let newCollaboratorEmails = '';
  Document.findById(docId)
    .populate('author')
    .exec()
    .catch(err => {
      console.log('error in first catch of collaborators', err);
      throw new Error('Mongo Error. Can\'t add collaborators');
    })
    .then((doc) => {
      if (doc) {
        const currentCollaborators = doc.collaborators;
        User.find({ email: { $in: collaboratorEmails } }).exec()
          .then(users => {
            if (users && users.length > 0) {
              users.forEach((user) => {
                const userRef = mongoose.Types.ObjectId(user._id);
                const alreadyExists = currentCollaborators.some((collaborator) => {
                  return JSON.stringify(collaborator) === JSON.stringify(userRef);
                });
                if (!alreadyExists) {
                  newCollaboratorEmails += `${user.email}`;
                  currentCollaborators.push(userRef);
                } else {
                  duplicateEmails += `${user.email} `;
                }
              });
              doc.title = doc.title;
              doc.content = doc.content;
              doc.collaborators = currentCollaborators;
              doc.password = doc.password;
              doc.save()
                .then(updatedDoc => {
                  console.log('successful save doc');
                  res.status(200).json({ success: true, document: updatedDoc, added: newCollaboratorEmails, notAdded: duplicateEmails });
                })
                .catch(err => {
                  console.log('error saving doc after added collaborators', err);
                  throw new Error('Unable to update collaborators.' + err);
                });

            } else {
              console.log('error: no users found in update collaborators, users.length==0');
              res.status(500).json({ success: false, error: 'One or more of those emails were not valid' });
            }
          })
          .catch(err => {
            console.log('caught error in catch find of users ', err);
            throw new Error('Mongo Error: Unable to find user with email.' + err);
          });
      } else {
        console.log('caught error in the case where !doc is true');
        throw new Error('Unable to find document. Cannot add collaborators.');
      }
    })
    .catch((err) => {
      console.log('errors with collaborator fell to last catch', err);
      res.status(500).json({ success: false, error: err });
    });
});

router.post('/documents/save/:documentId', function(req, res) {
  const docId = req.params.documentId;
  const docTitle = req.body.title;
  const docPassword = req.body.password;
  const docContent = req.body.content;
  const docCollaborators = req.body.collaborators;
  const docContentHistory = req.body.contentHistory;
  console.log('doc id received in save ', docId);

  Document.findById(docId, function(err, doc) {
    if (err) {
      console.log('error finding document in the save', err);
      res.status(500).json({ err: err });
    } else {
      if (doc) {
        doc.title = docTitle || doc.title;
        doc.content = docContent || doc.content;
        doc.collaborators = docCollaborators || doc.collaborators;
        doc.password = docPassword || doc.password;
        doc.contentHistory = docContentHistory || doc.contentHistory;
        doc.contentHistory = uniq(doc.contentHistory);
        console.log('Routes', doc.contentHistory);
        doc.save(function(err, updatedDoc) {
          if (err) {
            console.log('error updating doc', err);
            res.status(400).json({ error: err });
          } else {
            res.status(200).json({ success: true, document: updatedDoc });
          }
        });
      } else {
        console.log('document not found, can\'t update', err);
        res.status(400).json({ err: err });
      }
    }
  });
});

router.post('/documents/new/:authorId', function(req, res) {
  console.log('entered new docs route');
  const userId = req.params.authorId;
  const docTitle = req.body.title;
  const docPassword = req.body.password || '';
  const docContent = req.body.content || '';

  const newDocument = new Document({
    title: docTitle,
    author: userId,
    collaborators: [userId],
    shareLink: 'sharelink.com',
    content: docContent,
    password: docPassword,
    dateCreated: Date.now().toString(),
  });

  newDocument.save(function(err, doc) {
    if (err) {
      console.log('error saving new doc', err);
      res.status(400).json({ error: err });
    } else {
      console.log('successful save', doc);
      res.status(200).json({ success: true, document: doc });
    }
  });
});

module.exports = router;
