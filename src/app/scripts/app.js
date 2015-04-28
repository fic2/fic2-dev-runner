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
        console.log('loginRequiredFactory, logged=' + logged);
        if(! logged) {
          deferred.reject('Not logged');
          //return Endpoint.redirect();
        } else {
          console.log('loginRequiredFactory, access=', AccessToken.get());
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
  .factory(
    'regionSetupFactory',
    function($sessionStorage) {
      var config = {
        default_: 'Lannion2',
        regions: ['Lannion2', 'Lannion', 'Spain2', 'Berlin', 'Trento', 'Waterford']
      };

      var getPossibleRegions = function() {
        return config.regions;
      }

      var getCurrentRegion = function() {
        if (! $sessionStorage.regionSetup) {
          $sessionStorage.regionSetup = config.default_;
        }
        return $sessionStorage.regionSetup || config.default_;
      };

      var setCurrentRegion = function(region) {
        $sessionStorage.regionSetup = region;
        console.log('setCurrentRegion: ' + region);
      };

      return {
        getCurrentRegion: getCurrentRegion,
        getPossibleRegions: getPossibleRegions,
        setCurrentRegion: setCurrentRegion
      };
    }
  )
  .config(
    function ($provide, $routeProvider, $locationProvider, $sceProvider) {
      $sceProvider.enabled(false);
      $provide.decorator('$sniffer', function($delegate) {
        $delegate.history = false;
        return $delegate;
      });
      $locationProvider.html5Mode(true).hashPrefix('!');
      $routeProvider
        .when('/access', { templateUrl: 'views/access.html',
                           controller: 'AccessCtrl',
                           resolve: { loginRequired: function(loginRequiredFactory){return loginRequiredFactory();}}
                         })
        .when('/welcome', { templateUrl: 'views/welcome.html',
                            controller: 'WelcomeCtrl'
                          })
        .when('/create', { templateUrl: 'views/create.html',
                           controller: 'CreateCtrl',
                           resolve: { loginRequired: function(loginRequiredFactory){return loginRequiredFactory();}}
                         })
        .when('/delete', { templateUrl: 'views/delete.html',
                           controller: 'DeleteCtrl',
                           resolve: { loginRequired: function(loginRequiredFactory){return loginRequiredFactory();}}
                         })
        .otherwise({ redirectTo: '/welcome' });
    })
  .run(
    function ($rootScope, $location, $resource, APP_CONFIG, Endpoint, $sessionStorage) {
      $rootScope.OAuthConfig = APP_CONFIG;

      $rootScope.$on("$routeChangeError", 
                     function (event, current, previous, rejection) {
                       console.log(event, current, previous, rejection);
                       if (rejection === 'Not logged') {
                         $sessionStorage.target = current;
                         Endpoint.redirect();
                       }
                     });

      console.warn($sessionStorage.target);
      if ($sessionStorage.target) {
        var t = $sessionStorage.target.loadedTemplateUrl;
        delete $sessionStorage.target;
        $location.path(t.substr(0, t.length-5).substr(5));
      };

      // $rootScope.$on(
      //        '$viewContentLoaded', function(){
      //          $.material.init();
      //        });
    });
