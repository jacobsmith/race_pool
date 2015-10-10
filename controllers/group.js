var _ = require('lodash');
var async = require('async');
var User = require('../models/User');
var Group = require('../models/Group');
var secrets = require('../config/secrets');

exports.getGroups = function(req, res) {
  Group.find().exec(function (err, groups) {
    res.render('group/index', {groups: groups});
  });
};

exports.joinGroup = function(req, res) {
  var groupId = req.params.groupId;
  var user = req.user;

  Group.findOne({_id: groupId}).exec(function(err, group) {
    if (_.isEmpty(group)) {
      req.flash('errors', { msg: 'Cannot find a group with that id.'});
      return res.redirect('/group');
    }

    // turn the Binary Json (BSON) format of mongo into a string to compare
    if (_.map(group.users, function(user) { return user._id.toString(); }).indexOf(user.id) === -1) {
      group.users.push(req.user);
      group.save();
    }

    res.redirect('/group/' + groupId);
  });
};

exports.viewGroup = function(req, res) {
  var groupId = req.params.groupId;

  Group.findOne({_id: groupId}).exec(function(err, group) {
    res.render('group/view', {group: group});
  });
};

exports.postGroup = function(req, res) {
  req.assert('name', 'The group name must be at least 3 characters.').len(3);

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }

  User.findOne({_id: req.user.id}).exec(function(err, user) {
    if (user) {
      var group = new Group({
        name: req.body.name,
        wager: req.body.wager,
        firstPlaceWin: req.body.firstPlaceWin,
        secondPlaceWin: req.body.secondPlaceWin,
        thirdPlaceWin: req.body.thirdPlaceWin,
        lastCarRunning: req.body.lastCarRunning,
        users: [user]
      });

      group.save(function(err, group) {
        if (err) {
          console.log('ERROR: unable to create group: ', err);
        } else {
          res.redirect('/group');
        }
      });
    }

  });
};

exports.newGroup = function(req, res) {
    res.render('group/create');
};
