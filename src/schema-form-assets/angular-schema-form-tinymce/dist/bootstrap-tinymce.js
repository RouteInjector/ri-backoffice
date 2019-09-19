angular.module("schemaForm").run(["$templateCache", function($templateCache) {$templateCache.put("directives/decorators/bootstrap/tinymce/tinymce.html","<div class=\"form-group {{form.htmlClass}}\" ng-class=\"{\'has-error\': hasError()}\">\r\n    <label class=\"control-label\" ng-show=\"showTitle()\">{{form.title}}</label>\r\n    <textarea\r\n            ri-tinymce=\"form.tinymceOptions\"\r\n            ng-model=\"$$value$$\"\r\n            style=\"background-color: white\"\r\n            schema-validate=\"form\">\r\n    </textarea>\r\n    <span class=\"help-block\">{{ (hasError() && errorMessage(schemaError())) || form.description}}</span>\r\n</div>");
$templateCache.put("directives/decorators/bootstrap/tinymce/tinyvision.html","<!--<!DOCTYPE html>-->\r\n<!--<html lang=\"en\">-->\r\n<!--<head>-->\r\n<!--<meta charset=\"utf-8\">-->\r\n<!--<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge, chrome=1\">-->\r\n<!--<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">-->\r\n<!--<title>TinyVision</title>-->\r\n<style>\r\n    /*body {*/\r\n    /*margin: 0 !important;*/\r\n    /*padding: 51px 0 0 !important;*/\r\n    /*}*/\r\n\r\n    @-webkit-keyframes spin {\r\n        100% {\r\n            -webkit-transform: rotate(360deg);\r\n        }\r\n    }\r\n\r\n    @-moz-keyframes spin {\r\n        100% {\r\n            -moz-transform: rotate(360deg);\r\n        }\r\n    }\r\n\r\n    @-ms-keyframes spin {\r\n        100% {\r\n            -ms-transform: rotate(360deg);\r\n        }\r\n    }\r\n\r\n    @-o-keyframes spin {\r\n        100% {\r\n            -o-transform: rotate(360deg);\r\n        }\r\n    }\r\n\r\n    @keyframes spin {\r\n        100% {\r\n            transform: rotate(360deg);\r\n        }\r\n    }\r\n\r\n    @font-face {\r\n        font-family: \'TinyVision\';\r\n        font-style: normal;\r\n        font-weight: normal;\r\n        src: url(data:application/font-woff;charset=utf-8;base64,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) format(\"truetype\");\r\n    }\r\n\r\n    #tinyvision .tv-icon {\r\n        display: inline-block;\r\n        font-family: \'TinyVision\';\r\n        font-style: normal;\r\n        font-size: 16px;\r\n        text-transform: none;\r\n        font-variant: normal;\r\n        font-weight: normal;\r\n        line-height: 1;\r\n        speak: none;\r\n        vertical-align: text-bottom;\r\n        -webkit-font-smoothing: antialiased;\r\n    }\r\n\r\n    #tinyvision .tv-icon-refresh:before {\r\n        content: \"\\e000\";\r\n    }\r\n\r\n    #tinyvision .tv-icon-upload:before {\r\n        content: \"\\e001\";\r\n    }\r\n\r\n    #tinyvision .tv-icon-remove:before {\r\n        content: \"\\e9ac\";\r\n    }\r\n\r\n    #tinyvision .tv-icon-folder:before {\r\n        content: \"\\e931\";\r\n    }\r\n\r\n    #tinyvision .icon-back:before {\r\n        font-family: \'TinyVision\';\r\n        content: \"\\e967\";\r\n    }\r\n\r\n    #tinyvision .tv-toolbar {\r\n        border-bottom: 1px solid #9e9e9e;\r\n        left: 0;\r\n        padding: 10px;\r\n        position: fixed;\r\n        right: 0;\r\n        top: 0;\r\n        z-index: 1000;\r\n    }\r\n\r\n    #tinyvision .tv-toolbar-left {\r\n        float: left;\r\n    }\r\n\r\n    #tinyvision .tv-toolbar-left > * {\r\n        float: left;\r\n        margin-right: 3px;\r\n    }\r\n\r\n    #tinyvision .tv-toolbar-right {\r\n        float: right;\r\n    }\r\n\r\n    #tinyvision .tv-toolbar-right > * {\r\n        float: left;\r\n        margin-left: 3px;\r\n    }\r\n\r\n    #tinyvision .tv-upload .tv-icon-upload {\r\n        margin-right: 3px;\r\n    }\r\n\r\n    #tinyvision .tv-search .tv-icon-search {\r\n        cursor: text;\r\n        left: 11px;\r\n        position: absolute;\r\n        top: 6px;\r\n    }\r\n\r\n    #tinyvision .tv-search input {\r\n        padding-left: 35px;\r\n        width: 200px;\r\n    }\r\n\r\n    #tinyvision .tv-notice {\r\n        border: 1px solid #eee;\r\n        color: #9e9e9e;\r\n        display: none;\r\n        font-size: 20px;\r\n        margin: 15% auto 0;\r\n        padding: 20px;\r\n        text-align: center;\r\n        white-space: normal;\r\n        width: 50%;\r\n    }\r\n\r\n    #tinyvision .tv-items {\r\n        list-style: none;\r\n        margin: 10px auto;\r\n        width: 660px;\r\n    }\r\n\r\n    #tinyvision .tv-item {\r\n        float: left;\r\n        margin: 10px;\r\n    }\r\n\r\n    #tinyvision .tv-item.selected .tv-item-image {\r\n        border: 2px solid #0088cc !important;\r\n        padding: 4px;\r\n    }\r\n\r\n    #tinyvision .tv-item.selected .tv-item-name {\r\n        color: #0088cc !important;\r\n    }\r\n\r\n    #tinyvision .tv-item-link {\r\n        cursor: pointer;\r\n        display: block;\r\n        text-decoration: none;\r\n    }\r\n\r\n    #tinyvision .tv-item-link:hover .tv-item-image {\r\n        border-color: #9e9e9e;\r\n    }\r\n\r\n    #tinyvision .tv-item-link:hover .tv-item-name {\r\n        color: #000;\r\n    }\r\n\r\n    #tinyvision .tv-item-dir {\r\n        border: 1px solid #eee;\r\n        height: 100px;\r\n        line-height: 100px;\r\n        padding: 5px;\r\n        text-align: center;\r\n        width: 100px;\r\n    }\r\n\r\n    #tinyvision .tv-item-dir span {\r\n        max-height: 100px;\r\n        max-width: 100px;\r\n        min-height: 1px;\r\n        min-width: 1px;\r\n        vertical-align: middle;\r\n        font-size: 70px;\r\n        font-family: \'Glyphicons Halflings\';\r\n        color: #696969;\r\n    }\r\n\r\n    #tinyvision .tv-item-image {\r\n        border: 1px solid #eee;\r\n        height: 100px;\r\n        line-height: 100px;\r\n        padding: 5px;\r\n        text-align: center;\r\n        width: 100px;\r\n    }\r\n\r\n    #tinyvision .tv-item-image img {\r\n        max-height: 100px;\r\n        max-width: 100px;\r\n        min-height: 1px;\r\n        min-width: 1px;\r\n        vertical-align: middle;\r\n    }\r\n\r\n    #tinyvision .tv-item-name {\r\n        color: #9e9e9e;\r\n        padding: 5px;\r\n        overflow: hidden;\r\n        text-overflow: ellipsis;\r\n        white-space: nowrap;\r\n        width: 100px;\r\n    }\r\n\r\n    .cf:before,\r\n    .cf:after {\r\n        content: \' \';\r\n        display: table;\r\n    }\r\n\r\n    .cf:after {\r\n        clear: both;\r\n    }\r\n</style>\r\n<!--<link rel=\"stylesheet\" href=\"tinyvision.css\">-->\r\n<!--</head>-->\r\n<!--<body>-->\r\n<div class=\"mce-container\" id=\"tinyvision\">\r\n    <div class=\"tv-toolbar mce-panel cf\">\r\n        <div class=\"tv-toolbar-left\">\r\n            <div class=\"tv-upload mce-widget mce-btn\">\r\n                <button ng-if=\"isEmptyDir\" type=\"button\" ng-click=\"removeDir()\" id=\"remove-dir\"><span\r\n                        class=\"tv-icon tv-icon-remove\"></span> Remove directory\r\n                </button>\r\n                <button ng-if=\"!isEmptyDir\" type=\"button\" ng-click=\"removeFile()\" id=\"remove\"><span\r\n                        class=\"tv-icon tv-icon-remove\"></span> Remove\r\n                </button>\r\n            </div>\r\n            <div class=\"tv-upload mce-widget mce-btn\">\r\n                <button type=\"button\" ng-click=\"refresh()\" id=\"refresh\"><span\r\n                        class=\"tv-icon tv-icon-refresh\"></span> Refresh\r\n                </button>\r\n            </div>\r\n            <div class=\"tv-upload mce-widget mce-btn\">\r\n                <button type=\"button\" ng-click=\"openUploadModal()\" id=\"upload\"><span\r\n                        class=\"tv-icon tv-icon-upload\"></span> Upload\r\n                </button>\r\n            </div>\r\n        </div>\r\n        <div class=\"tv-toolbar-right\">\r\n            <div class=\"tv-search mce-widget\">\r\n                <span class=\"tv-icon tv-icon-search\"></span>\r\n                <input class=\"mce-textbox\" ng-model=\"dir\" placeholder=\"Directory name\">\r\n            </div>\r\n            <div class=\"tv-refresh mce-widget mce-btn\">\r\n                <button type=\"button\" id=\"create\" ng-click=\"createDir(dir)\"><span class=\"tv-icon tv-icon-folder\"></span>\r\n                </button>\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <div class=\"tv-notice\" id=\"notice\"></div>\r\n    <ol class=\"tv-items cf\" id=\"items\">\r\n        <li ng-if=\"pathStack\" class=\"tv-item\">\r\n            <a ng-click=\"findByPath(\'..\')\" class=\"tv-item-link\" title=\"{{name}}\">\r\n                <div class=\"tv-item-dir\">\r\n                    <span class=\"glyphicon glyphicon-folder-open\" aria-hidden=\"true\"></span>\r\n                </div>\r\n                <div class=\"tv-item-name\"><span class=\"icon-back\"></span> Back</div>\r\n            </a>\r\n        </li>\r\n        <li ng-repeat=\"e in data.directories track by $index\" class=\"tv-item\">\r\n            <a ng-click=\"findByPath(e)\" class=\"tv-item-link\" title=\"{{name}}\">\r\n                <div class=\"tv-item-dir\">\r\n                    <span class=\"glyphicon glyphicon-folder-close\" aria-hidden=\"true\"></span>\r\n                </div>\r\n                <div class=\"tv-item-name\">{{e}}</div>\r\n            </a>\r\n        </li>\r\n        <li ng-repeat=\"e in data.image track by $index\" class=\"tv-item\" ng-class=\"{\'selected\':selected==e}\">\r\n            <a ng-click=\"setSelected(e)\" class=\"tv-item-link\" title=\"{{e}}\">\r\n                <div class=\"tv-item-image\">\r\n                    <img ng-src=\"{{getFullPath(e)}}\">\r\n                </div>\r\n                <div class=\"tv-item-name\">{{e}}</div>\r\n            </a>\r\n        </li>\r\n        <li ng-repeat=\"e in data.video track by $index\" class=\"tv-item\" ng-class=\"{\'selected\':selected==e}\">\r\n            <a ng-click=\"setSelected(e)\" class=\"tv-item-link\" title=\"{{e}}\">\r\n                <div class=\"tv-item-image\">\r\n                    <img ng-src=\"{{getFullPath(e)}}\">\r\n                </div>\r\n                <div class=\"tv-item-name\">{{e}}</div>\r\n            </a>\r\n        </li>\r\n        <li ng-repeat=\"e in data.file track by $index\" class=\"tv-item\" ng-class=\"{\'selected\':selected==e}\">\r\n            <a ng-click=\"setSelected(e)\" class=\"tv-item-link\" title=\"{{e}}\">\r\n                <div class=\"tv-item-dir\">\r\n                    <span class=\"glyphicon glyphicon-file\" aria-hidden=\"true\"></span>\r\n                </div>\r\n                <div class=\"tv-item-name\"><a href=\"{{getFullPath(e)}}\" target=\"_blank\">{{e}}</a></div>\r\n            </a>\r\n        </li>\r\n    </ol>\r\n</div>\r\n<!--&lt;!&ndash;<script src=\"tinyvision.min.js\"></script>&ndash;&gt;-->\r\n<!--</body>-->\r\n<!--</html>-->\r\n<!--MODAL FOR VALIDATION-->\r\n<style>\r\n    .modal {\r\n        z-index: 15001 !important;\r\n    }\r\n\r\n    .modal-dialog {\r\n        z-index: 15001 !important;\r\n    }\r\n\r\n    #mce-modal-block {\r\n        z-index: 15000 !important;\r\n    }\r\n\r\n    .mce-floatpanel {\r\n        z-index: 15001 !important;\r\n    }\r\n\r\n    #mce-modal-block .mce-panel {\r\n        z-index: 15001 !important;\r\n    }\r\n\r\n    droplet {\r\n        display: inline-block;\r\n        z-index: 15003;\r\n        position: relative;\r\n        border-radius: 2px;\r\n        width: 100%;\r\n        height: 400px;\r\n        background-color: rgba(255, 255, 255, .1);\r\n        margin-top: -5px;\r\n        padding-top: 5px;\r\n        transition: box-shadow 0.35s;\r\n    }\r\n\r\n    droplet.event-dragover {\r\n        box-shadow: inset 0 0 100px rgba(255, 255, 255, .25), inset 0 0 5px rgba(255, 255, 255, .25);\r\n    }\r\n\r\n    droplet ul.files {\r\n        height: 100%;\r\n        width: 100%;\r\n        overflow-y: auto;\r\n        padding: 5px;\r\n        list-style-type: none;\r\n        transition: all .5s;\r\n    }\r\n\r\n    droplet ul.files li {\r\n        width: 100px;\r\n        height: 100px;\r\n        padding: 1px;\r\n        float: left;\r\n        position: relative;\r\n        margin: 5px;\r\n    }\r\n\r\n    droplet ul.files li img.droplet-preview {\r\n        max-width: 96px;\r\n        background-size: cover;\r\n        background-repeat: no-repeat;\r\n        height: 96px;\r\n        width: 96px;\r\n        background-color: white;\r\n        box-shadow: 0 0 10px rgba(0, 0, 0, .25);\r\n        border: 1px solid white;\r\n        display: block;\r\n    }\r\n\r\n    droplet ul.files li div.delete {\r\n        background-color: rgba(0, 0, 0, .25);\r\n        width: 50px;\r\n        height: 50px;\r\n        font-family: Lato, Arial, Tahoma, Helvetica, sans-serif;\r\n        color: white;\r\n        font-size: 25px;\r\n        text-shadow: 1px 1px 0 rgba(0, 0, 0, .25);\r\n        text-align: center;\r\n        cursor: pointer;\r\n        line-height: 50px;\r\n        position: absolute;\r\n        border-radius: 50%;\r\n        z-index: 1010;\r\n        top: 25px;\r\n        left: 25px;\r\n        opacity: 0;\r\n        transition: all .30s;\r\n        transform: scale(0.5);\r\n    }\r\n\r\n    droplet ul.files li:hover div.delete {\r\n        opacity: 1;\r\n        transform: scale(1);\r\n    }\r\n\r\n    droplet ul.files li div.delete:hover {\r\n        background-color: rgba(0, 0, 0, .45);\r\n    }\r\n\r\n    droplet ul.files li div.size {\r\n        background-color: rgba(255, 255, 255, .5);\r\n        position: absolute;\r\n        bottom: 5px;\r\n        right: 5px;\r\n        pointer-events: none;\r\n        font-size: 9px;\r\n        font-family: Lato, Arial, Tahoma, Helvetica, sans-serif;\r\n        padding: 1px 4px;\r\n    }\r\n</style>\r\n<script type=\"text/ng-template\" id=\"imgUploader.html\">\r\n    <div class=\"modal-header\">\r\n        <h3 class=\"modal-title\">Upload Files</h3>\r\n    </div>\r\n    <div class=\"modal-body\">\r\n        <droplet ng-model=\"dropletint\">\r\n\r\n            <!--<div class=\"loading\" ng-class=\"{ visible: dropletint.isUploading() }\">\r\n                <svg viewBox=\"0 0 400 400\">\r\n                    <path class=\"loading-path\" data-progressbar ng-model=\"dropletint.progress.percent\"\r\n                          d=\"M 0,1 L 398,1 L 398,234 L 1,234 L 0,1\"\r\n                          stroke=\"#D3B2D1\" stroke-width=\"1\" fill-opacity=\"0\"\r\n                          style=\"stroke-dasharray: 392px, 392px;stroke-dashoffset: 392px;\"></path>\r\n                </svg>\r\n            </div>-->\r\n\r\n            <section ng-show=\"dropletint.isUploading()\">Upload done. Press Cancel button or ESC key</section>\r\n\r\n            <ul class=\"files\">\r\n                <li ng-hide=\"dropletint.isUploading()\"\r\n                    ng-repeat=\"filemodel in dropletint.getFiles(dropletint.FILE_TYPES.VALID)\">\r\n                    <droplet-preview ng-model=\"filemodel\"></droplet-preview>\r\n                    <div class=\"delete\" ng-click=\"filemodel.deleteFile()\">&times;</div>\r\n                    <div class=\"size\">{{filemodel.file.size / 1024 / 1024 | number: 1}}MB</div>\r\n                </li>\r\n            </ul>\r\n        </droplet>\r\n    </div>\r\n    <div class=\"modal-footer\">\r\n        <button class=\"btn btn-default\" ng-click=\"cancel()\">Cancel</button>\r\n        <button class=\"btn btn-primary\" ng-click=\"dropletint.uploadFiles()\" ng-hide=\"dropletint.isUploading()\">\r\n            Upload files\r\n        </button>\r\n    </div>\r\n</script>");}]);
angular.module('schemaForm').directive('riTinymce', ['$http', '$window', '$modal', function ($http, $window, $modal) {
    var count = 0;

    var defaultConf = {
        plugins: "code image -tinyvision autoresize fullscreen media link paste preview textcolor",
        toolbar1: "undo redo | styleselect fontsizeselect | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media | preview | fullscreen | forecolor backcolor",
        image_advtab: true,
        forced_root_block: 'p',
        width: '100%',
        height: 400,
        autoresize_min_height: 400,
        autoresize_max_height: 800,
        fullscreen_new_window: true,
        skin_url: 'extra/tinymce/skins/lightgray',
        fullscreen_settings: {
            theme_advanced_path_location: "top"
        },
        paste_preprocess: function (pl, o) {
            o.content = o.content.replace(/(<b>)/ig, "<strong>");
            o.content = o.content.replace(/(<\/b>)/ig, "</strong>");
            o.content = o.content.replace(/(<i>)/ig, "<em>");
            o.content = o.content.replace(/(<\/i>)/ig, "</em>");
        },
        //valid_elements: 'p,a[href],span[class],div[class],img[style|class|src|border=0|alt|title|hspace|vspace|width|height|align|onmouseover|onmouseout|name]',
        // tinyvision: {
        //     source: '/gallery',
        //     // upload: function () {
        //     //     $modal.open({
        //     //         templateUrl: 'imgUploader.html',
        //     //         controller: 'ModalImgUploaderCtrl',
        //     //         size: 'md'
        //     //     });
        //     // }
        // }
    };


    return {
        restrict: 'A',
        require: 'ngModel',
        scope: false,
        link: function (scope, element, attrs, ngModel) {
            var tinymce;

            if (!attrs.id) {
                attrs.$set('id', 'ri-tinymce-' + count++);
            } else {
                //do we have real jQuery? or querySelector
                var focus = function () {
                    if (tinymce) {
                    }
                };
                if ($window.jQuery) {
                    jQuery('label[for=' + attrs.id + ']')
                }
            }

            // function ensureInstance() {
            //     if (!tinyInstance) {
            //         tinyInstance = tinymce.get(attrs.id);
            //     }
            // }

            function destroy() {
                if (tinymce) {
                    tinymce.save();
                    tinymce.remove();
                    tinymce = null;
                }
            }

            scope.destroy = destroy;


            scope.$on('$destroy', destroy);

            scope.$watch(attrs.ngModel, function (value, old) {
                console.log(value, old);
                if (tinymce && angular.isDefined(value)) {
                    var content = tinymce.getContent();
                    if (angular.isString(value) && content !== value) {
                        tinymce.setContent(value);
                    }
                }
            });

            var init = function (config) {
                config = angular.extend(config || {}, defaultConf, {
                    selector: '#' + attrs.id,
                    setup: function (editor) {
                        // tinyMCE.PluginManager.load('tinyvision', '/admin/extra/tinyvision/build/plugin.min.js');
                        tinymce = editor;
                        $window['focus' + attrs.id] = function () {
                            tinymce.execCommand('mceFocus', false, attrs.id);
                        };

                        var update = function () {
                            var content = editor.getContent();
                            if (ngModel.$viewValue !== content) {
                                ngModel.$setViewValue(content);

                                //certain things like 'destroy' below triggers update inside a $digest cycle.
                                if (!scope.$root.$$phase) {
                                    scope.$apply();
                                }
                            }
                        };

                        editor.on('change', update);
                        editor.on('KeyUp', update);
                        editor.on('ExecCommand', update);
                        editor.on('focus', function (e) {
                            angular.element(e.target.contentAreaContainer).addClass('tx-tinymce-active');
                        });
                        editor.on('blur', function (e) {
                            angular.element(e.target.contentAreaContainer).removeClass('tx-tinymce-active');
                        });
                        console.log("--> " + ngModel.$viewValue);
                    }
                });

                tinyMCE.init(config);
            };

            // If config is set watch it for changes, otherwise just init.
            if (attrs.riTinymce) {
                scope.$watch(attrs.riTinymce, function (c, old) {
                    console.log(c);
                    destroy();
                    if (c) init(c);
                    else init();
                });
            } else {
                init();
                destroy();
            }
        }
    };
}]);
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

angular.module('schemaForm').config(
    ['schemaFormProvider', 'schemaFormDecoratorsProvider', 'sfPathProvider',
        function (schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {

            var wysiwyg = function (name, schema, options) {
                if (schema.type === 'string' && schema.format == 'html') {
                    var f = schemaFormProvider.stdFormObj(name, schema, options);
                    f.key = options.path;
                    f.type = 'wysiwyg';
                    f.tinymceOptions = schema.tinymceOptions;
                    options.lookup[sfPathProvider.stringify(options.path)] = f;
                    return f;
                }
            };

            schemaFormProvider.defaults.string.unshift(wysiwyg);

            //Add to the bootstrap directive
            schemaFormDecoratorsProvider.addMapping('bootstrapDecorator', 'wysiwyg',
                'directives/decorators/bootstrap/tinymce/tinymce.html');
            schemaFormDecoratorsProvider.createDirective('wysiwyg',
                'directives/decorators/bootstrap/tinymce/tinymce.html');
        }]);
