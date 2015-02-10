/* global sjcl */
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
  .factory(
    'kcSleep',
    function($timeout) {
      return function(ms) {
	return function(value) {
	  return $timeout(function() {
			    return value;
			  }, ms);
	};
      };
    })
  .directive(
    'ngFailure',
    function() {
      return {
	restrict: 'A',
	scope: true,
	template: '<div class="alert alert-dismissable alert-danger"><strong>{{failure}}</strong><p>{{cause}}</p></div>'
      };
    })
  .controller(
    'LaunchCtrl',
    function($scope, $q, $resource, $routeParams, APP_CONFIG, SES_CONFIG, loginRequired, os, kcSleep, coreos) {
      $scope.se = SES_CONFIG.ses[$routeParams.seKeyName];
      $scope.targetSeName = $routeParams.seKeyName;
      $scope.failure = 'An error occured';
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
	      return os.createNetwork(name, $scope.tenantData.id)
		.then(getOrCreatePublicNetwork);
	    });
      };

      var getOrCreatePublicSubNetwork = function(publicNetworkData) {
	var name = os.createName('private_sub_network');
	var register = function(publicSubNetworkData){
	  $scope.publicSubNetworkData = publicSubNetworkData;
	  return null;
	};
	return os.getSubNetworksList()
	  .then(function(data){return data.subnets;})
	  .then(os.getByNameFactory(name))
	  .then(register)
	  .catch(
	    function(){
	      console.warn('Public sub network not found, creating a new one');
	      return os.createSubNetwork(publicNetworkData.id, name, $scope.tenantData.id)
		.then(function(data){return register(data.subnet);});
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
		.then(function(data){ $scope.routerData = data.router; return null;})
		.catch(
		  function(cause){
		    if ('message' in cause && cause.message === '409 Error'){
		      $scope.failure = 'You exceeded the limit of Floating IPs on the public network. You need at least 1 available floating ip.';
		      //angular.element('#failure-dialog_button').trigger('click');
		    }
		    return $q.reject(cause);
		  }
		);
	    }
	  );
      };

      var bindRouterToSubnet = function(){
	//debugger; // jshint ignore: line
	return os.addInterfaceToRouter($scope.routerData.id, $scope.publicSubNetworkData.id)
	  .catch(
	    function(cause){
	      if ('message' in cause && cause.message === '400 Error') {
		console.info('The router is already attached to the subnet.');
		return null;
	      }
	      return $q.reject(cause);
	    }
	  );
      };

      var getOrCreateSecurityGroup = function(){
	var name = os.createName('sec_group');
	return os.getSecurityGroupList()
	  .then(function(securityGroupsData){return securityGroupsData.security_groups;})
	  .then(os.getByNameFactory(name))
	  .catch(
	    function(){
	      console.warn('The security group was not found, creating a new one');
	      return os.createSecurityGroup(name)
		.then(function(data){return data.security_group;}); // when creating, the result is boxed
	    }
	  )
	  .then(
	    function(securityGroupData){
	      console.log('Security group id = ' + securityGroupData.id);
	      return securityGroupData.id;
	    })
	  .then(os.getSecurityGroupDetail)
	  .then(
	    function(securityGroup){
	      //debugger; // jshint ignore: line
	      $scope.securityGroup = securityGroup.security_group;
	      return securityGroup.security_group.id;
	    }
	  );
      };

      var addingSecurityGroupRules = function(groupId){
	var ports = [80, 8080, 22, 443, 3000, 3001, 3002];
	var promises = ports.map(
	  function(port){
	    return os.createSecurityGroupRule('TCP', port, port, '0.0.0.0/0', groupId)
	      .catch(
		function(cause){
		  if ('message' in cause && cause.message === '404 Error') {
		    console.info('Rules ' + port + ' already exists');
		    return cause;
		  }
		  return $q.reject(cause);
		}
	      );
	  }
	);
	return $q.all(promises);
      };

      var bootServer = function(){
	var name = $scope.targetSeName; //os.createName($scope.targetSeName + '__' + (new Date().getTime()));
	//var userDataRaw = '#cloud-config\n\nusers:\n  - name: core\n    passwd: $6$abcdefgh$VvtMG18kvqTA.xeyJk48ATU1C.rfF.uyg1Y0XY6D5trHYWYJCNolrnra45OVGpni37Bymb3XsWBS1I1hkxhy/1\n\nwrite_files:\n  - path: /tmp/toto\n    content: |\n      azerty\n';
	var tmp = coreos.toObject();
	var userDataRaw = '#cloud-config\n\n' + JSON.stringify(tmp);
	console.log(userDataRaw);
	/*var bytes = [];
	for (var i = 0; i < userDataRaw.length; ++i)
	{
	  bytes.push(userDataRaw.charCodeAt(i));
	}
	var userData = sjcl.codec.base64.fromBits(bytes, false, false);*/
	var userData = userDataRaw;
	console.info(userData);
	return os.createServer(name, APP_CONFIG.coreos.imageId, userData, $scope.securityGroup.id, $scope.publicNetworkData.id)
	  .then(
	    function(serverData){
	      console.info('Server created: ' + JSON.stringify(serverData));
	      $scope.serverData = serverData.server;
	      return serverData.server;
	    }
	  );
      };


      
      var retries = function(promise, max){
	var tmp = promise();
	for (var index=1; index <= max; index++) {
	  tmp = tmp
	    .then(function(result){return result;})
	    .catch(
	      function() {
		return promise();		
	      }
	    );
	}
	return tmp;
      };
      
      var getOrAllocateFloatingIp = function(){
	var max = 3;
	var getFloatingIps = function(){
	  return os.getFloatingIps()
	    .then(
	      function(floatingIpsData) {
		return floatingIpsData.floating_ips;
	      })
	    .catch(function(){ $scope.failure='A problem occured when reaching the floating ip\'s endpoint; perhaps the pool is misconfigured.'; });
	};
	var allocateFloatingIps = function(){
	  return os.allocateFloatingIp(APP_CONFIG['external-network-id'])
	    .then(
	      function(floatingIpData){
		$scope.floatingIp = floatingIpData.floating_ip;
		return $scope.floatingIp; // .instance_id .pool: "ext-net"
	      })
	    .catch(
	      function(cause) {
		if ('message' in cause && cause.message === '500 Error') {
		  $scope.failure = 'Impossibility to find or create a free floating ip.';
		}
		return $q.reject(cause);
	      }
	    );
	};
	return retries(getFloatingIps, max)
	  .catch(
	    function(cause) {
	      $scope.failure = 'Unable to reach the floating ip endpoint';
	      return $q.reject(cause);
	    })
	  .then(
	    function(floatingIps) {
	      for (var index = 0; index < floatingIps.length; index++){
		var current = floatingIps[index];
		if (current.pool === $scope.externalNetworkData.name && !current.instance_id) {
		  $scope.floatingIp = current;
		  return current;
		}
	      }
	      return $q.reject('Not found');
	    })
	  .catch(
	    function(cause) {
	      return retries(allocateFloatingIps, max);
	    }
	  );
      };

      var getAndSaveExternalNetwork = function() {
	return os.getNetworkDetail(APP_CONFIG['external-network-id'])
	  .then(
	    function(externalNetworkData) {
	      $scope.externalNetworkData = externalNetworkData;
	    }
	  );
      };

      var tryToAssociateIp = function() {
	//debugger; // jshint ignore: line
	var sub = function() {
	  return ((kcSleep(3))()).then(os.associateFloatingIp($scope.serverData.id, $scope.floatingIp.ip));
	};
	return retries(sub, 3);
      };


     var getSharedPublicNetwork = function() {
       var targetId = APP_CONFIG['shared-network-id'];
       return os.getNetworkDetail(targetId)
	 .then(
	   function(networkData) {
	     $scope.publicNetworkData = networkData;
	     return networkData;
	   }
	 )
	 .catch(
	   function(cause){
	     var msg = 'The shared network "' + targetId + '" used by the instance was not found. Perhaps the DHub service is misconfigured.';
	     console.error(msg);
	     $scope.failure = msg;
	     return $q.reject(cause);	     
	   });
     };
      
      $scope.steps = [];
      ((wrap('Loading tenant information', os.loadTenant))(oauth_creds.access_token))
	.then(wrap('Authentificating with Keystone', os.authenticateWithKeystone))
	.then(function(accessData){
		$scope.tenantData = accessData.access.token.tenant; return null;})
	.then(wrap('Verifying the external network existence', getAndSaveExternalNetwork))
	.then(function(){
		return APP_CONFIG.coreos.imageId;})
	.then(wrap('Checking the image existence', os.getImageDetails))
	.catch(
	  function(cause) {
	    if (typeof cause === 'object' && 'message' in cause && cause.message === '404 Error') {
	      $scope.failure = 'The SE\'s image is missing.';
	    }
	    return $q.reject(cause);
	  }
	)// 404 not found
	.then(wrap('Finding or allocating a floating ip', getOrAllocateFloatingIp))
        //.then(wrap('Creating the public network', getOrCreatePublicNetwork))
	//.then(wrap('Creating the public subnetwork', getOrCreatePublicSubNetwork))
	//.then(wrap('Creating the router', getOrCreateRouter))
	//.then(wrap('Attach router to subnet', bindRouterToSubnet))
	.then(wrap('Fetch the network', getSharedPublicNetwork))
	.then(wrap('Creating the security group', getOrCreateSecurityGroup))
	.then(wrap('Adding the security group\'s rules', addingSecurityGroupRules))
	.then(wrap('Creating the server', bootServer))
	.then(wrap('Associate the floating ip to the newly created instance', tryToAssociateIp))
	.catch(
	  function(cause){
	    $scope.cause = cause;
	    angular.element('#failure-dialog_button').trigger('click');
	    console.error(cause);
	  });
    });