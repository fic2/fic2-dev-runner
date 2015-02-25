/* jshint camelcase: false */


'use strict';


/**
 * @ngdoc function
 * @name srcApp.controller:CreateCtrl
 * @description
 * # CreateCtrl
 * Controller of the srcApp
 */
angular.module('srcApp')
  .controller(
	  'CreateCtrl',
	  function ($scope, $q, $resource, $routeParams, $timeout, $location, APP_CONFIG, SES_CONFIG, loginRequired, os, kcSleep, coreos, panamaxFactory) {

      $scope.se = SES_CONFIG.ses[$routeParams.seKeyName];
      $scope.targetSeName = $routeParams.seKeyName;
      $scope.failure = 'An error occured';
      $scope.instance_name = '_dhub_generated_panamax';
      var oauth_creds = loginRequired;

      var create = function () {
        console.debug('Start create');


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
	        var ports = [80, 8080, 22, 443, 3000, 3001, 3002, 6001, 8000];
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

        var bootServer = function(){ // '413 Error' quota overlimit
	        var name = $scope.instance_name; //os.createName($scope.targetSeName + '__' + (new Date().getTime()));
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
	        var sub = function() {
	          return os.createServer(name, APP_CONFIG.coreos.imageId, userData, $scope.securityGroup.id, $scope.publicNetworkData.id)
	            .then(
	              function(serverData){
		              console.info('Server created: ' + JSON.stringify(serverData));
		              $scope.serverData = serverData.server;
		              return serverData.server;
	              });
	        };
	        return retries(sub, 3);
        };

        var getOrBootServer = function() { // '413 Error' quota overlimit
	        var name = $scope.instance_name;
	        var boot = function() {
	          var userData = '#cloud-config\n\n' + JSON.stringify(coreos.toObject());
	          var sub = function() {
	            return os.createServer(name, APP_CONFIG.coreos.imageId, userData,
				                             $scope.securityGroup.id, $scope.publicNetworkData.id)
	              .then(
		              function(serverData) {
		                console.info('Server created: ' + JSON.stringify(serverData));
		                //debugger; // jshint ignore: line
		                $scope.serverData = serverData.server;
		                return null;
		              });	    
	          };
	          return retriesWithDelay(sub, 3, 500);
	        };
	        var get = function() {
	          return os.fetchNovaServers()
	            .then(function(data){return data.servers;})
	            .then(os.getByNameFactory(name))
	            .then(
	              function(serverData) {
		              //debugger; // jshint ignore: line
		              console.info('Server found: ' + JSON.stringify(serverData));
		              $scope.serverData = serverData;
		              return null;
	              }
	            );
	        };
	        return retriesWithDelay(get, 3, 500)
	          .catch(
	            function(cause) {
	              //debugger; // jshint ignore: line
	              if (cause === 'Not found') {
		              return boot(); 
	              }
	              $scope.failure = 'Problems while fetching the servers list';
	              return $q.reject(cause);	      
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
		                $scope.failure = 'Impossibility to find or create a free floating ip: your quota must be full.';
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
	                var index = null;
	                for (index = 0; index < floatingIps.length; index++){
		                var current = floatingIps[index];
		                if (current.pool === $scope.externalNetworkData.name &&
		                    current.instance_id === $scope.serverData.id) {
		                  $scope.floatingIp = current;
		                  return current;
		                }
	                }
	                for (index = 0; index < floatingIps.length; index++){
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
	        var sub = function() {
	          return os.getNetworkDetail(APP_CONFIG['external-network-id'])
	            .then(
	              function(externalNetworkData) {
		              $scope.externalNetworkData = externalNetworkData;
	              }
	            );
	        };
	        return retries(sub, 3);
        };

        var tryToAssociateIp = function() {
	        var sub = function(counter) {
	          if (counter <= 0) {
	            $scope.failure = 'The function for associating an ip timed out';
	            return $q.reject('TimeOut');
	          }
	          return $timeout(function(){ return os.associateFloatingIp($scope.serverData.id, $scope.floatingIp.ip); }, 5000)
	            .catch(
	              function(cause) {
		              //debugger; // jshint ignore: line
		              if (typeof cause === 'object' && 'message' in cause && cause.message === '400 Error') {
		                return sub(counter - 1);
		              }
		              return $q.reject(cause);
	              });	  
	        };
	        var check = function() {
	          return retries(function(){return os.getFloatingIps();}, 3)
	            .then(
	              function(floatingIpsData) {
		              return floatingIpsData.floating_ips;
	              })
	            .catch(function(){ $scope.failure='A problem occured when reaching the floating ip\'s endpoint; perhaps the pool is misconfigured.'; })
	              .then(
	                function(floatingIps) {
		                var index = null;
		                for (index = 0; index < floatingIps.length; index++){
		                  var current = floatingIps[index];
		                  //debugger; // jshint ignore: line
		                  if (current.pool === $scope.externalNetworkData.name &&
		                      current.instance_id === $scope.serverData.id) {
		                    $scope.floatingIp = current;
		                    return current;
		                  }
		                }
		                return sub(24);
	                });
	        };
	        return check();
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
        
        var waitForPanamax = function() {
	        var sub = function(counter) {
	          if (counter <= 0) {
	            $scope.failure = 'The function for checking panamax timed out';
	            return $q.reject('TimeOut');
	          }
	          return $timeout(function(){ return $scope.panamax.misc.Types().query().$promise; }, 10000)
	          //return $scope.panamax.misc.Types().get().$promise
	            .catch(
	              function(cause) {
		              $scope.r = $resource;
		              //debugger; // jshint ignore: line
		              if (cause.status == 0 || cause.status == 502) {
		                return sub(counter - 1);
		              }
		              return $q.reject(cause);
	              });	  
	        };
	        $scope.panamax = panamaxFactory('https://' + $location.host() + '/__proxy', $scope.floatingIp.ip, 6001);
	        return sub(25);	
        };

        var injectTemplatesRepo = function() {
	        var name = 'tai-lab/fic2-poc-templates_pmx';
	        var get = function() {
	          return $scope.panamax.sources.findByName(name);
	        };
	        var create = function() {
	          return $scope.panamax.sources.SourcesFactory().save({name: name}).$promise;
	        };
	        return retriesWithDelay(get, 3, 750)
	          .catch(
	            function(cause) {
	              return retriesWithDelay(create, 3, 750)
		              .catch(
		                function(cause) {
		                  $scope.failure = 'Cannot get or attach the SE repository';
		                  return $q.reject(cause);
		                }
		              );
	            }
	          );
        };

        var fetchPmxTemplates = function() {
	        var name = 'Social Network SE';
	        var sub = function() {
	          return $scope.panamax.templates.findByName(name)
	            .then(
	              function(data) {
		              //debugger; // jshint ignore: line
		              $scope.pmxTemplates = data.all;
		              $scope.pmxTarget = data.target;
	              })
	            .catch(
	              function(cause) {
		              $scope.failure = 'The corresponding template was not found.';
		              return $q.reject(cause);
	              }
	            );
	        };
	        return retriesWithDelay(sub, 3, 750);
        };

        var launchTemplate = function() {
	        var sub = function() {
	          return $scope.panamax.apps.Apps().save({template_id: $scope.pmxTarget.id}).$promise;
	        };
	        return retriesWithDelay(sub, 3, 750)
	          .then(
	            function(data) {
	              //debugger; // jshint ignore: line
	              $scope.success_target_url = 'http://' + $scope.floatingIp.ip + ':3000';
	              $scope.success = 'Panamax should be up & accessible (' + $scope.success_target_url + ')';
	            })
	          .catch(
	            function(cause) {
	              $scope.failure = 'Unable to launch the SE';
	              return $q.reject(cause);
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
            //.then(wrap('Creating the public network', getOrCreatePublicNetwork))
	          //.then(wrap('Creating the public subnetwork', getOrCreatePublicSubNetwork))
	          //.then(wrap('Creating the router', getOrCreateRouter))
	          //.then(wrap('Attach router to subnet', bindRouterToSubnet))
	          .then(wrap('Fetching the network', getSharedPublicNetwork))
	        .then(wrap('Creating the security group', getOrCreateSecurityGroup))
	        .then(wrap('Adding the security group\'s rules', addingSecurityGroupRules))
	      // .then(wrap('Creating the server', bootServer))
	        .then(wrap('Creating the server', getOrBootServer))
	        .then(wrap('Finding or allocating a floating ip', getOrAllocateFloatingIp))
	        .then(wrap('Associating the floating ip to the newly created instance', tryToAssociateIp))
	        .then(wrap('Waiting for Panamax', waitForPanamax))
	        .then(wrap('Injecting the SE repository', injectTemplatesRepo))
	        //.then(wrap('Fetching the Panamax templates', fetchPmxTemplates))
	        //.then(wrap('Starting the SE\'s template', launchTemplate))
	        .then(
	          function() {
	            //debugger; // jshint ignore: line
		    $scope.success_target_url = 'http://' + $scope.floatingIp.ip + ':3000';
	            $scope.success = 'Panamax should be up & accessible (' + $scope.success_target_url + ')';
	            angular.element('#success-dialog_button').trigger('click');
	          })
	        .catch(
	          function(cause){
	            $scope.cause = cause;
	            angular.element('#failure-dialog_button').trigger('click');
	            console.error(cause);
	          });

      };

      $scope.create = create;

	    return null;
	  });
