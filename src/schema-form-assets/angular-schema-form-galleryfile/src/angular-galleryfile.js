angular.module('schemaForm')
    .directive('riGalleryFileUploader', ['$http', '$routeParams', '$timeout', 'models', function ($http, $routeParams, $timeout, models) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attrs, ngModel) {
                scope.onFileSelect = function ($files) {
                    if ($files && $files.length > 0) {
                        if (scope.myFiles && scope.myFiles.length > 0) {
                            var file = scope.myFiles[0];
                            models.uploadToGallery(file, function (data) {
                                ngModel.$render(data[0]);
                            });
                        }
                    }
                };

                ngModel.$render = function (image) {
                    if (image) {
                        ngModel.$setViewValue(image);
                    } else if (image === "") {
                        ngModel.$setViewValue("");
                    }
                };
            }
        }
    }])
    .directive('riFileView', function ($routeParams, models) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attrs, ngModel) {
                var defaultImageForFile = '//dummyimage.com/200x150/cccccc/ffffff&text=Upload+File';
                var id = $routeParams.id;
                var modelName = $routeParams.schema;
                scope.$watch(attrs.filename, function (value) {
                    if (value) {
                        // models.getFileUrl(modelName, id, value, function (url) {
                        scope.galleryPath = models.getGalleryPath();
                        scope.file = models.getGalleryPath() + value;
                        scope.fileExists = true;
                        // });
                    } else {
                        scope.sampleImage = defaultImageForFile;
                        scope.fileExists = false;
                    }

                    scope.downloadImage = function () {
                        console.log("TODO: Download file from model", modelName, "and id", id);
                    };

                    scope.deleteFile = function () {
                        models.galleryDelete(value, function () {
                            ngModel.$render("");
                        });
                    }
                });

                ngModel.$render = function (image) {
                    if (image) {
                        ngModel.$setViewValue(image);
                    } else if (image === "") {
                        scope.sampleImage = defaultImageForFile;
                        ngModel.$setViewValue("");
                    }
                };
            }
        }
    });
