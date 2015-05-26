/* global JSTACK, sjcl */
/* jshint camelcase: false */


'use strict';


angular.module('srcApp')
  .factory(
    'os',
    function($q, $http, $resource, AccessToken, Endpoint, APP_CONFIG, regionSetupFactory) {
      var oauth_creds = AccessToken.get();
      var getRegion = function() {
        return regionSetupFactory.getCurrentRegion();
      };

      if (! (!!oauth_creds)) {
        return Endpoint.redirect();
      } else {
        var key = sjcl.codec.utf8String.toBits(oauth_creds.client_id);
        var hasher = new sjcl.misc.hmac(key, sjcl.hash.sha256);
      }
      
      // Returns a random integer between min (included) and max (excluded)
      // Using Math.round() will give you a non-uniform distribution!
      function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
      }

      var hash = function(s) {
        return sjcl.codec.hex.fromBits(hasher.mac(s));
      };

      var createName = function(name){
        var base = 'dhub__' + name + '__';
        return (base + hash(base));
      };

      function changeEndpoints (host) {
        var regions = [];
        var e;

        var compute = JSTACK.Keystone.getservice('compute');
        var tmp = compute.endpoints;
        for (e in tmp) {
          if (tmp[e].interface === 'public') {
            tmp[e].url = host + '/' + tmp[e].region + '/compute' + tmp[e].url.replace(/.*:[0-9]*/, '');
            compute.endpoints = [tmp[e]];
            regions.push(compute.endpoints[e].region);
            break;
          }
        }

        var volume = JSTACK.Keystone.getservice('volume');
        tmp = volume.endpoints;
        if (volume !== undefined) {
          for (e in tmp) {
            if (tmp[e].interface === 'public') {
              tmp[e].url = host + '/' + tmp[e].region + '/volume' + tmp[e].url.replace(/.*:[0-9]*/, '');
              volume.endpoints = [tmp[e]];
              break;
            }
          }
        }

        var image = JSTACK.Keystone.getservice('image');
        tmp = image.endpoints;
        for (e in tmp) {
            if (tmp[e].interface === 'public') {
              tmp[e].url = host + '/' + tmp[e].region + '/image' + tmp[e].url.replace(/.*:[0-9]*/, '');
              image.endpoints = [tmp[e]];
              break;
            }
        }

        var objectstorage = JSTACK.Keystone.getservice('object-store');
        tmp = objectstorage.endpoints;
        if (objectstorage !== undefined) {
          for (e in tmp) {
            if (tmp[e].interface === 'public') {
              tmp[e].url = host + '/' + tmp[e].region + '/object-store' + tmp[e].url.replace(/.*:[0-9]*/, '');
              objectstorage.endpoints = [tmp[e]];
              break;
            }
          }
        }

        var neutron = JSTACK.Keystone.getservice('network');
        tmp = neutron.endpoints;
        if (neutron !== undefined) {
          for (e in tmp) {
            if (tmp[e].interface === 'public') {
              tmp[e].url = host + '/' + tmp[e].region + '/network' + tmp[e].url.replace(/.*:[0-9]*/, '');
              neutron.endpoints = [tmp[e]];
              break;
            }
          }
        }
/*
.adminURL
.publicURL
.internalURL
*/
      }

      var loadTenant = function(oauth_access_token) {
        var Tenants = $resource(APP_CONFIG['keystone-uri'] + '/v2.0/tenants', {}, { get: {method: 'GET', headers: { 'X-Auth-Token': oauth_access_token }}});
        return Tenants.get().$promise
          .then(
            function(data) {
              var tenant = data.toJSON().tenants[0];
              return tenant;
            })
          .catch(
            function(cause){
              var msg = 'Cannot retrieve tenant: ' + JSON.stringify(cause);
              return $q.reject(msg);
            });
      };


      var loadTenantV3 = function(oauth_access_token) {
        var l = {
          "88fc63031f43a345b4da98f499885be87224dced000ae8808da8eca709e15522": "77cf9afaed9d4a72875f4d61227b8025",
          "e62c4d06486ca448ea0ffedbda0968ae04bfe7524930fa274a311b28f91df4d0": "00000000000000000000000000000084"
        };
        // var Tenants = $resource('https://cloud.lab.fiware.org/keystone/v3/authorized_organizations/' + oauth_access_token, {}, {});
        //var Tenants = $resource(APP_CONFIG['site'] + '/user', {}, { get: {method: 'GET', params: { 'access_token': oauth_access_token }, headers: {'Access-Control-Allow-Origin' : '*'}}});
        //var Tenants = $resource('https://cloud.lab.fiware.org/keystone/v3/auth/tokens', {}, { save: {method: 'POST', headers: {'Access-Control-Expose-Headers' : 'x-subject-token'}}});
        var Tenants = $resource('https://cloud.lab.fiware.org/keystone/v3/auth/tokens', {}, {});

        var payload =
          {"auth":{"identity":{"methods":["oauth2"],"oauth2":{"access_token_id":oauth_access_token}},"scope":{"project":{"name": "mario-lopez-ramos cloud", "domain": {"id": "default"}}}}};
        var deferred = $q.defer();
        JSTACK.Comm.post('https://cloud.lab.fiware.org/keystone/v3/auth/tokens', payload, undefined,
                        function(data, headers, extra) {
                          debugger; // jshint ignore: line
                          var t = extra;
                          debugger; // jshint ignore: line
                          return deferred.resolve({"id": t});
                        },
                        function(data) {
                          return deferred.reject(data);
                        });

        // var req = {
        //   method: 'POST',
        //   url: 'https://cloud.lab.fiware.org/keystone/v3/auth/tokens',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'Access-Control-Expose-Headers': 'X-Auth-Token, Tenant-ID'
        //   },
        //   data: payload
        // };
        // $http(req)
        //   .success(function(data, status, headers, config) {
        //     debugger; // jshint ignore: line
        //     var t = headers('x-subject-token');
        //     debugger; // jshint ignore: line
        //     return deferred.resolve({"id": t});
        //   })
        //   .error(function(data, status, headers, config) {
        //     // called asynchronously if an error occurs
        //     // or server returns response with an error status.
        //     return deferred.reject(data);
        //   });


        // Tenants.save(null, payload, function(data, headers) {
        //   var t = headers('x-subject-token');
        //   debugger; // jshint ignore: line
        //   var hashed_sha256 = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(data.id));
        //   if (hashed_sha256 in l) {
        //     return deferred.resolve({"id": l[hashed_sha256]});
        //   } else {
        //     var msg = 'Your id ' + data.id + ' (' + hashed_sha256 + ') is not registered in the idm hack';
        //     return deferred.reject(msg);
        //   }
        // }, deferred.reject);

        return deferred.promise;
        // return Tenants.save(payload).$promise
        //   .then(
        //     function(data, headers) {
        //       debugger; // jshint ignore: line
        //       var hashed_sha256 = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(data.id));
        //       if (hashed_sha256 in l) {
        //         return {"id": l[hashed_sha256]};
        //       } else {
        //         var msg = 'Your id ' + data.id + ' (' + hashed_sha256 + ') is not registered in the idm hack';
        //         return $q.reject(msg);
        //       }
        //     })
        //   .catch(
        //     function(cause) {
        //       var msg = 'Cannot retrieve tenant: ' + JSON.stringify(cause);
        //       return $q.reject(msg);
        //     });
      };

      var getAauthenticateResult = function(X_Auth_Token, tenantId, tenantName, userId, userName, expiresAt, issuedAt) {
        return {"token": {"methods": ["token", "oauth2"], "roles": [{"id": "9eb0158e4c0b48d4a06c6144ab08a25d", "name": "owner"}], "expires_at": expiresAt, "project": {"domain": {"id": "default", "name": "Default"}, "id": tenantId, "name": tenantName}, "catalog": [{"endpoints": [{"url": "http://api2.xifi.imaginlab.fr:9696/", "region": "Lannion2", "interface": "public", "id": "0fb78716d29e4391b2ec65ba9e256662"},{"url": "http://api2.xifi.imaginlab.fr:9696/", "region": "Lannion2", "interface": "admin", "id": "fe002ccccfbe4f45b083f004b0095dd1"}], "type": "network", "id": "1e58c6763eaf4ea581712b22f319c365"}, {"endpoints": [{"url": "http://api2.xifi.imaginlab.fr:8080/v1", "region": "Lannion2", "interface": "admin", "id": "c6fa65172d08464a9bf524aa3ff9e83f"}, {"url": "http://api2.xifi.imaginlab.fr:8080/v1/AUTH_" + tenantId, "region": "Lannion2", "interface": "public", "id": "bc32c74f559e40959d1bc37c0eae1489"}], "type": "object-store", "id": "9b0870fc187c476a90d645e9d264febc"}, {"endpoints": [{"url": "http://api2.xifi.imaginlab.fr:9292/v1", "region": "Lannion2", "interface": "admin", "id": "da451cc47b554952b2989e8c6768c968"}, {"url": "http://api2.xifi.imaginlab.fr:9292/v1", "region": "Lannion2", "interface": "public", "id": "ccba4bcf1003422b89a0359c2ab3616a"}], "type": "image", "id": "25511e24ca7d41e1ae211873f7ac4521"}, {"endpoints": [{"url": "http://api2.xifi.imaginlab.fr:8774/v2/" + tenantId, "region": "Lannion2", "interface": "public", "id": "4029fb0913ba467d8c76d13bd2ea9b57"}, {"url": "http://api2.xifi.imaginlab.fr:8774/v2/" + tenantId, "region": "Lannion2", "interface": "admin", "id": "6337ba2812584c18b3bc5c3bee706ddd"}], "type": "compute", "id": "0454e2304b0e4a0489d945092d95ea4a"}, {"endpoints": [{"url": "http://api2.xifi.imaginlab.fr:8776/v1/" + tenantId, "region": "Lannion2", "interface": "admin", "id": "a8740c649bae403a85d02a705c7b2e05"}, {"url": "http://api2.xifi.imaginlab.fr:8776/v1/" + tenantId, "region": "Lannion2", "interface": "public", "id": "ef7e7f097e0e41dd85e5d8dc8ca15969"}], "type": "volume", "id": "dcc80506d0014f4b8372f090c6baa6d9"}], "extras": {}, "user": {"domain": {"id": "default", "name": "Default"}, "id": userId, "name": userName}, "audit_ids": ["D2qKYCf7Qr2FIPEQW-4xWQ", "qP0i2CPKQtmHo_IO0y9JpA"], "issued_at": issuedAt, "id": X_Auth_Token, "expires": expiresAt, "tenant": {"id": tenantId, "name": tenantName}}};
      };


      var authenticateWithKeystone = function(idm_hack){
        JSTACK.Keystone.init(APP_CONFIG['keystone-uri'] + '/v3/');
        var sub = function(counter) {
          var deferred = $q.defer();
          //debugger;
          var base = getAauthenticateResult(
            idm_hack.X_Auth_Token, idm_hack.tenantId,
            idm_hack.userId, idm_hack.userName,
            idm_hack.tenantName, idm_hack.expiresAt,
            idm_hack.issuedAt);
          var result = {
            access:{
              token: base.token,
              serviceCatalog: base.token.catalog,
              user: {id: idm_hack.userId, name: idm_hack.userName}
            }
          };
          JSTACK.Keystone.params.currentstate = JSTACK.Keystone.STATES.AUTHENTICATED;
          JSTACK.Keystone.params.access = result.access;
          JSTACK.Keystone.params.token = idm_hack.X_Auth_Token;

          J//STACK.Keystone.authenticate(null, null, {token: idm_hack.X_Auth_Token}, idm_hack.tenantId, deferred.resolve, deferred.reject);
          //return deferred.promise
          return $q.when(result)
            .then(function(accessData){changeEndpoints(APP_CONFIG['cloud-uri']); return accessData;})
            .then(function(accessData) {
              JSTACK.Keystone.params.token = idm_hack.X_Auth_Token;
              return accessData;
            })
            .catch(
              function(cause){
                //debugger; // jshint ignore: line
                console.log('Cannot authenticate with Keystone counter=' + counter + ' : ' + cause);
                if ('message' in cause && cause.message === '503 Error' && counter < 4) {
                  return sub(counter + 1);
                }
                return $q.reject(cause);
              });         
        };
        return sub(0);
      };

      var fetchNovaServers = function(){
        var deferred = $q.defer();
        JSTACK.Nova.getserverlist(true, false, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise
          .then(function(servers_data){console.log(servers_data); return servers_data;});
      };

      var getImageDetails = function(imageId){
        var sub = function(counter, imageId){
          var deferred = $q.defer();
          JSTACK.Nova.getimagedetail(imageId, deferred.resolve, deferred.reject, getRegion());
          return deferred.promise
            .catch(
              function(cause){
                if ('message' in cause && cause.message === '503 Error' && counter < 3) {
                  console.warn('getimagedetail unavailable, retrying: counter=' + counter + '; ' + cause);
                  return sub(counter + 1, imageId); 
                }
                console.warn('getimagedetail error !');
                return $q.reject(cause);
              }
            );
        };
        return sub(0, imageId);
      };

      var getNetworksList = function(){
        var deferred = $q.defer();
        JSTACK.Neutron.getnetworkslist(deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var getNetworkDetail = function(networkId) {
        var deferred = $q.defer();
        JSTACK.Neutron.getnetworkdetail(networkId, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      /*
        var getNetworkByName = function(name){
        return getNetworksList()
        .then(
        function(networks) {
        for(var index=0; index < networks.length; index++){
        if (name == networks[index].name) {
        return networks[index];
        }
        }
        return $q.reject("Not found");
        }
        );
        };
      */

      var getByNameFactory = function(name){
        return function(elems){
          for(var index=0; index < elems.length; index++){
            if (name === elems[index].name) {
              return elems[index];
            }
          }
          console.log('getByNameFactory not found: name=' + name);
          return $q.reject('Not found');
        };
      };

      var createNetwork = function(name, tenantId){
        var deferred = $q.defer();
        JSTACK.Neutron.createnetwork(name, true, false, tenantId, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var getSubNetworksList = function(){
        var deferred = $q.defer();
        JSTACK.Neutron.getsubnetslist(deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var createSubNetwork = function(networkId, name, tenantId){
        var sub = function(counter){
          var base = getRandomInt(1, 251) + '.' + 
            getRandomInt(1, 251) + '.' + 
            getRandomInt(1, 251);
          var cidr = base + '.0/24';
          var allocPools = [{'start': base + '.100', 'end': base + '.200'}];
          var deferred = $q.defer();
          JSTACK.Neutron.createsubnet(networkId, cidr, name, allocPools,
                                      tenantId, base + '.1', 4, true, ['8.8.8.8'],
                                      null, deferred.resolve,
                                      deferred.reject, getRegion());
          return deferred.promise
            .catch(
              function(cause){
                console.warn('createSubNetwork error: ' + cause);
                if (counter < 4) {
                  console.warn('createSubNetwork retrying ... counter=' +
                               counter);
                  return sub(counter + 1);
                }
                console.error('createSubNetwork ');
                return $q.reject(cause);
              });         
        };
        
        return sub(0);
      };

      var createRouter = function(name, externalNetworkId, tenantId){
        var deferred = $q.defer();
        JSTACK.Neutron.createrouter(name, true, externalNetworkId, tenantId, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var getRoutersList = function(){
        var deferred = $q.defer();
        JSTACK.Neutron.getrouterslist(deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var getSecurityGroupList = function(){
        var deferred = $q.defer();
        JSTACK.Nova.getsecuritygrouplist(deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;        
      };

      var createSecurityGroup = function(name){
        var deferred = $q.defer();
        JSTACK.Nova.createsecuritygroup(name, 'Created by the DHub application', deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;        
      };
      
      var getSecurityGroupDetail = function(securityGroupId){
        var deferred = $q.defer();
        JSTACK.Nova.getsecuritygroupdetail(securityGroupId, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;        
      };

      var createSecurityGroupRule = function(ipProtocol, fromPort, toPort, cidr, groupId){
        var deferred = $q.defer();
        JSTACK.Nova.createsecuritygrouprule(ipProtocol, fromPort, toPort, cidr, null, groupId, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;        
      };

      var createServer = function(name, imageId, userData, securityGroupId, networkId){
        var deferred = $q.defer();
        var flavorId = '3';
        JSTACK.Nova.createserver(name, imageId, flavorId, null, userData, [securityGroupId], 1, 1, null, [{'uuid': networkId}], '', null, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };
      
      var addInterfaceToRouter = function(routerId, subnetId){
        var deferred = $q.defer();
        var undf;
        JSTACK.Neutron.addinterfacetorouter(routerId, subnetId, undf, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var getFloatingIps = function(){
        var deferred = $q.defer();
        JSTACK.Nova.getfloatingIPs(deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var allocateFloatingIp = function(pool){
        var deferred = $q.defer();
        JSTACK.Nova.allocatefloatingIP(pool, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var associateFloatingIp = function(serverId, address, fixedAddr){
        var deferred = $q.defer();
        JSTACK.Nova.associatefloatingIP(serverId, address, fixedAddr, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var getServerDetail = function(serverId) {
        var deferred = $q.defer();
        JSTACK.Nova.getserverdetail(serverId, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;        
      };


      var getQuotaList = function(tenantId){
        var deferred = $q.defer();
        JSTACK.Nova.getquotalist(tenantId, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var deleteServer = function(serverId) {
        var deferred = $q.defer();
        JSTACK.Nova.deleteserver(serverId, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var releaseFloatingIp = function(floatingIpId) {
        var deferred = $q.defer();
        JSTACK.Nova.releasefloatingIP(floatingIpId, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var deleteSecurityGroup = function(secGroupId) {
        var deferred = $q.defer();
        JSTACK.Nova.deletesecuritygroup(secGroupId, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var getQuotaDetail = function(tenantId) {
        var deferred = $q.defer();
        JSTACK.Neutron.getquotadetail(tenantId, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var deleteRouter = function(routerId) {
        var deferred = $q.defer();
        JSTACK.Neutron.deleterouter(routerId, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var deleteSubNetwork = function(subNetworkId) {
        var deferred = $q.defer();
        JSTACK.Neutron.deletesubnet(subNetworkId, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };

      var deleteNetwork = function(networkId) {
        var deferred = $q.defer();
        JSTACK.Neutron.deletenetwork(networkId, deferred.resolve, deferred.reject, getRegion());
        return deferred.promise;
      };


      return {
        createName: createName,
        loadTenant: loadTenant,
        loadTenantV3: loadTenantV3,
        authenticateWithKeystone: authenticateWithKeystone,
        fetchNovaServers: fetchNovaServers,
        getImageDetails: getImageDetails,
        getNetworksList: getNetworksList,
        //getNetworkByName: getNetworkByName,
        getNetworkDetail: getNetworkDetail,
        getByNameFactory: getByNameFactory,
        createNetwork: createNetwork,
        getSubNetworksList: getSubNetworksList,
        createSubNetwork: createSubNetwork,
        getRoutersList: getRoutersList,
        createRouter: createRouter,
        getSecurityGroupList: getSecurityGroupList,
        createSecurityGroup: createSecurityGroup,
        getSecurityGroupDetail: getSecurityGroupDetail,
        createSecurityGroupRule: createSecurityGroupRule,
        createServer: createServer,
        addInterfaceToRouter: addInterfaceToRouter,
        getFloatingIps: getFloatingIps,
        allocateFloatingIp: allocateFloatingIp,
        associateFloatingIp: associateFloatingIp,
        getServerDetail: getServerDetail,
        getQuotaList: getQuotaList,
        deleteServer: deleteServer,
        releaseFloatingIp: releaseFloatingIp,
        deleteSecurityGroup: deleteSecurityGroup,
        getQuotaDetail: getQuotaDetail,
        deleteRouter: deleteRouter,
        deleteSubNetwork: deleteSubNetwork,
        deleteNetwork: deleteNetwork
      };
    }
  );
