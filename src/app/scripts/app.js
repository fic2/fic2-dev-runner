/* global deferredBootstrapper */
/* global JSTACK */
/* jshint camelcase: false */

'use strict';


deferredBootstrapper.bootstrap({
  element: document.body,
  module: 'srcApp',
  resolve: {
    APP_CONFIG: ['$http', function ($http) {
      return $http.get('/config.json');
    }],
    SES_CONFIG: ['$http', function ($http) {
      return $http.get('/ses.json');
    }]
  }
});

/*
var loginRequired = function($location, $q) {  
    var deferred = $q.defer();

    if(! userIsAuthenticated()) {
        deferred.reject()
        $location.path('/login');
    } else {
        deferred.resolve()
    }

    return deferred.promise;
}
*/

/**
 * @ngdoc overview
 * @name srcApp
 * @description
 * # srcApp
 *
 * Main module of the application.
 */
angular
  .module(
    'srcApp', [
      'ngResource',
      'ngRoute',
      'oauth'
    ])
  .factory(
    'loginRequiredFactory',
    function($rootScope, $location, $q, AccessToken, Endpoint) {
      return function() {
	var deferred = $q.defer();
	var logged = !!AccessToken.get();
	if(! logged) {
          //deferred.reject();
	  return Endpoint.redirect();
	} else {
          deferred.resolve(AccessToken.get());
	}
	return deferred.promise;
      };
    })
  .factory(
    'keystoneRequiredFactory',
    function($q, APP_CONFIG, loginRequiredFactory) {
      var authenticateWithKeystone = function(oauth_creds){
	var deferred = $q.defer();
	JSTACK.Keystone.init(APP_CONFIG['keystone-uri'] + '/v2.0/');
	JSTACK.Keystone.authenticate(null, null, oauth_creds.access_token, 'tenant_data.id', deferred.resolve, deferred.reject);
	return deferred.promise
	  .catch(function(){console.log('Cannot authenticate with Keystone');});
      };
      return function() {
	return loginRequiredFactory()
	  .then(authenticateWithKeystone);
      };
      
    }
  )
  .config(
    function ($provide, $routeProvider, $locationProvider) {
      $provide.decorator('$sniffer', function($delegate) {
			   $delegate.history = false;
			   return $delegate;
			 });
      $locationProvider.html5Mode(true).hashPrefix('!');
      $routeProvider
	.when('/launch/:seKeyName', { templateUrl: 'views/launch.html',
			   controller: 'LaunchCtrl',
			   resolve: { loginRequired: function(loginRequiredFactory){return loginRequiredFactory();}}
			 })
	.when('/', { templateUrl: 'views/main.html',
		     controller: 'MainCtrl',
		     resolve: { loginRequired: function(loginRequiredFactory){return loginRequiredFactory();}}
		   })
	.otherwise({ redirectTo: '/' });
    })
  .run(
    function ($rootScope, $location, $resource, APP_CONFIG) {
      $rootScope.OAuthConfig = APP_CONFIG;
      
      // $rootScope.$on(
      // 	'$viewContentLoaded', function(){
      // 	  $.material.init();
      // 	});
    });