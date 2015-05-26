'use strict';

var util = require('util');
var extend = require('extend');
var express = require('express');
var P = require('bluebird');
var R = require('restling');
var OAuth2 = require('./oauth2').OAuth2;

P.longStackTraces();

var app = express();

var config = require('./config.json');


var oa = new OAuth2(
  config['client-id'],
  config['client-secret'],
  config['site'],
  config['authorize-path'],
  config['token-path'],
  config['redirect-uri']);


function Error500(message, org) {
  this.message = message;
  this.name = "Error500";
  this.org = org;
  Error.captureStackTrace(this, Error500);
};
Error500.prototype = Object.create(Error.prototype);
Error500.prototype.constructor = Error500;



var retrieve_user_information = function (acc) {
  var target = 'https://account.lab.fiware.org/users?access_token=' + acc.raw_idm_response.access_token;
  return R.get(target)
    .then(null, function(cause) {
      var msg = 'Server side error while retrieving the user personal data';
      throw new Error500(msg, cause);
    })
    .then(function(response){
      console.log('User personal data: ' + util.inspect(response.data));
      /*
      { organizations: [],
        displayName: 'John',
        roles: [ [Object], [Object] ],
        app_id: '2611d06b4241734e9703957bbbc09b20',
        email: 'john.doe@email.com',
        id: 'john-doe' }
      */
      return extend(acc, {raw_user_data: response.data});
    })
};

var retrieve_keystone_token = function(acc) {
  var target = 'https://cloud.lab.fiware.org/keystone/v3/auth/tokens';
  var data = {"auth":{"identity":{"methods":["oauth2"],"oauth2":{"access_token_id": acc.raw_idm_response.access_token}},"scope":{"project":{"name": acc.raw_user_data.id + " cloud", "domain": {"id": "default"}}}}};
  return R.postJson(target, data, {rejectUnauthorized: false})
    .then(null, function(cause) {
      var msg = 'Server side error while retrieving the keystone token';
      throw new Error500(msg, cause);
    })
    .then(function(response){
      console.log('Keystone data: ' + util.inspect(response.data));
      /* { token:
      { methods: [ 'oauth2' ],
        roles: [ { id: '9eb0158e4c0b48d4a06c6144ab08a25d', name: 'owner' } ],
        expires_at: '2015-05-26T12:58:30.438749Z',
        project:
        { domain: { id: 'default', name: 'Default' },
          id: '00000000000000000000000000000888',
          name: 'john-doe cloud' },
        catalog:
        [ { endpoints:
            [ { url: 'http://api2.xifi.imaginlab.fr:9696/',
                region: 'Lannion2',
                interface: 'public',
                id: '0fb78716d29e4391b2ec65ba9e256662' },
              { url: 'http://api2.xifi.imaginlab.fr:9696/',
                region: 'Lannion2',
                interface: 'admin',
                id: 'fe002ccccfbe4f45b083f004b0095dd1' },
              { url: 'http://api2.xifi.imaginlab.fr:9696/',
                region: 'Lannion2',
                interface: 'internal',
                id: '9ebbb2dd0d6543479f6ef6a9068615fb' } ],
            type: 'network',
            id: '1e58c7863ebf4ea591712a22f219c365' }],
        extras: {},
        user:
        { domain: { id: 'default', name: 'Default' },
          id: 'john-doe',
          name: 'john.doe@email.com' },
        audit_ids: [ '3J7CUdNkS-if01lSCfJEGw' ],
        issued_at: '2015-05-25T12:58:30.438805Z' } }
      */
      return extend(acc, {X_Auth_Token: response.response.headers['x-subject-token'], raw_keystone_data: response.data});
    });
};

var compute_redirection = function(acc) {
  var redirect_url = config['idm_hack_redirect-uri_with_fragment'] +
    '#access_token=' + acc.raw_idm_response.access_token +
    '&token_type=' + acc.raw_idm_response.token_type +
    '&expires_in=' + acc.raw_idm_response.expires_in +
    '&scope=' + acc.raw_idm_response.scope +
    //'&refresh_token=' + acc.raw_idm_response.refresh_token +
    '&displayName=' + acc.raw_user_data.displayName +
    '&X-Auth-Token=' + acc.X_Auth_Token +
    '&tenantId=' + acc.raw_keystone_data.token.project.id +
    '&tenantName=' + acc.raw_keystone_data.token.project.name +
    '&expiresAt=' + acc.raw_keystone_data.token.expires_at +
    '&issuedAt=' + acc.raw_keystone_data.token.issued_at +
    '&userId=' + acc.raw_keystone_data.token.user.id +
    '&userName=' + acc.raw_keystone_data.token.user.name
    ;
  return extend(acc, {redirect_url: redirect_url});
};

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', function (req, res) {
  var code = req.query.code;
  // console.log('/callback : ' + code);

  if (!code) {
    res.redirect(oa.getAuthorizeUrl());
    return;
  }

  oa.getOAuthAccessToken(req.query.code, function (e, results){
    if (!results || e) {
      console.log("Error while requesting an OAuth2 token: " + util.inspect(e));
      res.sendStatus(500);
      return;
    }

    return P.resolve({raw_idm_response: results})
      .then(retrieve_user_information)
      .then(retrieve_keystone_token)
      .then(compute_redirection)
      .then(function(acc){
        console.log('Redirecting to: ' + acc.redirect_url);
        res.redirect(acc.redirect_url);
      })
      .catch(Error500, function(e) {
        console.log(util.inspect(e));
        return res.sendStatus(500);
      })
      .catch(function(e) {
        console.log('Unhandled error: ' + util.inspect(e));
        return res.sendStatus(500);
      });
    
    // console.log('Token = %j, res = %j', results.access_token, results);

    /* Location: http://example.com/cb#access_token=2YotnFZFEjr1zCsicMWpAA
               &state=xyz&token_type=example&expires_in=3600
    */
    /*res.redirect(
      config['idm_hack_redirect-uri_with_fragment'] +
        '#access_token=' + results.access_token +
        '&token_type=' + results.token_type +
        '&expires_in=' + results.expires_in +
        '&scope=' + results.scope //+
        //'&refresh_token=' + results.refresh_token
    );
    return;*/
  });

});

var port = 9000;

app.listen(port);

console.log('Express server started on port ' + port);
