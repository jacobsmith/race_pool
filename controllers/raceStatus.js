var _ = require('lodash');
var async = require('async');
var User = require('../models/User');
var Group = require('../models/Group');
var secrets = require('../config/secrets');
var http = require('http');
var vm = require('vm');
var Q = require('q');

exports.getStartingPositions = function(req, res) {
  var jsonpSandbox = vm.createContext({jsonCallback: function(r){return r;}});

  var body = '';
  var currentStatus = http.get('http://corp-erp.cloudapp.net/timingscoring-prerace.json', function(raceResponse) {
    raceResponse.setEncoding('utf8');

    raceResponse.on('data', function (chunk) {
      body += chunk;
    });

    raceResponse.on('end', function() {
      var response = vm.runInContext(body, jsonpSandbox);

      return res.render('race/startingPositions', {
        racers: _.sortBy(response.timing_results.Item, 'startingPosition')
      });
    });
  });

  currentStatus.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });

  currentStatus.end();

};

exports.getCurrentStandings = function() {
  var deferred = Q.defer();

  var jsonpSandbox = vm.createContext({jsonCallback: function(r){return r;}});

  var body = '';
  var currentStatus = http.get('http://corp-erp.cloudapp.net/timingscoring.json', function(raceResponse) {
    raceResponse.setEncoding('utf8');

    raceResponse.on('data', function (chunk) {
      body += chunk;
    });

    raceResponse.on('end', function() {
      var response = vm.runInContext(body, jsonpSandbox);
      deferred.resolve(response.timing_results.Item);
    });
  });

  currentStatus.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });

  currentStatus.end();

  return deferred.promise;
};
