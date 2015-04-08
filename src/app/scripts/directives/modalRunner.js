
'use strict';


angular.module('srcApp').directive('modalRunner', ['$location', function ($location) {
  return {
    templateUrl: 'scripts/directives/modalRunner.html',
    restrict: 'E',
    transclude: true,
    scope: {
      success: '@',
      success_target_url: '@successTargetUrl',
      cause: '@',
      failure: '@'
    },
    controller: function($scope) {
      $scope.close_modal = function() {
        angular.element('.modal-backdrop').hide();
        angular.element('.modal-backdrop').remove();
        angular.element('body').removeClass('modal-open');
      };
    },
    link: function (scope, element, attrs, ctrls, transcludeFn) {

      transcludeFn(scope.$parent, function(clone, scope) {
        // element.append(clone);
      });
    }
  };
}]);
