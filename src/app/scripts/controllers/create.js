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
	  function ($scope, $rootScope, $q, $resource, $routeParams, $timeout, $location, APP_CONFIG, loginRequired, os, coreos, panamaxFactory, panamaxUiFactory, regionSetupFactory) {

      $scope.targetSeName = $routeParams.seKeyName;
      $scope.failure = 'An error occured';
      $scope.instance_name = '_dhub_generated_panamax';
      $scope.regionSetupFactory = regionSetupFactory;
      var oauth_creds = loginRequired;

      var create = function () {
        console.debug('Start create');
        var currentRegionName = regionSetupFactory.getCurrentRegion();
        var currentRegionConfig = APP_CONFIG.regions[currentRegionName];
        var computeNoMoreIpRegex = new RegExp('No more floating ips in pool ' + currentRegionConfig['external-network-id'] + '[.]');
        var secuGroupAlreadyExists = new RegExp('Security group rule already exists');


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
	              return os.createRouter(name, currentRegionConfig['external-network-id'], $scope.tenantData.id)
		              .then(function(data){ $scope.routerData = data.router; return null;})
		              .catch(
		                function(cause){
		                  if ('message' in cause && cause.message === '409 Error'){
                                    //No more IP addresses available on network c02a7883-ff90-4e3d-9f10-fdf2d2c0025e.
                                    var expected = 'No more IP addresses available on network ' + currentRegionConfig['external-network-id'] + '[.]';
                                    if (new RegExp(expected).test(cause.body)) {
                                      $scope.failure = 'The "' + currentRegionName + '" region has no more free ip in its poll. Contact the corresponding administrator or change region.';
                                    } else {
		                      $scope.failure = 'You exceeded the limit of Floating IPs on the public network. You need at least 2 available floating ips.';
                                    }
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
	        var ports = [[80], [8080], [22], [443], [3000], [3001], [3002], [6002], [6001], [8000], [32000, 61000]];
	        var promises = ports.map(
	          function(port){
                    var portFrom = port[0];
                    var portTo = portFrom;
                    if (port.length > 1) {
                      portTo = port[1];
                    }
	            return os.createSecurityGroupRule('TCP', portFrom, portTo, '0.0.0.0/0', groupId)
	              .catch(
		              function(cause){
                                if ('message' in cause) {
                                  if (cause.message === '403 Error' && 'body' in cause) { // Lanion2 case
                                    if (secuGroupAlreadyExists.test(cause.body)) {
                                      console.info('Rules ' + portFrom + ':' + portTo + ' already exists');
                                      return cause;
                                    }
                                  }
                                  if (cause.message === '404 Error') {
                                    console.info('Rules ' + portFrom + ':' + portTo + ' already exists');
		                    return cause;
                                  }
                                  if (cause.message === '413 Error') { // Trento specific case
                                    return cause;
                                  }
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

        var waitForServer = function() {
          var sub = function() {
            return os.getServerDetail($scope.serverData.id)
              .then(function(data) {
                var status = data.status;
                if (status === 'ERROR' || status === 'DELETED') {
                  $scope.failure = 'Unable to create the server';
                  return $q.reject(data.fault);
                }
                //debugger;
                if ('node-int-net-01' in data.server.addresses) {
                  $scope.serverPrivateAddr = data.server.addresses['node-int-net-01'][0].addr;
                  return null;
                }
                $scope.failure = 'The instance is missing an internal ip';
                return $q.reject(data);
              });
          };

          return retriesWithDelay(sub, 60, 4000)
            .then(null, function(cause) { //cause.status == 0 || cause.status == 502
              $scope.failure = 'The function for checking the server state timed out';
	      return $q.reject('TimeOut');
            });
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
	        });
	  };
	  var allocateFloatingIps = function(){
	    return os.allocateFloatingIp(currentRegionConfig['external-network-id']);
	  };
	  return retriesWithDelay(getFloatingIps, max, 750)
	    .then(null, function(cause) {
	      $scope.failure = 'A problem occured when reaching the floating ip\'s endpoint; perhaps the pool is misconfigured.';
	      //return $q.reject(cause);
              throw cause;
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
	        return retries(allocateFloatingIps, max)
	          .then(
	            function(floatingIpData){
		      $scope.floatingIp = floatingIpData.floating_ip;
		      return $scope.floatingIp; // .instance_id .pool: "ext-net"
	            })
	          .catch(
	            function(cause) {
		      if ('message' in cause && cause.message === '500 Error') {
                        $scope.failure = 'Even though you got enough quota, there is an impossibility to find or create a free floating ip on the network ' + currentRegionConfig['external-network-id'];
                        cause = [cause, $scope.quotas, $scope.neutronQuotas];
		      } else if ('body' in cause && computeNoMoreIpRegex.test(cause.body)) {
                        $scope.failure = 'Even though you got enough quota, the "' + currentRegionName + '" region has no more free ip to spare. Contact the corresponding adminstrator or change region.';
                      } else {
                        $scope.failure = 'Unexpected error while allocation a floating ip.';
                      }
		      return $q.reject(cause);
	            }
	          );
	      }
	    );
        };

        var getAndSaveExternalNetwork = function() {
	        var sub = function() {
	          return os.getNetworkDetail(currentRegionConfig['external-network-id'])
	            .then(
	              function(externalNetworkData) {
		              $scope.externalNetworkData = externalNetworkData;
	              }
	            );
	        };
	  return retries(sub, 3)
            .then(null, function(cause) {
              $scope.failure = 'The network api is unreachable or the external network "' + currentRegionConfig['external-network-id'] + '" is missing.';
              return $q.reject(cause);
            });
        };

        var getAndIgnoreImageDetails = function() {
          var imageId = APP_CONFIG.coreos.imageId;
          var sub = function() {
            return os.getImageDetails(imageId);
          };

          return retriesWithDelay(sub, 4, 750)
	    .then(null, function(cause) {
	      if (typeof cause === 'object' &&
                  'message' in cause && cause.message === '404 Error') {
	        $scope.failure = 'The custom panamax image "' + APP_CONFIG.coreos.imageId + '" is missing.';
	      } else {
                $scope.failure = 'Problems with the image api';
              }
	      return $q.reject(cause);
	    }); // 404 not found
        };

        var tryToAssociateIp = function() {
	        var sub = function(counter) {
	          if (counter <= 0) {
	            $scope.failure = 'The function for associating an ip timed out';
	            return $q.reject('TimeOut');
	          }
	          return $timeout(function(){ return os.associateFloatingIp($scope.serverData.id, $scope.floatingIp.ip, $scope.serverPrivateAddr); }, 5000)
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
		                      (current.instance_id === $scope.serverData.id || current.fixed_ip === $scope.serverPrivateAddr)) {
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
	        var targetId = currentRegionConfig['shared-network-id'];
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
          var sub = function() {
            return $scope.panamax.misc.Types().query().$promise;
          };

          $scope.panamax = panamaxFactory($location.protocol() + '://' + $location.host() + '/__proxy', $scope.floatingIp.ip, 6001);
          return retriesWithDelay(sub, 60, 4000)
            .catch(
              function(cause) { //cause.status == 0 || cause.status == 502
                $scope.failure = 'The function for checking the panamax api timed out';
	        return $q.reject('TimeOut');
              });
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

        var waitForPanamaxUi = function() {
          var sub = function() {
            return $scope.panamaxUi.index().get().$promise;
          };

          $scope.panamaxUi = panamaxUiFactory($location.protocol() + '://' + $location.host() + '/__proxy', $scope.floatingIp.ip, 6002);
          return retriesWithDelay(sub, 30, 4000)
            .catch(
              function(cause) {
                $scope.failure = 'The function for checking panamax UI timed out';
		return $q.reject(cause);
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

        var checkNovaQuotas = function() {
          var sub = function() {
            return os.getQuotaList($scope.tenantData.id);
          };
          var verifyQuotas = function(quotas) {
            var cause = '';
            if (quotas.cores <= 0 || quotas.instances <= 0) {
              cause += 'The quotas of cores or instances are <= 0.';
            }
            if (quotas.ram <= 0) {
              cause += 'The quota of ram is <= 0.';
            }
            if (quotas.security_groups <= 0 || quotas.security_group_rules <= 0) {
              cause += 'The quotas of security groups or security rules are <= 0.';
            }
            if (cause) {
              $scope.failure = 'Not enough quotas';
              cause += '  (' + JSON.stringify(quotas, null, 1) +  ')';
              return $q.reject(cause);
            }
          };

          return retriesWithDelay(sub, 3, 750)
            .then(
              function(data) {
                $scope.quotas = data.quota_set;
                return $scope.quotas;
              }
            )
            .catch(
              function(cause) {
                $scope.failure = 'Cannot fetch Nova quotas';
                return $q.reject(cause);
              })
            .then(verifyQuotas);
        };


        var checkNeutronQuotas = function() {
          var limit = 1;
          var sub = function() {
            return os.getQuotaDetail($scope.tenantData.id);
          };

          var verifyQuota = function(quota) {
            if (quota.floatingip && quota.floatingip >= limit) {
              return null;
            } else {
              $scope.failure = 'Your floating ip quota is insufficient. After checking with the Neutron api, your current quota limit is : ' + quota.floatingip + '. Or the runner setup requires at least ' + limit + ' floating ips. You can ask the support for a quota revision by using the following link:<br/><a href="mailto:fiware-lab-help@lists.fi-ware.org?subject=FIC2Lab%20%2D%20' + currentRegionName + '%20Node%20%2D%20Tenant%27s%20quota%20modification%20required" class="btn btn-xs btn-success">Email the support</a>' ;

//Not enough ip quota in Neutron, your current limit is: ' + quota.floatingip;
              return $q.reject(JSON.stringify(quota, null, 1));
            }
          };

          return retriesWithDelay(sub, 3, 750)
            .then(null, function(cause) {
              $scope.failure = 'Cannot fetch Neutron quotas, perhaps the api endpoint is down';
              return $q.reject(cause);
            })
            .then(function(data) {
              $scope.neutronQuotas = data;
              return verifyQuota(data);
            });
        };

        var start = function(oauth_access_token) {
	        var sub = function() {
	          return  $q.when($rootScope.idm_hack);
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
        var phases = ((wrap('Loading tenant information', start))(oauth_creds.access_token))
	  .then(wrap('Authenticating with Keystone', os.authenticateWithKeystone))
	  .then(function(accessData){
	    $scope.tenantData = accessData.access.token.tenant; return null;})
          .then(wrap('Checking Nova quotas', checkNovaQuotas))
          .then(wrap('Checking Neutron quotas', checkNeutronQuotas))
	  .then(wrap('Verifying the external network existence', getAndSaveExternalNetwork))
          .then(wrap('Checking the image existence', getAndIgnoreImageDetails));

        if ('shared-network-id' in currentRegionConfig) {
          phases = phases.then(wrap('Fetching the network', getSharedPublicNetwork));
        } else {
          phases = phases.then(wrap('Creating the public network', getOrCreatePublicNetwork))
	    .then(wrap('Creating the public subnetwork', getOrCreatePublicSubNetwork))
	    .then(wrap('Creating the router', getOrCreateRouter))
	    .then(wrap('Attach router to subnet', bindRouterToSubnet))
        }

        phases.then(wrap('Creating the security group', getOrCreateSecurityGroup))
	  .then(wrap('Adding the security group\'s rules', addingSecurityGroupRules))
	// .then(wrap('Creating the server', bootServer))
	  .then(wrap('Creating the server', getOrBootServer))
	  .then(wrap('Finding or allocating a floating ip', getOrAllocateFloatingIp))
          .then(wrap('Waiting for the server activation', waitForServer))
	  .then(wrap('Associating the floating ip to the newly created instance', tryToAssociateIp))
	  .then(wrap('Waiting for Panamax', waitForPanamax))
	  .then(wrap('Injecting the SE repository', injectTemplatesRepo))
          .then(wrap('Waiting for the Panamax UI', waitForPanamaxUi))
	//.then(wrap('Fetching the Panamax templates', fetchPmxTemplates))
	//.then(wrap('Starting the SE\'s template', launchTemplate))
	  .then(
	    function() {
	      //debugger; // jshint ignore: line
	      $scope.success_target_url = 'http://' + $scope.floatingIp.ip + ':3000/search/new';
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
