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
    function ($scope, $q, $resource, $routeParams, $timeout, $location, APP_CONFIG, SES_CONFIG, loginRequired, os, hlos) {

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

        var waitForInstanceRemoval = function() {
          var name = $scope.instance_name;

          var stillThere = function(instanceData) {
            $scope.failure = 'The instance ' + name + ' (id: ' + instanceData.id + ') was scheduled for removal, but is always present after a timeout';
            return $q.reject(instanceData);
          };

          var get = function() {
	    return retriesWithDelay(os.fetchNovaServers, 3, 500)
              .then(null, function(cause) {
                $scope.failure = 'Uneable to fetch the list of server, aborting deletion';
                return $q.reject(cause);
              })
	      .then(function(data){return data.servers;})
              .then(function(servers) {
                return $q.when(servers)
	          .then(os.getByNameFactory(name))
                  .then(stillThere, function(cause) {
                    console.log('The instance ' + name + ' was not found, which means it was removed');
                    return null;
                  });
              });
	  };

          return retriesWithDelay(get, 40, 750);
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
              return null;
            })
            .then(
              function(securityGroupData) {
                if (! securityGroupData) {
                  return null;
                }
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
                    if (!current.instance_id || ($scope.serverData && $scope.serverData.id && current.instance_id ===  $scope.serverData.id)) {
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

        var tryToRemoveRouter = function() {
          var name = os.createName('router');

          var getRouter = function() {
            return retriesWithDelay(os.getRoutersList, 3, 750)
              .then(null, function(cause) {
                $scope.failure = 'Unable to retrieve the routers list.';
                return $q.reject(cause);
              });
          };

          var removeRouter = function(routerData) {
            return os.deleteRouter(routerData.id)
              .then(null, function(cause) {
                $scope.failure = 'Unable to remove the router ' + routerData.id;
                return $q.reject(cause);
              });
          };

          var fetchAndRemoveRouter = function() {
            return getRouter()
              .then(function(data){return data.routers;})
              .then(function(routers) {
                return $q.when(routers)
                  .then(os.getByNameFactory(name))
                  .then(removeRouter, function(cause) {
                    console.log('The router was not found, there is no need for deletion');
                    return null;
                  });
              });
          };

          return retriesWithDelay(fetchAndRemoveRouter, 3, 750);
        };

        var tryToRemoveSubNetwork = function() {
          var name = os.createName('private_sub_network');

          var getSubNetwork = function() {
            return retriesWithDelay(os.getSubNetworksList, 3, 750)
              .then(null, function(cause) {
                $scope.failure = 'Unable to retrieve the subnetworks list.';
                return $q.reject(cause);
              });
          };

          var removeSubNetwork = function(subNetworkData) {
            return os.deleteSubNetwork(subNetworkData.id)
              .then(null, function(cause) {
                $scope.failure = 'Unable to remove the subnetwork ' + subNetworkData.id;
                return $q.reject(cause);
              });
          };

          var fetchAndRemoveSubNetwork = function() {
            return getSubNetwork()
              .then(function(data){return data.subnets;})
              .then(function(subnets) {
                return $q.when(subnets)
                  .then(os.getByNameFactory(name))
                  .then(removeSubNetwork, function(cause) {
                    console.log('The subnetwork was not found, there is no need for deletion');
                    return null;
                  });
              });
          };

          return retriesWithDelay(fetchAndRemoveSubNetwork, 3, 750);
        };

        var tryToRemoveNetwork = function() {
          var name = os.createName('private_network');
          return hlos.removeNetwork(name);
        };

        $scope.steps = [];
        ((wrap('Loading tenant information', start))(oauth_creds.access_token))
          .then(wrap('Authenticating with Keystone', os.authenticateWithKeystone))
          .then(function(accessData){
            $scope.tenantData = accessData.access.token.tenant; return null;})
          .then(wrap('Removing the generated instance', removeInstance))
          .then(wrap('Waiting for instance removal', waitForInstanceRemoval))
          .then(wrap('Removing unused floating ips', removeFloatinIps))
          .then(wrap('Removing the generated security group', removeSecurityGroup))
          .then(wrap('Removing the router', tryToRemoveRouter))
          .then(wrap('Removing the subnetwork', tryToRemoveSubNetwork))
          .then(wrap('Removing the network', tryToRemoveNetwork))
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
