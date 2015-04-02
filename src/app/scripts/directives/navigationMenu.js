
'use strict';


angular.module('srcApp').directive('navigationMenu', ['$location', function ($location) {
  return {
    templateUrl: 'scripts/directives/navigationMenu.html',
    restrict: 'E',
    scope: {
      active: "@"
    },
    link: function (scope, element, attrs) {
      scope.nav_is_active = function(href) {
        return $location.path() === href ? 'active' : '';
      };
    }
  };
}]);
