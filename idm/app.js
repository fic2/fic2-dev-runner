var express = require('express');
var OAuth2 = require('./oauth2').OAuth2;


var app = express();

var config = require('./config.json');


var oa = new OAuth2(
  config['client-id'],
  config['client-secret'],
  config['site'],
  config['authorize-path'],
  config['token-path'],
  config['redirect-uri']);


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
      console.log("Error %j", e);
      res.sendStatus(500);
      return;
    }
    // console.log('Token = %j, res = %j', results.access_token, results);

    /* Location: http://example.com/cb#access_token=2YotnFZFEjr1zCsicMWpAA
               &state=xyz&token_type=example&expires_in=3600
    */
    res.redirect(
      config['idm_hack_redirect-uri_with_fragment'] +
        '#access_token=' + results.access_token +
        '&token_type=' + results.token_type +
        '&expires_in=' + results.expires_in +
        '&scope=' + results.scope //+
        //'&refresh_token=' + results.refresh_token
    );
    return;
  });

});

var port = 9000;

app.listen(port);

console.log('Express server started on port ' + port);
