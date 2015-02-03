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
  .directive(
    'ngFailure',
    function() {
      return {
	restrict: 'A',
	scope: true,
	template: '<div class="alert alert-dismissable alert-danger"><strong>{{failure}}</strong></div>'
      };
    })
  .controller(
    'LaunchCtrl',
    function($scope, $q, $resource, $routeParams, APP_CONFIG, SES_CONFIG, loginRequired, os) {
      $scope.se = SES_CONFIG.ses[$routeParams.seKeyName];
      var oauth_creds = loginRequired;

      var wrap = function(text, wrapped_promise){
	var step = {'class': 'active', 'status': '...', 'text': text};
	$scope.steps.push(step);
	return function(acc){
	  return wrapped_promise(acc)
	    .then(
	      function(value){
		step['class'] = 'success';
		step.status = 'ok';
		return value;
	      })
	    .catch(
	      function(cause){
		step['class'] = 'warning';
		step.status = 'error';
		return $q.reject(cause);
	      });
	};
      };

      var getOrCreatePublicNetwork = function() {
	var name = os.createName('private_network');
	return os.getNetworksList()
	  .then(os.getByNameFactory(name))
	  .then(
	    function(publicNetworkData){
	      $scope.publicNetworkData = publicNetworkData;
	      return publicNetworkData;
	    })
	  .catch(
	    function(){
	      console.warn('Public network not found, creating a new one');
	      return os.createNetwork(name, $scope.tenantData.id); 
	    });
      };

      var getOrCreatePublicSubNetwork = function(publicNetworkData) {
	var name = os.createName('private_sub_network');
	return os.getSubNetworksList()
	  .then(function(data){return data.subnets;})
	  .then(os.getByNameFactory(name))
	  .then(
	    function(publicSubNetworkData){
	      $scope.publicSubNetworkData = publicSubNetworkData;
	      return null;
	    })
	  .catch(
	    function(){
	      console.warn('Public sub network not found, creating a new one');
	      debugger; // jshint ignore: line
	      return os.createSubNetwork(publicNetworkData.id, name, $scope.tenantData.id);
	    }
	  );
      };

      var getOrCreateRouter = function() {
	var name = os.createName('router');
	return os.getRoutersList()
	  .then(function(data){return data.routers;})
	  .then(os.getByNameFactory(name))
	  .then(
	    function(routerData){
	      $scope.routerData = routerData;
	      return null;
	    }
	  )
	  .catch(
	    function(){
	      console.warn('Router was not found, creating a new one');
	      return os.createRouter(name, APP_CONFIG['external-network-id'], $scope.tenantData.id)
		.catch(
		  function(cause){
		    if ('message' in cause && cause.message === '409 Error'){
		      $scope.failure = 'You exceeded the limit of Floating IPs on the public network. You need at least 1 available floating ip.';
		      angular.element('#failure-dialog_button').trigger('click');
		    }
		    return $q.reject(cause);
		  }
		);
	    }
	  );
      };


      $scope.steps = [];
      ((wrap('Loading tenant information', os.loadTenant))(oauth_creds.access_token))
	.then(wrap('Authentificating with Keystone', os.authenticateWithKeystone))
	.then(function(accessData){
		$scope.tenantData = accessData.access.token.tenant; return null;})
	.then(function(){
		return $scope.se.imageId;})
	.then(wrap('Checking the image existence', os.getImageDetails)) // 404 not found
        .then(wrap('Creating the public network', getOrCreatePublicNetwork))
	.then(wrap('Creating the public subnetwork', getOrCreatePublicSubNetwork))
	.then(wrap('Creating the router', getOrCreateRouter))
	.catch(function(cause){
		 console.error(cause);});
    });