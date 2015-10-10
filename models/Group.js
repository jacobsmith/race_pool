var mongoose = require('mongoose');

var groupSchema = new mongoose.Schema({
  name: String,
  users: Array
});

module.exports = mongoose.model('Group', groupSchema);
