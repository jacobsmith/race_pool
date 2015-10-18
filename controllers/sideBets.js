var _ = require('lodash');
var async = require('async');
var User = require('../models/User');
var Group = require('../models/Group');
var GroupUserDriver = require('../models/GroupUserDriver');
var SideBet = require('../models/SideBet');
var secrets = require('../config/secrets');
var drivers = require('../constants/drivers.js');
var q = require('q');

exports.viewAll = function(req, res) {
  var userId = req.user._id.toString();
  SideBet.find({ $or: [{ challenger: userId }, {challengee: userId}] }).exec(function(err, sideBets) {
    var userIds = [];
    _.each(sideBets, function(sideBet) {
        userIds.push(sideBet.challengee);
        userIds.push(sideBet.challenger);
    });

    User.find({ _id: { $in: _.uniq(userIds) }}).exec(function(err, users) {
      var extendedSideBets = [];
        _.each(sideBets, function(sideBet) {
            var sideBetExtended = _.extend({}, sideBet);
            sideBetExtended.challengerObj = _.find(users, function(u) { return u._id.toString() === sideBet.challenger; });
            sideBetExtended.challengeeObj = _.find(users, function(u) { return u._id.toString() === sideBet.challengee; });
            extendedSideBets.push(sideBetExtended);
        });

        console.log(extendedSideBets);
      res.render('sideBets/index', {sideBets: extendedSideBets});

    });


  });
};

exports.newBet = function(req, res) {
    res.render('sideBets/create');
};

exports.makeNewBet = function(req, res) {
  req.assert('name', 'Name of bet cannot be blank').notEmpty();
  req.assert('bet', 'The bet cannot be blank').notEmpty();
  req.assert('wager', 'The wager cannot be blank').notEmpty();
  req.assert('challenge_id', 'The challenge cannot be blank').notEmpty();

  var user = req.user;

  User.findOne({_id: req.body.challenge_id }).exec(function(err, user) {
      if (err) {
        req.flash('error', { msg: 'Sorry, we were unable to find the user you are trying to challenge. Please try again.'});
        return res.redirect('/sideBets/new');
      } else {

      }
  });

  var sideBet = new SideBet({
    name: req.body.name,
    wager: req.body.wager,
    bet: req.body.bet,
    challengee: req.body.challenge_id,
    challenger: user._id
  });

  sideBet.save(function(err) {
    if (err) {
      console.log('ERROR: ', err);
      req.flash('error', { msg: 'Oops! Something went wrong. Please to to make your side bet again!'});
      return res.redirect('/sideBets/new');
    } else {
      req.flash('success', { msg: 'Successfully created your side bet!'});
      return res.redirect('/sideBets');
    }
  });
};
