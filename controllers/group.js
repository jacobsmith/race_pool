var _ = require('lodash');
var async = require('async');
var User = require('../models/User');
var Group = require('../models/Group');
var GroupUserDriver = require('../models/GroupUserDriver');
var secrets = require('../config/secrets');
var drivers = require('../constants/drivers.js');
var raceStatus = require('../controllers/raceStatus');
var q = require('q');

var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: 'Mailgun',
    auth: {
        user: secrets.mailgun.user,
        pass: secrets.mailgun.password
    }
});


exports.getGroups = function(req, res) {
  currentUser = req.user;
  Group.find({ users: { $all: currentUser }}).exec().then(function (groups) {
    res.render('group/index', {groups: groups});
  });
};

exports.getCurrentStandings = function(req, res) {
  var groupId = req.params.groupId;

  raceStatus.getCurrentStandings().then(function(response) {
    var drivers = response.drivers;
    var status = response.status;

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

                    driver.user = user;

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

        return res.render('group/currentStanding', {drivers: updatedDrivers, status: status});
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

    console.log('user: ', user);

    if (group.creatorId != user) {
      req.flash('errors', { msg: 'Only the creator of a group can choose to close it.'});
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

    if (group.users.length === 33) {
      req.flash('errors', { msg: 'Sorry, that group is already full! Please join another group or create your own!'});
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

exports.requestToJoin = function(req, res) {
  var groupId = req.params.groupId;
  var userId = req.params.userId;

  Group.findOne({_id: groupId}).exec(function(err, group) {
    if (group.requests.indexOf(userId) == -1) {
      group.requests.push(userId);
      group.save();

      User.find(({_id: { $in: [group.creatorId, userId] }})).exec(function(err, users) {
        console.log('users: ', users);
          creator = users[0]._id.toString() === group.creatorId ? users[0] : users[1];
          requestingUser = creator === users[0] ? users[1] : users[0];
          sendPendingRequestEmailToCreator(creator, requestingUser);
      });
    }
  });

  req.flash('success', { msg: 'You will receive an email when the group own approves your request!' });
  return res.redirect('/');

  function sendPendingRequestEmailToCreator(creator, requestingUser) {
    var mailOptions = {
     to: creator.email,
     from: "RacePool@IMS.org",
     subject: 'A new user wants to join your Race Pool',
     text: 'Hello, ' + creator.profile.name + '!\n\n' + requestingUser.profile.name +
        ' is requesting to join your RacePool. Please login to the site to confirm or deny their request!\n\nThanks and happy racing!\nRace Pool and the IMS'
   };

   transporter.sendMail(mailOptions, function(err) {
     if (err) {
       console.log('ERROR sending email: ', err);
     }
   });
  }
};

exports.allowUserToJoin = function(req, res) {
  var groupId = req.params.groupId;
  var userId = req.params.userId;

  Group.findOne({_id: groupId}).exec(function(err, group) {
    User.findOne({_id: userId}).exec(function(err, user) {
      group.users.push(user);

      var filteredRequests = _.filter(group.requests, function(r) { return r != userId; });
      group.requests = filteredRequests;

      group.save();

      sendAcceptanceEmail(user, group);
      req.flash('success', { msg: 'Successfully added ' + user.profile.name + ' to the group!' });
      return res.redirect('/group/' + groupId);

    });
  });

  function sendAcceptanceEmail(user, group) {
    var mailOptions = {
      to: user.email,
      from: "RacePool@IMS.org",
      subject: 'Race Pool - You have been accepted to join ' + group.name,
      text: 'Hello, ' + user.profile.name + '!\n\n' + 'You have been accepted into the group ' + group.name + '! Good luck!\n\nThanks and happy racing!\nRace Pool and the IMS'
    };

    transporter.sendMail(mailOptions, function(err) {
      if (err) {
        console.log('ERROR sending email: ', err);
      }
    });
  }
};

exports.rejectUser = function(req, res) {
  var groupId = req.params.groupId;
  var userId = req.params.userId;

  Group.findOne({_id: groupId}).exec(function(err, group) {
    User.findOne({_id: userId}).exec(function(err, user) {

      var requests = group.requests;
      var filteredRequests = _.filter(requests, function(r) { return r != userId; });
      group.requests = filteredRequests;
      group.save();

      req.flash('info', { msg: 'Denied request from ' + user.profile.name + '.' });
      return res.redirect('/group/' + groupId);

    });
  });
};

exports.viewGroup = function(req, res) {
  var groupId = req.params.groupId;
  var currentUserId = req.user._id.toString();

  var groupUrl = req.protocol + '://' + req.get('host') + '/group/' + groupId;
  var appUrl = req.protocol + '://' + req.get('host');

  Group.findOne({_id: groupId}).exec(function(err, group) {
    currentUserIsInGroup = _.map(group.users, function(u) { return u._id.toString(); }).indexOf(currentUserId) > -1;

    User.find({ _id: { $in: group.requests } }).exec(function(err, users) {
      res.render('group/view', {
        group: group,
        currentUserId: currentUserId,
        groupUrl: groupUrl,
        currentUserIsInGroup: currentUserIsInGroup,
        requestingUsers: users,
        appUrl: appUrl
      });
    });
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
    console.log('creating with user: ', user);
    if (user) {
      var group = new Group({
        name: req.body.name,
        wager: req.body.wager,
        firstPlaceWin: req.body.firstPlaceWin,
        secondPlaceWin: req.body.secondPlaceWin,
        thirdPlaceWin: req.body.thirdPlaceWin,
        lastCarRunning: req.body.lastCarRunning,
        users: [user],
        creatorId: user._id.toString()
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
