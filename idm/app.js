var express = require('express');
var app = express();


var config = require('./config.json');


var oauth2 = require('simple-oauth2')({
  clientID: config['client-id'],
  clientSecret: config['client-secret'],
  site: config['site'],
  tokenPath: config['authorize-path']
});

// Authorization uri definition
var authorization_uri = oauth2.authCode.authorizeURL({
  redirect_uri: config['redirect-uri'],
  scope: config['scope'],
  state: '3(#0/!~'
});

// Initial page redirecting to Github
app.get('/auth', function (req, res) {
    res.redirect(authorization_uri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', function (req, res) {
  var code = req.query.code;
  console.log('/callback');
  oauth2.authCode.getToken({
    code: code,
    redirect_uri: config['redirect-uri']
  }, saveToken);

  function saveToken(error, result) {
    if (error) { console.log('Access Token Error', error.message); }
    token = oauth2.accessToken.create(result);
    res.redirect('http://runner.developer.mediafi.org/#!foobar');
  }
});

app.get('/', function (req, res) {
  res.send('Hello<br><a href="/auth">Log in with Github</a>');
});

app.listen(3000);

console.log('Express server started on port 3000');
