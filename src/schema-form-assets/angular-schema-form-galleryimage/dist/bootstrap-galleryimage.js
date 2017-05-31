angular.module("schemaForm").run(["$templateCache", function($templateCache) {$templateCache.put("directives/decorators/bootstrap/galleryimage/galleryimage.html","<!--<link rel=\"stylesheet\" href=\"//cdnjs.cloudflare.com/ajax/libs/jasny-bootstrap/3.1.3/css/jasny-bootstrap.min.css\">-->\r\n<div class=\"form-group {{form.htmlClass}}\" ng-class=\"{\'has-error\': hasError()}\">\r\n    <label class=\"control-label\" ng-show=\"showTitle()\">{{form.title}}</label>\r\n\r\n    <div class=\"input-group\">\r\n        <a ri-single-gallery-view ng-click=\"openGallery()\" ng-model=\"$$value$$\" alt=\"Click to open Gallery\">\r\n            <img ng-src=\"{{image}}\" error=\"{{defaultErrorImage}}\" class=\"img-thumbnail\" width=\"200\" height=\"150\">\r\n        </a>\r\n        <p>{{$$value$$}}</p>\r\n        <div>\r\n            <a ng-if=\"imageExists\" download=\"{{$$value$$}}\" ng-href=\"{{image}}\" target=\"_self\"\r\n               class=\"btn btn-default\"><span class=\"glyphicon glyphicon-cloud-download\"></span></a>\r\n            <!-- download -->\r\n            <a ng-if=\"imageExists\" ng-click=\"delete()\" class=\"btn btn-default\"><span\r\n                    class=\"glyphicon glyphicon-trash\"></span></a> <!-- delete from server -->\r\n        </div>\r\n    </div>\r\n    <span class=\"help-block\">{{ (hasError() && errorMessage(schemaError())) || form.description}}</span>\r\n</div>\r\n<script type=\"text/ng-template\" id=\"galleryImage.html\">\r\n\r\n    <div class=\"modal-header\">\r\n        <h3 class=\"modal-title\">Gallery</h3>\r\n    </div>\r\n    <div class=\"modal-body\">\r\n        <tinyvision ng-model=\"ngModel\"></tinyvision>\r\n    </div>\r\n    <div class=\"modal-footer\">\r\n        <button class=\"btn btn-default\" ng-click=\"cancel()\">Cancel</button>\r\n        <button class=\"btn btn-default\" ng-click=\"select()\">Select</button>\r\n    </div>\r\n    <style>\r\n        .modal-body #tinyvision .tv-toolbar {\r\n            position: absolute;\r\n        }\r\n\r\n        .modal-body #tinyvision .tv-items {\r\n            margin: 50px 0 0 0;\r\n            width: 100%;\r\n        }\r\n    </style>\r\n</script>\r\n");}]);
angular.module('schemaForm')
    .directive('riSingleGalleryView', function ($routeParams, models, $modal) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attrs, ngModel) {
                var defaultImage = 'images/open_gallery.png';
                scope.defaultErrorImage = 'images/image_not_found.png';

                ngModel.$render = function (image) {
                    if (image) {
                        ngModel.$setViewValue(image);
                    } else if (image === "") {
                        ngModel.$setViewValue("");
                    }
                    scope.image = ngModel.$viewValue + random() || defaultImage;
                    scope.imageExists = ngModel.$viewValue || false;
                };

                scope.delete = function () {
                    ngModel.$render("");
                };

                scope.openGallery = function () {
                    $modal.open({
                        templateUrl: 'galleryImage.html',
                        controller: 'SingleItemGalleryModalCtrl',
                        size: 'lg',
                        resolve: {
                            ngModal: function () {
                                return ngModel;
                            }
                        }
                    }).result.then(function (selectedImage) {
                        ngModel.$render(selectedImage);
                    });
                };

                angular.element(element).find('img').bind('error', function () {
                    angular.element(this).attr("src", scope.defaultErrorImage);
                });

                function random() {
                    return "?time=" + Date.now();
                }
            }
        }
    })
    .controller('SingleItemGalleryModalCtrl', ["$scope", "$modalInstance",
        function ($scope, $modalInstance) {

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };

            $scope.select = function () {
                $modalInstance.close($scope.ngModel);
            };
        }]
    );

angular.module('schemaForm').config(
    ['schemaFormProvider', 'schemaFormDecoratorsProvider', 'sfPathProvider',
        function (schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {

            var gallery = function (name, schema, options) {
                if (schema.type === 'gallery') {
                    var f = schemaFormProvider.stdFormObj(name, schema, options);
                    f.key = options.path;
                    f.type = 'gallery';
                    f.index = 'arrayIndex';
                    f.path = schema.path;
                    options.lookup[sfPathProvider.stringify(options.path)] = f;
                    return f;
                }
            };

            if (!schemaFormProvider.defaults.gallery)
                schemaFormProvider.defaults.gallery = [];

            schemaFormProvider.defaults.gallery.unshift(gallery);

            //Add to the bootstrap directive
            schemaFormDecoratorsProvider.addMapping(
                'bootstrapDecorator',
                'gallery',
                'directives/decorators/bootstrap/galleryimage/galleryimage.html'
            );
            schemaFormDecoratorsProvider.createDirective(
                'gallery',
                'directives/decorators/bootstrap/galleryimage/galleryimage.html'
            );
        }
    ]);
