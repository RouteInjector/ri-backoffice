angular.module("schemaForm").run(["$templateCache", function($templateCache) {$templateCache.put("directives/decorators/bootstrap/geojson/geojson.html","<link rel=\"stylesheet\" href=\"css/leaflet/dist/leaflet.css\"/>\r\n<div class=\"form-group\" ng-class=\"{\'has-error\': hasError()}\">\r\n    <label class=\"control-label\" ng-show=\"showTitle()\">{{form.title}}</label>\r\n    <leaflet id=\"map\" lf-map ng-model=\"$$value$$\" width=\"100%\" lf-center=\"center || {}\" markers=\"markers\" height=\"480px\"></leaflet>\r\n    <!--<leaflet id=\"map\" width=\"100%\" height=\"480px\"></leaflet>-->\r\n    <span class=\"help-block\">{{ (hasError() && errorMessage(schemaError())) || form.description}}</span>\r\n</div>\r\n");}]);
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
(function () {
    angular.module('schemaForm').config(
        ['schemaFormProvider', 'schemaFormDecoratorsProvider', 'sfPathProvider',
            function (schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
                var geojson = function (name, schema, options) {
                    if (schema.type == 'geojson') {
                        var f = schemaFormProvider.stdFormObj(name, schema, options);
                        f.key = options.path;
                        f.type = 'geojson';
                        options.lookup[sfPathProvider.stringify(options.path)] = f;
                        return f;
                    }
                };

                if (!schemaFormProvider.defaults.geojson)
                    schemaFormProvider.defaults.geojson = [];

                schemaFormProvider.defaults.geojson.unshift(geojson);

                //Add to the bootstrap directive
                schemaFormDecoratorsProvider.addMapping(
                    'bootstrapDecorator',
                    'geojson',
                    'directives/decorators/bootstrap/geojson/geojson.html'
                );
                schemaFormDecoratorsProvider.createDirective(
                    'geojson',
                    'directives/decorators/bootstrap/geojson/geojson.html'
                );
            }
        ]);
})();