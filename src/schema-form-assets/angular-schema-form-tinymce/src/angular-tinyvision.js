angular.module('schemaForm')
    .run(["$templateCache", function ($templateCache) {
        // Register the plugin with TinyMCE.
        tinymce.PluginManager.add('tinyvision', function (editor, pluginUrl) {
            /**
             * Object to encapsulate everything.
             *
             * @type {Object}
             */
            var self = {};

            /**
             * TinyVision window.
             *
             * @type {tinymce.ui.Window}
             * @see  {@link http://www.tinymce.com/wiki.php/api4:class.tinymce.ui.Window}
             */
            self.win = null;

            /**
             * Height of the TinyVision window.
             *
             * @constant {number}
             * @default
             */
            self.WINDOW_HEIGHT = 537;

            /**
             * URL to open in the TinyVision window's iframe.
             *
             * @constant {string}
             * @default
             */
            self.WINDOW_BODY = '<tinyvision></tinyvision>';//'directives/decorators/bootstrap/tinymce/tinyvision.html';//pluginUrl + '/tinyvision.html';

            /**
             * Width of the TinyVision window.
             *
             * @constant {number}
             * @default
             */
            self.WINDOW_WIDTH = 702;

            /**
             * Get the URL of the TinyMCE editor skin. TinyMCE doesn't provide an
             * accessor method, so the style sheets have to be manually parsed.
             *
             * @return {string} URL of the TinyMCE editor skin.
             */
            self.skinUrl = function () {
                var regex = /\/skins\/\w+\/skin(\.min)?\.css$/,
                    styleSheets = document.styleSheets,
                    styleSheetsLength = styleSheets.length,
                    styleSheetHref,
                    url;

                for (var i = 0; i < styleSheetsLength; i += 1) {
                    styleSheetHref = styleSheets[i].href;

                    if (styleSheetHref && styleSheetHref.match(regex)) {
                        url = styleSheetHref;
                        break;
                    }
                }

                return url;
            };

            /**
             * Get the iframe's window object.
             *
             * @return {Window} iframe's window object.
             */
            self.scope = function () {
                return angular.element(self.win.getEl()).scope().$$childTail;
            };

            /**
             * Get the currently selected item's data.
             *
             * @return {?Object} Item data.
             */
            self.selected = function () {
                return self.scope().getCompleteSelected();
            };

            /**
             * Populate the field that TinyVision was launched from with the selected
             * item's `value`. Empties the field value if nothing selected.
             *
             * @param  {Element} field Field that TinyVision was launched from.
             * @return {Object} self
             */
            self.populateField = function (field) {
                var selected = self.selected();

                field.value = selected ? selected : '';

                return self;
            };

            /**
             * Open the TinyMCE window for TinyVision. The window consists primarily of
             * an iframe with the toolbar and items list.
             *
             * @param  {string} fieldId ID of field to populate with the selected value.
             * @param  {string} fieldValue Current value of the field to populate.
             * @param  {string} type The type of files to display.
             * @param  {tinymce.ui.Window} parentWin Window launching TinyVision.
             * @return {Object} self
             */
            self.openWindow = function (fieldId, fieldValue, type, parentWin) {
                self.win = editor.windowManager.open({
                    title: 'Select ' + type,
                    html: self.WINDOW_BODY,
                    buttons: [
                        {
                            text: 'Select',
                            subtype: 'primary',
                            onclick: function () {
                                self.populateField(parentWin.document.getElementById(fieldId));
                                self.win.close();
                            }
                        },
                        {
                            text: 'Cancel',
                            onclick: 'close'
                        }
                    ],
                    width: self.WINDOW_WIDTH,
                    height: self.WINDOW_HEIGHT
                }, {
                    // Values passed to the iframe.
                    fieldValue: fieldValue,
                    options: editor.settings.tinyvision,
                    skinUrl: self.skinUrl(),
                    type: type
                });
                taka = self.win;
                angular.element(document).injector().invoke(["$compile", "$rootScope", function ($compile, $rootScope) {
                    var $targetDom = $("#" + self.win._id + "-body");
                    var $scope = $targetDom.html("<tinyvision></tinyvision>").scope();
                    $compile($targetDom)($scope);
                    $rootScope.$digest();
                }]);

                return self;
            };

            // Add a TinyMCE command that other plugins can call to launch TinyVision.
            editor.addCommand('tinyvision', function (options) {
                self.openWindow(options.fieldId, options.fieldValue, options.type, options.win);
            });

            // Modify the editor's config to register TinyVision as the file browser.
            /* jshint -W106 */
            editor.settings.file_browser_callback = self.openWindow;
            /* jshint +W106 */
        });
    }])
    .directive("tinyvision", ['$http', '$modal', 'models', function ($http, $modal, models) {
        return {
            restrict: 'E',
            templateUrl: "directives/decorators/bootstrap/tinymce/tinyvision.html",
            scope: {
                ngModel: "="
            },
            link: function (scope, element, attrs, ngModel) {
                var pathStack = [];
                scope.findByPath = function (path) {
                    scope.data = undefined;
                    if (path === "..") {
                        pathStack.pop();
                    } else if (path !== "") {
                        pathStack.push(path);
                    }
                    models.galleryGetByPath(pathStack.join("/") + "/", function (data) {
                        scope.pathStack = pathStack.join("/");
                        scope.isEmptyDir = isEmptyDir(data);
                        scope.data = data;
                    });
                };

                scope.setSelected = function (e) {
                    scope.selected = e;
                    scope.ngModel = scope.getCompleteSelected();
                    console.log("ngModel " + ngModel);
                    console.log("scope.ngModel " + scope.ngModel);
                    console.log("selected " + scope.selected);
                };

                scope.getCompleteSelected = function () {
                    return scope.getFullPath(scope.selected);
                };

                scope.getFullPath = function (img) {
                    return (models.getGalleryPath() + pathStack.join("/") + "/" + img).replace(/([^:]\/)\/+/g, "$1");
                };

                scope.openUploadModal = function () {
                    $modal.open({
                        templateUrl: 'imgUploader.html',
                        controller: 'ModalImgUploaderCtrl',
                        size: 'md',
                        resolve: {
                            pathstack: function () {
                                return pathStack;
                            }
                        }
                    }).result.then(function () {
                        scope.refresh();
                    });
                };

                scope.refresh = function () {
                    scope.selected = undefined;
                    scope.findByPath("");
                };

                scope.remove = function (path) {
                    models.galleryDeleteByPath(pathStack.join("/") + path, function (data) {
                        if (path === "") {
                            scope.findByPath("..");
                        } else {
                            scope.refresh();
                        }
                    });
                };

                scope.removeFile = function () {
                    if (!scope.selected)
                        return;
                    scope.remove("/" + scope.selected);
                };

                scope.removeDir = function () {
                    scope.remove("");
                };

                scope.createDir = function (dir) {
                    if (!dir) return;
                    models.galleryPostByPath(pathStack.join("/") + "/" + dir, function (data) {
                        scope.dir = undefined;
                        scope.refresh();
                    });
                };

                function isEmptyDir(data) {
                    if (data.image && data.image.length) {
                        return false;
                    }
                    if (data.video && data.video.length) {
                        return false;
                    }
                    if (data.file && data.file.length) {
                        return false;
                    }
                    if (data.directories && data.directories.length) {
                        return false;
                    }
                    return true;
                }

                scope.refresh();
            }
        }
    }
    ])
    .controller('ModalImgUploaderCtrl', ["$scope", "$modalInstance", "$timeout", "loginProvider", "pathstack", "models",
        function ($scope, $modalInstance, $timeout, loginProvider, pathstack, models) {
            $scope.success = false;
            $scope.error = false;
            $scope.$on('$dropletReady', function whenDropletReady() {
                loginProvider.getUser(function (user) {
                    $scope.dropletint.allowedExtensions(['png', 'jpg', 'bmp', 'gif', 'csv', 'pdf', 'zip', 'rar', 'xls', 'xlsx', 'xml', 'yml', 'json', 'doc', 'docx', 'svg']);
                    $scope.dropletint.setRequestHeaders({
                        "Authorization": "BEARER " + user.token
                    });
                    $scope.dropletint.defineHTTPSuccess([200, 201]);
                    $scope.dropletint.setRequestUrl(models.getGalleryPath() + pathstack.join("/"));
                });
            });

            $scope.$on('$dropletSuccess', function onDropletSuccess(event, response, files) {
                $modalInstance.close();
            });

            $scope.cancel = function () {
                $modalInstance.close();
            };

            $modalInstance.result.finally(function () {
                // $('iframe').contents().find('#refresh').trigger('click');
            });

        }]
    );
