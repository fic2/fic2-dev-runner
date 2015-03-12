angular.module('srcApp')
  .factory(
    'panamaxFactory',
    function($q, $resource) {

      var builder = function(panamaxUrl, targetIp, targetPort){
	var headers = { 'Target-Ip': targetIp, 'Target-Port': targetPort };
	var actions = { get: { method: 'GET', headers: headers },
			query: { method: 'GET', headers: headers, isArray: true },
			save: {method: 'POST', headers: headers} };

	var _findByName = function(promise, name) {
	  return promise
	    .then(
	      function(data) {
		for (var index = 0; index < data.length; index++) {
		  var current = data[index];
		  if (current.name === name) {
		    return {target: current, all: data};
		  };
		}
		return $q.reject('404 Error');
	      });	  
	};

	var misc = function() {
	  var Types = function() {
	    return $resource(panamaxUrl + '/types.json',  {}, actions);
	  };
	  
	  return {
	    Types: Types
	  };
	};	

	var apps = function() {
	  var AppsFactory = function() {
	    return $resource(panamaxUrl + '/apps.json',  {}, actions);
	  };
	  return {
	    Apps: AppsFactory
	  };
	};

	var sources = function() {
	  var SourcesFactory = function() {
	    return $resource(panamaxUrl + '/template_repos.json',  {}, actions);
	  };
	  var findByName = function(name) {
	    return _findByName(SourcesFactory().query().$promise, name);
	  };
	  return {
	    SourcesFactory: SourcesFactory,
	    findByName: findByName
	  };
	};

	var templates = function() {
	  var TemplatesFactory = function() {
	    return $resource(panamaxUrl + '/templates.json',  {}, actions);
	  };

	  var findByName = function(name) {
	    return TemplatesFactory().query().$promise
	      .then(
		function(data) {
		  for (var index = 0; index < data.length; index++) {
		    var current = data[index];
		    if (current.name === name) {
		      return {target: current, all: data};
		    };
		  }
		  return $q.reject('404 Error');
		});
	  };

	  return {
	    TemplatesFactory: TemplatesFactory,
	    findByName: findByName
	  };
	};

	return {
	  misc: misc(),
	  apps: apps(),
	  sources: sources(),
	  templates: templates()
	};
      };      

      return builder;
    })
  .factory(
    'panamaxUiFactory',
    function($q, $resource) {

      var builder = function(panamaxUiUrl, targetIp, targetPort){
	var headers = { 'Target-Ip': targetIp, 'Target-Port': targetPort };
	var actions = { get: { method: 'GET', headers: headers },
			query: { method: 'GET', headers: headers, isArray: true },
			save: {method: 'POST', headers: headers} };

	var index = function() {
          return $resource(panamaxUiUrl + '/search/new',  {}, actions);
	};

        return {
          index: index
        };
      };

      return builder;
    });

