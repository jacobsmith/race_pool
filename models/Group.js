var mongoose = require('mongoose');
var userSchema = require('./User').schema;

var groupSchema = new mongoose.Schema({
  name: String,
  users: Array,
  wager: String,
  firstPlaceWin: String,
  secondPlaceWin: String,
  thirdPlaceWin: String,
  lastCarRunning: String,
  closed: Boolean,
  creatorId: String
});

groupSchema.virtual('prizes').get(function() {
  return {
    first: this.firstPlaceWin,
    second: this.secondPlaceWin,
    third: this.thirdPlaceWin,
    last: this.lastCarRunning
  };
});

module.exports = mongoose.model('Group', groupSchema);
