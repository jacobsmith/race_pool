var _ = require('lodash');
var async = require('async');
var User = require('../models/User');
var Group = require('../models/Group');
var secrets = require('../config/secrets');

exports.getGroups = function(req, res) {
  Group.find().exec(function (err, groups) {
    console.log('USERS: ', groups[0].users);
    res.render('group/index', {groups: groups});
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
