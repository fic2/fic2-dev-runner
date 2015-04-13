/* global JSTACK, sjcl */
/* jshint camelcase: false */


'use strict';


angular.module('srcApp')
  .factory(
    'hlos',
    ['$q', '$timeout', 'os', function($q, $timeout, os) {

      var retriesWithDelay = function(promise, max, delay) {
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

      var normalRetries = function(p) { return retriesWithDelay(p, 3, 750); };

      var removeResourceIfItExistsBuilder = function(type, getResources, unboxResources, findResource, deleteResource) {

        var fetchResources = function() {
          return normalRetries(getResources)
            .then(null, function(cause) {
              $scope.failure = 'Unable to retrieve the resources of type "' + type +  '", perhaps the endpoint is down';
              return $q.reject(cause);
            });
        };

        var removeResource = function(resourceData) {
          return deleteResource(resourceData.id)
            .then(null, function(cause) {
              $scope.failure = 'Unable to remove the resource ' + resourceData.id + ' of type "' + type + '"';
              return $q.reject([cause, resourceData]);
            });
        };

        var fetchAndRemoveResource = function(resourceName) {
          return function() {
            return fetchResources()
              .then(function(data){return unboxResources(data);})
              .then(function(resources) {
                return $q.when(resources)
                  .then(findResource(resourceName))
                  .then(removeResource, function(cause) {
                    console.log('The resource "' + resourceName + '" of type "' + type + '" was not found, there is no need for deletion');
                    return null;
                  });
              });
          };
        };

        return function(resourceName) {
          return normalRetries(fetchAndRemoveResource(resourceName));
        };
      };

      return {
        removeNetwork: removeResourceIfItExistsBuilder(
          'Neutron/Network',
          os.getNetworksList, function(data){return data;},
          os.getByNameFactory, os.deleteNetwork),
        removeSubNetwork: removeResourceIfItExistsBuilder(
          'Neutron/SubNetwork',
          os.getSubNetworksList, function(data){return data.subnets;},
          os.getByNameFactory, os.deleteSubNetwork),
        removeRouter: removeResourceIfItExistsBuilder(
          'Neutron/Router',
          os.getRoutersList, function(data){return data.routers;},
          os.getByNameFactory, os.deleteRouter),
        removeSecurityGroup: removeSecurityGroup(
          'Neutron/SecurityGroup',
          os.getSecurityGroupList, function(securityGroupsData){return securityGroupsData.security_groups;},
          os.getByNameFactory, os.deleteSecurityGroup)
      };

    }]
  );
