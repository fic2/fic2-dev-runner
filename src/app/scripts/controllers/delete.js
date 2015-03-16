/* jshint camelcase: false */


'use strict';


/**
 * @ngdoc function
 * @name srcApp.controller:DeleteCtrl
 * @description
 * # DeleteCtrl
 * Controller of the srcApp
 */
angular.module('srcApp')
  .controller(
    'DeleteCtrl',
    function ($scope, $q, $resource, $routeParams, $timeout, $location, APP_CONFIG, SES_CONFIG, loginRequired, os) {

      $scope.se = SES_CONFIG.ses[$routeParams.seKeyName];
      $scope.targetSeName = $routeParams.seKeyName;
      $scope.failure = 'An error occured';
      $scope.instance_name = '_dhub_generated_panamax';
      var oauth_creds = loginRequired;

      var deletion = function() {
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

        var retriesWithDelay = function(promise, max, delay){
          var tmp = promise();
          for (var index=1; index <= max; index++) {
            tmp = tmp
              .then(function(result){return result;})
              .catch(
                function() {
                  if (delay <= 0) {
                    return promise();
                  } else {
                    return $timeout(function() { return promise(); }, delay);
                  }
                }
              );
          }
          return tmp;
        };

        var removeInstance = function() {
          $scope.serverData = null;
          var name = $scope.instance_name;
          var get = function() {
	    return os.fetchNovaServers()
	      .then(function(data){return data.servers;})
	      .then(os.getByNameFactory(name))
              .catch(
                function(cause) {
                  if (cause === 'Not found') {
                    return null;
                  }
                  return $q.reject(cause);
                }
              )
	      .then(
	        function(serverData) {
		  //debugger; // jshint ignore: line
		  console.info('Server found: ' + JSON.stringify(serverData));
		  $scope.serverData = serverData;
		  return null;
	        }
	      );
	  };

          var del = function() {
            return os.deleteServer($scope.serverData.id);
          }

          return retriesWithDelay(get, 3, 750)
            .catch(
              function(cause) {
                $scope.failure = 'Unable to fetch the list of instances';
	        return $q.reject(cause);
              })
            .then(
              function() {
                if ($scope.serverData) {
                  return retriesWithDelay(del, 3, 750);
                }
              }
            )
            .catch(
              function(cause) {
                $scope.failure = 'Cannot delete instance with id \'' + $scope.serverData.id + '\'';
	        return $q.reject(cause);
              }
            );
        };


        var removeSecurityGroup = function() {
          var name = os.createName('sec_group');

          return retriesWithDelay(os.getSecurityGroupList, 3, 750)
            .then(null, function(cause) {
                $scope.failure = 'Unable to fetch the security groups list';
	        return $q.reject(cause);
            })
            .then(function(securityGroupsData){return securityGroupsData.security_groups;})
            .then(os.getByNameFactory(name))
            .then(null, function(cause) {
              console.info('The security group was already deleted');
              return null;
            })
            .then(
              function(securityGroupData) {
                var f = function() { return os.deleteSecurityGroup(securityGroupData.id); };
                return retriesWithDelay(f, 3, 750)
                  .then(null, function(cause) {
                    $scope.failure = 'Cannot delete the security group \'' + securityGroupData.id + '\'';
                    return $q.reject(cause);
                  });
              }
            );

        };


        var removeFloatinIps = function() {
          var getFloatingIps = function(){
	    return os.getFloatingIps()
	      .then(
	        function(floatingIpsData) {
		  return floatingIpsData.floating_ips;
	        });
	  };

          return retriesWithDelay(getFloatingIps, 4, 750)
	    .catch(
	      function(cause) {
	        $scope.failure = 'Unable to reach the floating ip endpoint';
	        return $q.reject(cause);
	      })
              .then(
                function(floatingIps) {
	          var index = null;
                  var iptoBeRemove = [];
	          for (index = 0; index < floatingIps.length; index++){
		    var current = floatingIps[index];
                    if (!current.instance_id || current.instance_id ===  $scope.serverData.id) {
                      iptoBeRemove.push(current);
                    }
	          }
                  var promises = iptoBeRemove.map(
                    function(floatingIp) {
                      return os.releaseFloatingIp(floatingIp.id)
                        .catch(
                          function(cause) {
                            $scope.failure = 'Unable to release the floating ip ' + floatingIp.ip;
                            return $q.reject(cause);
                          }
                        );
                    }
                  );
                  return $q.all(promises);
                });
        };


        var start = function(oauth_access_token) {
          var sub = function() {
            return os.loadTenant(oauth_access_token);;
          };
          return retriesWithDelay(sub, 3, 1000)
            .catch(
              function(cause) {
                $scope.failure = 'The OpenStack\'s endpoint is unavailable.';
                return $q.reject(cause);
              }
            );
        };

        $scope.steps = [];
        ((wrap('Loading tenant information', start))(oauth_creds.access_token))
          .then(wrap('Authenticating with Keystone', os.authenticateWithKeystone))
          .then(function(accessData){
            $scope.tenantData = accessData.access.token.tenant; return null;})
          .then(wrap('Removing the generated instance', removeInstance))
          .then(wrap('Removing unused floating ips', removeFloatinIps))
          .then(wrap('Removing the generated security group', removeSecurityGroup))
          .then(
            function() {
              //debugger; // jshint ignore: line
              $scope.success = 'Your environment has been deleted.';
              angular.element('#success-dialog_button').trigger('click');
            })
          .catch(
            function(cause){
              $scope.cause = cause;
              angular.element('#failure-dialog_button').trigger('click');
              console.error(cause);
            });
      };

      $scope.deletion = deletion;

      return null;
    });
