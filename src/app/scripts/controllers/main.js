/* jshint camelcase: false */


'use strict';


/**
 * @ngdoc function
 * @name srcApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the srcApp
 */
angular.module('srcApp')
  .controller(
    'MainCtrl',
    function ($scope, $q, $resource, AccessToken, Endpoint, APP_CONFIG, SES_CONFIG, loginRequired) {
      $scope.ses = SES_CONFIG.ses;
      var oauth_creds = loginRequired;
      $scope.oauth_creds = oauth_creds;
      /*
      var loadTenant = function(oauth_access_token) {
	var Tenants = $resource(APP_CONFIG['keystone-uri'] + '/v2.0/tenants', {}, { get: {method: 'GET', headers: { 'X-Auth-Token': oauth_access_token }}});
	return Tenants.get().$promise
	  .then(
	    function(data) {
	      var tenant = data.toJSON().tenants[0];
	      return tenant;
	    })
	  .catch(function(cause){ console.log('Cannot retrieve tenant: ' + cause);});
      };

      var authenticateWithKeystone = function(tenant_data){
	var deferred = $q.defer();
	JSTACK.Keystone.init(APP_CONFIG['keystone-uri'] + '/v2.0/');
	JSTACK.Keystone.authenticate(null, null, oauth_creds.access_token, tenant_data.id, deferred.resolve, deferred.reject);
	return deferred.promise
	  .then(function(){changeEndpoints(APP_CONFIG['cloud-uri']);})
	  .catch(function(){console.log('Cannot authenticate with Keystone');});
      };

      var fetchNovaServers = function(){
	var deferred = $q.defer();
	JSTACK.Nova.getserverlist(true, false, deferred.resolve, deferred.reject, 'Lannion');
	return deferred.promise
	  .then(function(servers_data){console.log(servers_data);});
      };
       */

      /*
      loadTenant(oauth_creds.access_token)
	.then(authenticateWithKeystone)
	.then(fetchNovaServers);
       */

      return null;
  });








      /*
      var loadOSToken = function(tenant) {
	$scope.tenant_id = tenant.id;
	var Tokens = $resource(APP_CONFIG['keystone-uri'] + '/v2.0/tokens', {}, { get: {method: 'POST'}});
	var payload = {
	      'auth': {
		'token': {
		  'id': oauth_creds.access_token
		},
		'tenantId': tenant.id
	      }
	    };
	return Tokens.get(payload).$promise
	  .then(
	    function(access_data) {
	      var os_token = access_data.access.token.id;
	      $scope.os_token = os_token;
	      console.log('os_token: ' + os_token);
	      return os_token;
	    }
	  )
	  .catch(function(cause){ console.log('Cannot retrieve OS token: ' + cause);});
	  //.catch(function(cause){console.log('Cannot retrieve OS token: ' + cause); throw "OsTokenError";});
      };
      */

















	/*
	var Tenants = $resource(APP_CONFIG['keystone-uri'] + '/v2.0/tenants', {}, { get: {method: 'GET', headers: { 'X-Auth-Token': oauth_creds.access_token }}});
	Tenants.get()
	  .$promise
	  .then(
	    function(data) {
	      var tenant = data.toJSON().tenants[0];
	      return tenant;
	    })
	  .then(
	    function(tenant) {
	      var Tokens = $resource(APP_CONFIG['keystone-uri'] + '/v2.0/tokens', {}, { get: {method: 'POST'}});
	      var payload = {
		'auth': {
		  'token': {
		    'id': oauth_creds.access_token
		  },
		  'tenantId': tenant.id
		}
	      };
	      Tokens.get(payload)
		.$promise
		.then(
		  function(access_data) {
		    var os_token = access_data.access.token.id;
		    console.log('os_token: ' + os_token);
		    JSTACK.Keystone.init(APP_CONFIG['keystone-uri'] + '/v2.0/');
		    JSTACK.Keystone.authenticate(null, null, oauth_creds.access_token, tenant.id,						 
						 function(result) { // jshint ignore: line
						   changeEndpoints(APP_CONFIG['cloud-uri']);
						   var Z = $resource('https://cloud.lab.fiware.org/Waterford/compute/v2/00000000000000000000000000003273/servers/detail',
								     {},
								     {get: {method: 'GET', headers: { 'X-Auth-Token': os_token }}});
						   Z.get();

						   JSTACK.Nova.getserverlist(true, false, function(result){console.log('end ' + result);}, null, 'Lannion');
						 }
						);
		    
		  })
		.catch(
		  //console.log('error');
		);
	    }
	  )
	  .catch(
	    function(_) { // jshint ignore: line
	      console.log('error'); 
	    }
	  );
	*/