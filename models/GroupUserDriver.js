var mongoose = require('mongoose');

var groupUserDriverSchema = new mongoose.Schema({
  group: {type: mongoose.Schema.Types.ObjectId, ref: 'Group'},
  user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  driver: Number
});

module.exports = mongoose.model('GroupUserDriver', groupUserDriverSchema);
