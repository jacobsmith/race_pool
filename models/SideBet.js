var mongoose = require('mongoose');
var userSchema = require('./User').schema;

var sideBetSchema = new mongoose.Schema({
  name: String,
  bet: String,
  wager: String,
  challengee: String,
  challenger: String
});

module.exports = mongoose.model('SideBet', sideBetSchema);
