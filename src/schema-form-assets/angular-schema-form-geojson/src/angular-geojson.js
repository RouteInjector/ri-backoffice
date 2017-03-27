(function () {
    angular.module('schemaForm')
        .directive('lfMap', ['$http', '$routeParams', 'models', 'leafletData', '$window', '$sce', function ($http, $routeParams, models, leafletData, $window, $sce) {
            return {
                restrict: 'AE',
                require: 'ngModel',
                priority: 1,
                controller: ['$scope', function ($scope) {
                    $scope.center = {
                        lat: 41.2757772,
                        lng: 1.9888791,
                        zoom: 8
                    };
                }],
                link: function (scope, element, attrs, ngModel) {
                    if (ngModel) {
                        ngModel.$render = function () {
                            if (!ngModel.$viewValue) {
                                return;
                            }

                            scope.center = {
                                lat: ngModel.$viewValue.coordinates[1],
                                lng: ngModel.$viewValue.coordinates[0],
                                zoom: 15
                            };
                            scope.markers = {
                                mainMarker: {
                                    lat: ngModel.$viewValue.coordinates[1],
                                    lng: ngModel.$viewValue.coordinates[0],
                                    focus: true
                                }
                            };
                        }
                    }
                    $window.dispatchEvent(new Event('resize'));
                }
            }
        }
        ]);
})();