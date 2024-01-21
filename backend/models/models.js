const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  fullName: {
    type: String,
  },
  passwordHash: {
    type: String,
  },
  emailAddress: {
    type: String,
  },
});

const DocumentSchema = new Schema({
  title: {
    type: String,
    default: 'Untitled Document',
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  collaborators: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  }],
  content: String,
  shareLink: String,
  documentPassword: {
    type: String,
  },
  dateCreated: String,
  contentHistory: [],
});

const DocumentModel = mongoose.model('Document', DocumentSchema);

UserSchema.methods.getCollaboratedDocuments = function (callback) {
  const userId = this._id;
  DocumentModel.find({ author: { $nin: [userId] }, collaborators: { $all: [userId] } })
    .populate('author')
    .populate('collaborators')
    .exec(function (err, documents) {
      console.log('Documents only collaborated on: ', documents);
      callback(err, documents);
    });
};

UserSchema.methods.getOwnedDocuments = function (callback) {
  const userId = this._id;
  DocumentModel.find({ author: userId })
    .populate('author')
    .populate('collaborators')
    .exec(function (err, documents) {
      console.log('Documents owned by user: ', documents);
      callback(err, documents);
    });
};

UserSchema.methods.getAllDocuments = function (callback) {
  const userId = this._id;
  DocumentModel.find({ collaborators: { $all: [userId] } })
    .populate('collaborators')
    .populate('author')
    .exec(function (err, documents) {
      console.log('All documents related to user: ', documents);
      callback(err, documents);
    });
};

const UserModel = mongoose.model('User', UserSchema);

module.exports = {
  User: UserModel,
  Document: DocumentModel
};
