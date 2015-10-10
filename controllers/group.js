var _ = require('lodash');
var async = require('async');
var User = require('../models/User');
var Group = require('../models/Group');
var GroupUserDriver = require('../models/GroupUserDriver');
var secrets = require('../config/secrets');
var drivers = require('../constants/drivers.js');
var raceStatus = require('../controllers/raceStatus');
var q = require('q');

exports.getGroups = function(req, res) {
  Group.find().exec(function (err, groups) {
    res.render('group/index', {groups: groups});
  });
};

exports.getCurrentStandings = function(req, res) {
  var groupId = req.params.groupId;

  raceStatus.getCurrentStandings().then(function(drivers) {
    Group.findOne({_id: groupId}).exec(function(err, group) {
      if (_.isEmpty(group)) {
        req.flash('errors', { msg: 'Cannot find a group with that id.'});
        return res.redirect('/group');
      }

      GroupUserDriver.find({group: group}).exec(function(err, claimedMappings) {
        if (err) {
          console.log('ERROR: ', err);
        }

        var updatedDrivers = [];
         async.each(drivers, function(driver) {
            _.each(claimedMappings, function(claimedMapping) {

                if (parseInt(driver.startPosition) == claimedMapping.driver) {
                    var user = _.find(group.users, function(user) {
                      return user._id.toString() == claimedMapping.user.toString();
                    });

                    driver.user = user.profile.name;

                    if (updatedDrivers.indexOf(driver) === -1) {
                      updatedDrivers.push(driver);
                    }
                } else {

                    if (updatedDrivers.indexOf(driver) === -1) {
                      updatedDrivers.push(driver);
                    }
                }
            });
        });

        console.log(updatedDrivers);
        
        return res.render('group/currentStanding', {drivers: updatedDrivers});
      });

    });

  });

};

exports.pickDriver = function(req, res) {
  var groupId = req.params.groupId;
  var user = req.user;

  Group.findOne({_id: groupId}).exec(function(err, group) {
    if (_.isEmpty(group)) {
      req.flash('errors', { msg: 'Cannot find a group with that id.'});
      return res.redirect('/group');
    }

    GroupUserDriver.find({group: group}).exec(function(err, claimedMappings) {
          // GroupUserDriver holds an integer in 'driver' for the driver's starting position
          var claimedStartPositions = _.map(claimedMappings, 'driver');

          var remainingDrivers = [];
          for (var i = 0; i < drivers.length; i++) {
            var currentDriver = drivers[i];
            if (claimedStartPositions.indexOf(parseInt(currentDriver.startPosition)) > -1) {
            } else {
              remainingDrivers.push(currentDriver);
            }
          }

          var driver;
          if (remainingDrivers.length > 0) {
            var random = _.random(0, remainingDrivers.length-1);
            driver = remainingDrivers[random];
          } else {
            req.flash('errors', { msg: 'All drivers have been taken. Good luck!' });
            return res.redirect('/group/' + groupId);
          }

          var groupUserDriver = new GroupUserDriver({
            user: user,
            group: group,
            driver: driver.startPosition
          });

          groupUserDriver.save(function(err, groupUserDriver) {
            if (err) {
              console.log('ERROR: ', err);
              req.flash('errors', { msg: 'Oops! Something went wrong; please try again.'});
               return res.redirect('/group/' + groupId);
            } else {
              req.flash('success', { msg: 'Congratulations! You have selected ' + driver.firstName + ' ' + driver.lastName  +
              ' who is staring in position #' + driver.startPosition + '.'
              });
               return res.redirect('/group/' + groupId);
            }
          });
    });
  });

};

exports.closeGroup = function(req, res) {
  var groupId = req.params.groupId;
  var user = req.user;

  Group.findOne({_id: groupId}).exec(function(err, group) {
    if (_.isEmpty(group)) {
      req.flash('errors', { msg: 'Cannot find a group with that id.'});
      return res.redirect('/group');
    }

    group.closed = true;
    group.save();
    res.redirect('/group/' + groupId);
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
