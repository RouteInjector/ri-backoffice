angular.module("schemaForm").run(["$templateCache", function($templateCache) {$templateCache.put("directives/decorators/bootstrap/galleryfile/galleryfile.html","<link rel=\"stylesheet\" href=\"//cdnjs.cloudflare.com/ajax/libs/jasny-bootstrap/3.1.3/css/jasny-bootstrap.min.css\">\r\n<div class=\"form-group\" ng-class=\"{\'has-error\': hasError()}\">\r\n    <label class=\"control-label\" ng-show=\"showTitle()\">{{form.title}}</label>\r\n\r\n    <div class=\"input-group\">\r\n        <div class=\"fileinput fileinput-new\" data-provides=\"fileinput\">\r\n            <div class=\"fileinput-new thumbnail\" style=\"width: 200px; height: 150px;\">\r\n                <img ng-if=\"sampleImage\" ng-model=\"$$value$$\" ri-file-view ng-show=\"sampleImage\" ng-src=\"{{sampleImage}}\">\r\n                <a ri-file-view filename=\"$$value$$\" href=\"{{$$value$$}}\" ng-model=\"$$value$$\">{{$$value$$}}</a>\r\n            </div>\r\n            <div class=\"fileinput-preview fileinput-exists thumbnail\"\r\n                 style=\"max-width: 200px; max-height: 150px;\"></div>\r\n            <div ri-gallery-file-uploader ng-model=\"$$value$$\">\r\n                <span class=\"btn btn-default btn-file\">\r\n                    <span class=\"fileinput-new\"><span class=\"glyphicon glyphicon-cloud-upload\"></span></span>\r\n                    <!-- upload file -->\r\n                    <span class=\"fileinput-exists\"><span class=\"glyphicon glyphicon-pencil\"></span></span>\r\n                    <!-- change file -->\r\n                    <input ri-gallery-file-uploader\r\n                           type=\"file\"\r\n                           name=\"file\"\r\n                           path=\"form.path\"\r\n                           index=\"{{arrayIndex}}\"\r\n                           ngf-select=\"true\" ng-model=\"myFiles\" ngf-change=\"fileExists=false; onFileSelect($files)\">\r\n                </span>\r\n                <a href=\" #\" class=\"btn btn-default fileinput-exists\" data-dismiss=\"fileinput\"><span\r\n                        class=\"glyphicon glyphicon-remove\"></span></a> <!-- discard -->\r\n                <a ng-if=\"fileExists\" download=\"{{$$value$$}}\" ng-href=\"{{file}}\" target=\"_self\"\r\n                   class=\"btn btn-default\"><span class=\"glyphicon glyphicon-cloud-download\"></span></a>\r\n                <!-- download -->\r\n                <a ng-if=\"fileExists\" ng-click=\"deleteFile(arrayIndex)\" class=\"btn btn-default\"><span\r\n                        class=\"glyphicon glyphicon-trash\"></span></a> <!-- delete from server -->\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <span class=\"help-block\">{{ (hasError() && errorMessage(schemaError())) || form.description}}</span>\r\n</div>\r\n<script src=\"//cdnjs.cloudflare.com/ajax/libs/jasny-bootstrap/3.1.3/js/jasny-bootstrap.min.js\"></script>");}]);
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

angular.module('schemaForm').config(
    ['schemaFormProvider', 'schemaFormDecoratorsProvider', 'sfPathProvider',
        function (schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {

            var file = function (name, schema, options) {
                if (schema.type === 'gallery' && schema.format === 'file') {
                    var f = schemaFormProvider.stdFormObj(name, schema, options);
                    f.key = options.path;
                    f.type = 'file';
                    f.index = 'arrayIndex';
                    f.path = schema.path;
                    options.lookup[sfPathProvider.stringify(options.path)] = f;
                    return f;
                }
            };

            if (!schemaFormProvider.defaults.gallery)
                schemaFormProvider.defaults.gallery = [];

            schemaFormProvider.defaults.gallery.unshift(file);

            //Add to the bootstrap directive
            schemaFormDecoratorsProvider.addMapping(
                'bootstrapDecorator',
                'file',
                'directives/decorators/bootstrap/galleryfile/galleryfile.html'
            );
            schemaFormDecoratorsProvider.createDirective(
                'file',
                'directives/decorators/bootstrap/galleryfile/galleryfile.html'
            );
        }
    ]);
