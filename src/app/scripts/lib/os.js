/* global JSTACK */
/* jshint camelcase: false */


'use strict';


angular.module('srcApp')
  .factory(
    'os',
    function($q, $resource, AccessToken, Endpoint, APP_CONFIG) {
      var oauth_creds = AccessToken.get();

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
	for (e in compute.endpoints) {
	  compute.endpoints[e].adminURL = host + '/' + compute.endpoints[e].region + '/compute' + compute.endpoints[e].adminURL.replace(/.*:[0-9]*/, '');
	  compute.endpoints[e].publicURL = host + '/' + compute.endpoints[e].region + '/compute' + compute.endpoints[e].publicURL.replace(/.*:[0-9]*/, '');
	  compute.endpoints[e].internalURL = host + '/' + compute.endpoints[e].region + '/compute' + compute.endpoints[e].internalURL.replace(/.*:[0-9]*/, '');
	  
	  regions.push(compute.endpoints[e].region);
	}

	var volume = JSTACK.Keystone.getservice('volume');
	if (volume !== undefined) {
	  for (e in volume.endpoints) {
	    volume.endpoints[e].adminURL = host + '/' + volume.endpoints[e].region + '/volume' + volume.endpoints[e].adminURL.replace(/.*:[0-9]*/, '');
	    volume.endpoints[e].publicURL = host + '/' + volume.endpoints[e].region + '/volume' + volume.endpoints[e].publicURL.replace(/.*:[0-9]*/, '');
	    volume.endpoints[e].internalURL = host + '/' + volume.endpoints[e].region + '/volume' + volume.endpoints[e].internalURL.replace(/.*:[0-9]*/, '');
	  }
	}
	
	var image = JSTACK.Keystone.getservice('image');
	for (e in image.endpoints) {
	  image.endpoints[e].adminURL = host + '/' + image.endpoints[e].region + '/image' + image.endpoints[e].adminURL.replace(/.*:[0-9]*/, '');
	  image.endpoints[e].publicURL = host + '/' + image.endpoints[e].region + '/image' + image.endpoints[e].publicURL.replace(/.*:[0-9]*/, '');
	  image.endpoints[e].internalURL = host + '/' + image.endpoints[e].region + '/image' + image.endpoints[e].internalURL.replace(/.*:[0-9]*/, '');
	}

	var objectstorage = JSTACK.Keystone.getservice('object-store');
	if (objectstorage !== undefined) {
	  for (e in objectstorage.endpoints) {
	    objectstorage.endpoints[e].adminURL = host + '/' + objectstorage.endpoints[e].region  + '/object-store' + objectstorage.endpoints[e].adminURL.replace(/.*:[0-9]*/, '');
	    objectstorage.endpoints[e].publicURL = host + '/' + objectstorage.endpoints[e].region  + '/object-store' + objectstorage.endpoints[e].publicURL.replace(/.*:[0-9]*/, '');
	    objectstorage.endpoints[e].internalURL = host + '/' + objectstorage.endpoints[e].region  + '/object-store' + objectstorage.endpoints[e].internalURL.replace(/.*:[0-9]*/, '');
	  }
	}

	var neutron = JSTACK.Keystone.getservice('network');
	if (neutron !== undefined) {
	  for (e in neutron.endpoints) {
	    neutron.endpoints[e].adminURL = host + '/' + neutron.endpoints[e].region + '/network' + neutron.endpoints[e].adminURL.replace(/.*:[0-9]*/, '');
	    neutron.endpoints[e].publicURL = host + '/' + neutron.endpoints[e].region + '/network' + neutron.endpoints[e].publicURL.replace(/.*:[0-9]*/, '');
	    neutron.endpoints[e].internalURL = host + '/' + neutron.endpoints[e].region + '/network' + neutron.endpoints[e].internalURL.replace(/.*:[0-9]*/, '');
	  }
	}
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
	      console.error('Cannot retrieve tenant: ' + cause);
	      return $q.reject(cause);
	    });
      };

      var authenticateWithKeystone = function(tenant_data){
	var deferred = $q.defer();
	JSTACK.Keystone.init(APP_CONFIG['keystone-uri'] + '/v2.0/');
	JSTACK.Keystone.authenticate(null, null, oauth_creds.access_token, tenant_data.id, deferred.resolve, deferred.reject);
	return deferred.promise
	  .then(function(accessData){changeEndpoints(APP_CONFIG['cloud-uri']); return accessData;})
	  .catch(
	    function(cause){
	      debugger;
	      console.log('Cannot authenticate with Keystone');
	      return $q.reject(cause);
	    });
      };

      var fetchNovaServers = function(){
	var deferred = $q.defer();
	JSTACK.Nova.getserverlist(true, false, deferred.resolve, deferred.reject, 'Lannion');
	return deferred.promise
	  .then(function(servers_data){console.log(servers_data);});
      };

      var getImageDetails = function(imageId){
	var sub = function(counter, imageId){
	  var deferred = $q.defer();
	  JSTACK.Nova.getimagedetail(imageId, deferred.resolve, deferred.reject, 'Lannion');
	  return deferred.promise
	    .catch(
	      function(cause){
		if ('message' in cause && cause.message == "503 Error"
		    && counter < 3) {
		  console.warn('getimagedetail unavailable, retrying: counter=' + counter);
		  return _sub(counter + 1, imageId); 
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
	JSTACK.Neutron.getnetworkslist(deferred.resolve, deferred.reject, 'Lannion');
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
	    if (name == elems[index].name) {
	      return elems[index];
	    }
	  }
	  console.log('getByNameFactory not found: name=' + name);
	  return $q.reject("Not found");
	};
      };

      var createNetwork = function(name, tenantId){
	var deferred = $q.defer();
	JSTACK.Neutron.createnetwork(name, true, false, tenantId, deferred.resolve, deferred.reject, 'Lannion');
	return deferred.promise;
      };

      var getSubNetworksList = function(){
	var deferred = $q.defer();
	JSTACK.Neutron.getsubnetslist(deferred.resolve, deferred.reject, 'Lannion');
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
				     tenantId, base + '.1', 4, true, ["8.8.8.8"],
				      null, deferred.resolve,
				      deferred.reject, 'Lannion');
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
	JSTACK.Neutron.createrouter(name, true, externalNetworkId, tenantId, deferred.resolve, deferred.reject, 'Lannion');
	return deferred.promise;
      };

      var getRoutersList = function(){
	var deferred = $q.defer();
	JSTACK.Neutron.getrouterslist(deferred.resolve, deferred.reject, 'Lannion');
	return deferred.promise;
      };


      return {
	createName: createName,
	loadTenant: loadTenant,
	authenticateWithKeystone: authenticateWithKeystone,
	fetchNovaServers: fetchNovaServers,
	getImageDetails: getImageDetails,
	getNetworksList: getNetworksList,
	//getNetworkByName: getNetworkByName,
	getByNameFactory: getByNameFactory,
	createNetwork: createNetwork,
	getSubNetworksList: getSubNetworksList,
	createSubNetwork: createSubNetwork,
	getRoutersList: getRoutersList,
	createRouter: createRouter
      };
    }
  );