
'use strict';


angular.module('srcApp').directive('regionFormSelection', ['regionSetupFactory', function (regionSetupFactory) {
  return {
    templateUrl: 'scripts/directives/regionFormSelection.html',
    restrict: 'E',
    transclude: true,
    scope: {
      disabledOn: '='
    },
    controller: function($scope) {
      $scope.regionSetupFactory = regionSetupFactory;
    }
  };
}]);
