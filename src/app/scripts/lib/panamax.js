angular.module('srcApp')
  .factory(
    'panamaxFactory',
    function($q, $resource) {
      
      var misc = function(panamaxUrl, targetIp, targetPort) {
	var headers = { 'Target-Ip': targetIp, 'Target-Port': targetPort };
	var Types = function() {
	  return $resource(panamaxUrl + '/types.json',  {}, { get: { method: 'GET', headers: headers },
							      query: { method: 'GET', headers: headers, isArray: true } } );
	};
	
	return {
	  Types: Types
	};
      };
      
      var apps = function(panamaxUrl, targetIp, targetPort) {
	return {
	};
      };

      return function(panamaxUrl, targetIp, targetPort) {
	return {
	  misc: misc(panamaxUrl, targetIp, targetPort),
	  apps: apps(panamaxUrl, targetIp, targetPort)
	};
      };
    });