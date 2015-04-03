
'use strict';


angular.module('srcApp').directive('modalRunner', ['$location', function ($location) {
  return {
    templateUrl: 'scripts/directives/modalRunner.html',
    restrict: 'E',
    transclude: true,
    scope: true,
    link: function (scope, element, attrs, ctrls, transcludeFn) {
      debugger;

      transcludeFn(scope.$parent, function(clone, scope) {
        debugger;
        // element.append(clone);
      });
    }
  };
}]);
