(function (angular) {

    'use strict';

    //Generic   

    function makeArray(arr) {
        if(!arr){
            return [];
        }
        return angular.isArray(arr) ? arr : [arr];
    }

    //Angular

    function provideRootElement(modules, element) {
        element = angular.element(element);
        modules.unshift(['$provide',
            function ($provide) {
                $provide.value('$rootElement', element);
            }]);
    }

    function createInjector(injectorModules, element) {
        var modules = ['ng'].concat(makeArray(injectorModules));
        if (element) {
            provideRootElement(modules, element);
        }
        return angular.injector(modules);
    }

    function bootstrapApplication(angularApp) {
        angular.element(document).ready(function () {
            angular.bootstrap(document, [angularApp]);
        });
    }

    angular.lazy = function (app, modules) {

        var injector = createInjector(modules),
            $q = injector.get('$q'),
            promises = [],
            errorCallback = angular.noop,
            loadingCallback = angular.noop,
            doneCallback = angular.noop;

        return {

            resolve: function (promise) {
                promise = $q.when(injector.instantiate(promise));
                promises.push(promise);
                return this;
            },

            bootstrap: function () {

                loadingCallback();

                return $q.all(promises)
                    .then(function () {
                        bootstrapApplication(app);
                    }, errorCallback)
                    .finally(doneCallback);
            },

            loading: function(callback){
                loadingCallback = callback;
                return this;
            },

            done: function(callback){
                doneCallback = callback;
                return this;
            },

            error: function(callback){
                errorCallback = callback;
                return this;
            }
        };

    };

})(angular);
(function () {
    'use strict';
    var app = angular.module('injectorApp', ['ngRoute', 'ngBiscuit', 'schemaForm', 'datePicker', 'ui.select',
            'ui.ace', 'ui.codemirror', 'ui.bootstrap', 'ngFileUpload', 'routeInjector-tinymce',
            'ngDroplet', 'punchCard', 'nvd3ChartDirectives', 'flash', 'ngDialog', 'angular-loading-bar',
            'pascalprecht.translate', 'ngCookies'],
        ['$rootScopeProvider', function ($rootScopeProvider) {
            $rootScopeProvider.digestTtl(15);
        }])
        .run(['$rootScope', 'configs', function ($rootScope, configs) {
            $rootScope.configs = configs;
        }]);

    angular.lazy("injectorApp")
        .resolve(['$http', function ($http) {
            return $http.get('/configs')
                .then(function (resp) {
                    app.constant('configs', resp.data);
                });
        }])
        .resolve(['$http', '$q', function ($http, $q) {

            var deferred = $q.defer();
            $http.get('/admin/extensions').then(function (resp) {
                app.constant('extensions', resp.data);

                var extensions = resp.data;
                var assets = $('asset-loader');
                var scripts = [];

                for (var i = 0; i < assets.length; i++) {
                    var cache = [];

                    var asset = assets[i];
                    var src = asset.attributes.src.nodeValue;
                    var type = asset.attributes.type.nodeValue;

                    if (src === 'files') {
                        if (extensions.files[type] && extensions.files[type].length) {
                            cache = cache.concat(extensions.files[type]);
                        }
                    } else if (src === 'pages') {
                        for (var j in extensions.pages) {
                            var p = extensions.pages[j];
                            if (p.backoffice) {
                                if (p[type] && p[type].length) {
                                    cache = cache.concat(p[type]);
                                }
                            }
                        }
                    }

                    if (type === 'css') {
                        asset.appendChild(createCSSNodes(cache));
                    } else if (type === 'js') {
                        if (cache && cache.length) {
                            scripts = scripts.concat(cache);
                        }
                    }
                }

                //$.getMultiScripts(scripts).done(function () {
                //    deferred.resolve();
                //});
                getScripts(scripts, function () {
                    deferred.resolve();
                });

            });

            return deferred.promise;
        }])
        .bootstrap();

    function createCSSNodes(obj) {
        var div = document.createElement('div');
        for (var i in obj) {
            var link = document.createElement('link');
            link.href = obj[i];
            link.rel = 'stylesheet';
            div.appendChild(link);
        }
        return div;
    }

    function getScripts(scripts, callback) {
        if(!scripts ||  !scripts.length){
            return callback();
        }
        var progress = 0;
        var internalCallback = function () {
            if (++progress == scripts.length) {
                $.ajaxSetup({async:true});
                callback();
            }
        };

        $.ajaxSetup({async:false});
        scripts.forEach(function (script) {
            $.getScript(script, internalCallback);
        });

    }

    $.getMultiScripts = function (arr, path) {
        var _arr = $.map(arr, function (scr) {
            return $.getScript((path || "") + scr);
        });

        _arr.push($.Deferred(function (deferred) {
            $(deferred.resolve);
        }));

        return $.when.apply($, _arr);
    };
})();

(function () {
    'use strict';

    angular.module('injectorApp')
        .config(['$routeProvider', 'configs', 'extensions', 'customMenuProvider', function ($routeProvider, configs, extensions, customMenuProvider) {

            var authCheck = function ($q, $rootScope, $location, $http, loginProvider, configs) {
                var defer = $q.defer();
                if (configs.auth) {
                    loginProvider.getUser(function (user) {
                        if (!user) {
                            $location.path('/login');
                        } else {
                            $http.defaults.headers.common.Authorization = 'BEARER ' + user.token;
                            $rootScope.login = undefined;
                        }
                        defer.resolve();
                    });

                } else {
                    $rootScope.allowedUser = true;
                    defer.resolve();
                }
                return defer.promise;
            };
            authCheck.$inject = ['$q', '$rootScope', '$location', '$http', 'loginProvider', 'configs'];

            var homePage = 'html/models.html';
            if (configs.backoffice.home) {
                homePage = configs.backoffice.home;
            }

            $routeProvider
                .when('/', {
                    templateUrl: homePage,
                    controller: 'MainController',
                    resolve: {
                        app: authCheck
                    }
                })
                .when('/model/:schema', {
                    templateUrl: 'html/model.html',
                    controller: 'ModelController',
                    resolve: {
                        app: authCheck
                    }
                })
                .when('/model/:schema/new', {
                    templateUrl: 'html/create-and-update.html',
                    controller: 'CreateController',
                    resolve: {
                        app: authCheck
                    },
                    reloadOnSearch: false
                })
                .when('/model/:schema/update/:id', {
                    templateUrl: 'html/create-and-update.html',
                    controller: 'UpdateController',
                    resolve: {
                        app: authCheck
                    },
                    reloadOnSearch: false
                })
                .when('/model/:schema/update/:id/:shard', {
                    templateUrl: 'html/create-and-update.html',
                    controller: 'UpdateController',
                    resolve: {
                        app: authCheck
                    },
                    reloadOnSearch: false
                })
                .when('/model/:schema/graphs', {
                    templateUrl: 'html/graphs.html',
                    controller: 'GraphsController',
                    resolve: {
                        app: authCheck
                    }
                })
                .when('/login', {
                    // login / password
                    templateUrl: 'html/login.html',
                    controller: 'LoginController',
                    resolve: {
                        app: ['$q', '$rootScope', '$location', 'loginProvider', function ($q, $rootScope, $location, loginProvider) {
                            var defer = $q.defer();
                            loginProvider.getUser(function (user) {
                                if (user) {
                                    $location.path('/');
                                } else {
                                    $rootScope.login = true;
                                }
                                defer.resolve();
                            });
                            return defer.promise;
                        }]
                    }
                })
                .when('/logout', {
                    resolve: {
                        app: ['$q', '$rootScope', '$location', 'loginProvider', function ($q, $rootScope, $location, loginProvider) {
                            var defer = $q.defer();
                            loginProvider.logout();
                            $location.path('/');
                            defer.resolve();
                            return defer.promise;
                        }]
                    }
                }).when('/settings', {
                    templateUrl: 'html/settings.html',
                    controller: 'SettingsController'
                });


            if (extensions && extensions.pages) {
                var menu = [];
                for (var i in extensions.pages) {
                    var page = extensions.pages[i];

                    if (page.backoffice) {
                        $routeProvider.when('/' + page.url, {
                            templateUrl: page.template,
                            controller: page.controller,
                            resolve: {
                                app: authCheck
                            }
                        });
                    }

                    if (page.menu) {
                        menu.push(page.menu);
                    }
                }
                customMenuProvider.setCustomMenu(menu);
            }

            $routeProvider.otherwise({redirectTo: '/'});
        }]);
}());

(function () {
    'use strict';

    angular.module('injectorApp')
        .config(['$translateProvider', '$translatePartialLoaderProvider', 'configs', function ($translateProvider, $translatePartialLoaderProvider, configs) {
            var i18n = configs.backoffice.i18n;
            $translatePartialLoaderProvider.addPart('login');
            $translatePartialLoaderProvider.addPart('model');
            $translatePartialLoaderProvider.addPart('models');
            $translatePartialLoaderProvider.addPart('navbar');
            $translatePartialLoaderProvider.addPart('search');
            $translatePartialLoaderProvider.addPart('create_update');
            //$translatePartialLoaderProvider.addPart('flash');
            $translatePartialLoaderProvider.addPart('version_dialog');

            if (i18n && i18n.length) {
                for (var i = 0; i < i18n.length; i++) {
                    $translatePartialLoaderProvider.addPart(i18n[i]);
                }
            }

            $translateProvider.useLoader('$translatePartialLoader', {
                urlTemplate: 'i18n/{part}/{lang}.json'
            });
            $translateProvider.registerAvailableLanguageKeys(['en', 'es']);
            var def = "en";
            $translateProvider.fallbackLanguage('en');
            $translateProvider.useLocalStorage();
            if (configs.backoffice.uniqueLanguage) {
                def = configs.backoffice.uniqueLanguage;
                $translateProvider.use(def);
            }
            $translateProvider.preferredLanguage(def);
        }]);

}());
(function () {
    'use strict';
    angular.module('injectorApp')
        .provider('customMenu', function () {
        var menuElements;

        this.setCustomMenu = function(value) {
            menuElements = value;
        };

        this.$get = function(){
            return menuElements;
        };
    });
}());
(function () {
    'use strict';
    angular.module('injectorApp')
        .provider('loginProvider', function () {

            this.$get = ['$http', '$location', 'cookieStore', '$rootScope', function ($http, $location, cookieStore, $rootScope) {
                var factory = {};
                $http.defaults.headers.common['Client-Type'] = 'backoffice';
                $http.defaults.headers.common.profile = 'back';
                factory.login = function (userModel, cb) {
                    $http.post('/auth/login', userModel).success(function (res) {
                        var user = {};
                        //user.name = userModel.login;
                        user.login = userModel.login;
                        user.role = res.role;
                        user.token = res.token;
                        var cookieOptions = {path: '/', end: Infinity};
                        cookieStore.put('user', JSON.stringify(user), cookieOptions);
                        $http.defaults.headers.common.Authorization = 'BEARER ' + res.token;
                        $rootScope.$broadcast('login', user);
                        $rootScope.allowedUser = true;
                        cb(user);
                    }).error(function (err) {
                        var cookieOptions = {path: '/'};
                        cookieStore.remove('user', cookieOptions);
                        $rootScope.$broadcast('logout', undefined);
                        $rootScope.allowedUser = false;
                        cb(false);
                    });
                };

                factory.getUser = function (cb) {
                    var user = JSON.parse(cookieStore.get('user'));
                    if (user && !$rootScope.allowedUser && user.login && (user.password || user.token)) {
                        factory.login(user, function (logged) {
                            if (logged) {
                                angular.extend(user, logged);
                                cb(logged);
                            } else {
                                cb(undefined);
                            }
                        });
                    } else {
                        if (!user) {
                            $rootScope.allowedUser = false;
                        } else {
                            //$rootScope.$broadcast('login', user);
                        }

                        cb(user);
                    }
                };

                factory.logout = function () {
                    var cookieOptions = {path: '/'};
                    cookieStore.remove('user', cookieOptions);
                    $location.path('/login');
                    $rootScope.$broadcast('logout', undefined);
                };

                return factory;
            }];
        });
}());

(function () {
    'use strict';

    angular.module('injectorApp')
        .provider('models', function () {
                var overrides = {};
                var service = {};

                this.override = function (_method, _function) {
                    overrides[_method] = _function;
                };

                this.getService = function () {
                    return service;
                };


                this.$get = ['$rootScope', '$http', 'Upload', 'configs', 'common', function ($rootScope, $http, Upload, configs, common) {

                    var modelsConfig = {};
                    var singlesCache = {};
                    var shards = {};
                    var prefix = '';

                    $rootScope.$on('logout', function () {
                        service.invalidate();
                    });

                    $rootScope.$on('invalidate', function () {
                        console.log("invalidate models provider");
                        service.invalidate();
                    });

                    service.invalidate = function () {
                        shards = {};
                        singlesCache = {};
                        modelsConfig = {};
                    };

                    service.getHttp = function () {
                        return $http;
                    };

                    service.getUpload = function () {
                        return Upload;
                    };

                    service.setShard = function (key, value, model) {
                        var shard = {};
                        shard.key = key;
                        shard.value = value;
                        shard.model = model;
                        shards[model] = shard;
                    };

                    service.getShard = function (model) {
                        return shards[model];
                    };

                    service.removeShard = function (model) {
                        delete shards[model];
                    };

                    service.getModels = function (cb) {
                        prefix = configs.app.prefix;

                        //AVOID CACHE (FOR CHANGING MODELS WHEN LOGIN LOGOUT :)
                        $http.get('/schemas').then(function (schemas) {
                            var models = schemas.data;
                            cb(models);
                        });
                    };

                    service.getModel = function (modelName, cb) {
                        if (!modelsConfig[modelName] && cb) {
                            $http.get('/schema/' + modelName).then(function (schema) {
                                $http.get('/schema/' + modelName + '/formconfig').then(function (config) {
                                    modelsConfig[modelName] = {};
                                    modelsConfig[modelName].schema = schema.data;
                                    modelsConfig[modelName].config = config.data;
                                    cb(modelsConfig[modelName]);
                                });
                            });
                        } else if (!modelsConfig[modelName] && !cb) {
                            var schema = JSON.parse($.ajax({
                                type: "GET",
                                url: '/schema/' + modelName,
                                async: false
                            }).responseText);

                            var config = JSON.parse($.ajax({
                                type: "GET",
                                url: '/schema/' + modelName + '/formconfig',
                                async: false
                            }).responseText);

                            modelsConfig[modelName] = {};
                            modelsConfig[modelName].schema = schema;
                            modelsConfig[modelName].config = config;

                            return modelsConfig[modelName];

                        } else {
                            if (cb) {
                                cb(modelsConfig[modelName]);
                            } else {
                                return modelsConfig[modelName];
                            }
                        }
                    };

                    service.getModelElements = function (modelName, skip, limit, cb) {
                        service.getModel(modelName, function (data) {
                            var plural = (data.config.plural || data.config.path + 's' || modelName + 's');
                            var body = {
                                skip: skip,
                                limit: limit
                            };
                            if (service.getShard(modelName)) {
                                body[service.getShard(modelName).key] = service.getShard(modelName).value;
                            }
                            $http.post(prefix + '/' + plural, body).success(function (elements) {
                                cb(elements.result, elements.status.count);
                            });
                        });
                    };

                    service.getModelSchema = function (modelName, cb) {
                        service.getModel(modelName, function (data) {
                            return cb(data.schema);
                        });
                    };

                    service.getModelConfig = function (modelName, cb) {
                        service.getModel(modelName, function (data) {
                            return cb(data.config);
                        });
                    };

                    service.postDocument = function (modelName, model, cb) {
                        service.getModel(modelName, function (data) {
                            var path = (data.config.path || modelName);
                            $http.post(prefix + '/' + path, JSON.stringify(model)).then(function (response) {
                                return cb(response);
                            });
                        });
                    };

                    service.getUrl = function (modelName, cb) {
                        throw new Error("Not implemented");
                    };

                    service.getDocument = function (modelName, id, shard, cb) {
                        if (!cb) {
                            cb = shard;
                            shard = undefined;
                        }

                        if (!modelName) {
                            return cb();
                        }
                        if (!id) {
                            return cb();
                        }
                        service.getModel(modelName, function (data) {
                            var path = (data.config.path || modelName);
                            var qParams = {
                                params: {
                                    type: "back"
                                }
                            };

                            service.getModelConfig(modelName, function (cfg) {
                                if (shard && cfg.shard && cfg.shard.shardKey) {
                                    qParams.params[cfg.shard.shardKey] = shard;
                                } else if (service.getShard(modelName)) {
                                    qParams.params[service.getShard(modelName).key] = service.getShard(modelName).value;
                                }

                                $http.get(prefix + '/' + path + '/' + id, qParams).success(function (document) {
                                    return cb(document, null);
                                }).error(function (data) {
                                    return cb(null, data);
                                });
                            });

                        });
                    };

                    service.putDocument = function (modelName, id, model, cb) {
                        service.getModel(modelName, function (data) {
                            var path = (data.config.path || modelName);
                            $http.put(prefix + '/' + path + '/' + id, JSON.stringify(model)).then(function (document) {
                                return cb(document);
                            });
                        });
                    };

                    service.removeDocument = function (modelName, id, shard, cb) {
                        if (!cb) {
                            cb = shard;
                            shard = undefined;
                        }


                        service.getModel(modelName, function (data) {
                            var cfg = data.config;
                            var path = (cfg.path || modelName);

                            var opts = {params: {}};

                            if (shard && cfg.shard && cfg.shard.shardKey) {
                                opts.params[cfg.shard.shardKey] = shard;
                            } else if (service.getShard(modelName)) {
                                opts.params[service.getShard(modelName).key] = service.getShard(modelName).value;
                            }
                            $http.delete(prefix + '/' + path + '/' + id, opts).then(cb);
                        });
                    };

                    service.removeDocumentByMongoId = function (modelName, id, shard, cb) {
                        if (!cb) {
                            cb = shard;
                            shard = undefined;
                        }

                        service.getModel(modelName, function (data) {
                            var cfg = data.config;
                            var path = (data.config.path || modelName);

                            var opts = {
                                params: {
                                    type: 'raw'
                                }
                            };

                            if (shard && cfg.shard && cfg.shard.shardKey) {
                                opts.params[cfg.shard.shardKey] = shard;
                            } else if (service.getShard(modelName)) {
                                opts.params[service.getShard(modelName).key] = service.getShard(modelName).value;
                            }
                            $http.delete(prefix + '/' + path + '/' + id, opts).then(cb);
                        });
                    };

                    service.uploadImage = function (modelName, id, fieldName, index, image, cb) {
                        service.getModel(modelName, function (data) {
                            var path = (data.config.path || modelName);
                            Upload.upload({
                                url: prefix + '/' + path + '/' + id + '/' + fieldName, //upload.php script, node.js route, or servlet url
                                data: {index: index},
                                file: image,
                                fileFormDataName: ['image']
                            }).progress(function (evt) {
                                console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
                            }).success(function (data, status, headers, config) {
                                cb(data);
                            });
                        });
                    };

                    service.uploadFile = function (modelName, id, fieldName, index, file, cb) {
                        service.getModel(modelName, function (data) {
                            var path = (data.config.path || modelName);
                            Upload.upload({
                                url: prefix + '/' + path + '/' + id + '/' + fieldName, //upload.php script, node.js route, or servlet url
                                data: {index: index},
                                file: file,
                                fileFormDataName: ['file']
                            }).progress(function (evt) {
                                console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
                            }).success(function (data, status, headers, config) {
                                cb(data);
                            });
                        });
                    };

                    service.deleteImage = function (modelName, id, index, image, cb) {
                        service.getModel(modelName, function (data) {
                            var path = (data.config.path || modelName);
                            $http.delete(prefix + '/' + path + '/' + id + '/image/' + image).then(cb);
                        });
                    };


                    service.deleteFile = function (modelName, id, index, file, cb) {
                        service.getModel(modelName, function (data) {
                            var path = (data.config.path || modelName);
                            $http.delete(prefix + '/' + path + '/' + id + '/file/' + file).then(cb);
                        });
                    };

                    service.getImageUrl = function (modelName, id, imageName, cb) {
                        service.getModel(modelName, function (data) {
                            var path = (data.config.path || modelName);
                            var url = prefix + '/' + path + '/image/' + imageName + common.getRandomQuery();
                            cb(url);
                        });
                    };

                    service.getFileUrl = function (modelName, id, fileName, cb) {
                        service.getModel(modelName, function (data) {
                            var path = (data.config.path || modelName);
                            var url = prefix + '/' + path + '/file/' + fileName + common.getRandomQuery();
                            cb(url);
                        });
                    };

                    service.getSingleModel = function (modelName, cb) {
                        if (singlesCache[modelName]) {
                            cb(singlesCache[modelName]);
                        }
                        else {
                            service.search(modelName, {skip: 0, limit: 1}, function (elements, count) {
                                if (count > 0) {
                                    //We only cach if we found THE single document
                                    singlesCache[modelName] = elements[0];
                                    cb(elements[0]);
                                } else {
                                    //Do nothing from now
                                    cb(null);
                                }
                            });
                        }
                    };

                    service.search = function (modelName, query, shard, cb) {
                        if (!cb) {
                            cb = shard;
                            shard = undefined;
                        }

                        service.getModelConfig(modelName, function (config) {
                            var path = (config.plural || modelName);
                            if (shard && config.shard && config.shard.shardKey) {
                                query[config.shard.shardKey] = shard;
                            } else if (service.getShard(modelName)) {
                                query[service.getShard(modelName).key] = service.getShard(modelName).value;
                            }
                            $http.post(prefix + '/' + path, JSON.stringify(query)).success(function (documents) {
                                if (documents.status.search_count !== undefined) {
                                    cb(documents.result, documents.status.search_count);
                                }
                                else {
                                    cb(documents.result, documents.status.count);
                                }
                            });
                        });
                    };

                    service.export = function (modelName, format, searchQuery, cb) {
                        service.getModelConfig(modelName, function (config) {
                            var query = {};
                            var path = (config.plural || modelName);
                            if (service.getShard(modelName)) {
                                query[service.getShard(modelName).key] = service.getShard(modelName).value;
                            }

                            query.format = format;
                            query.by = config.id;
                            query.query = searchQuery || {};

                            service.postAsForm(prefix + '/' + path + '/export', query);
                            cb();
                        });
                    };

                    service.import = function (modelName, format, file, query, cb) {
                        service.getModelConfig(modelName, function (config) {
                            var path = (config.plural || modelName);
                            if (service.getShard(modelName)) {
                                query[service.getShard(modelName).key] = service.getShard(modelName).value;
                            }

                            query.format = format;

                            service.postAsForm(prefix + '/' + path + '/export', query, "POST", file);
                            cb();
                        });
                    };

                    service.postAsForm = function (path, params, method, file) {
                        method = method || "post"; // Set method to post by default if not specified.

                        if (file) {
                            console.log("FILE", file);
                        }

                        console.log("POST AS FORM", path, params, method, file);

                        // The rest of this code assumes you are not using a library.
                        // It can be made less wordy if you use one.
                        var form = document.createElement("form");
                        form.setAttribute("method", method);
                        form.setAttribute("action", path + "?token=" + $http.defaults.headers.common.Authorization.replace("BEARER ", ""));

                        for (var key in params) {

                            if (params.hasOwnProperty(key)) {
                                var hiddenField = document.createElement("input");
                                hiddenField.setAttribute("type", "hidden");
                                hiddenField.setAttribute("name", key);
                                if (typeof(params[key]) == "object") {
                                    hiddenField.setAttribute("value", JSON.stringify(params[key]));
                                } else {
                                    hiddenField.setAttribute("value", params[key]);
                                }

                                form.appendChild(hiddenField);
                            }
                        }

                        /*fieldAttr(params);

                         function fieldAttr(obj, parent) {

                         for (var key in obj) {
                         var full = parent ? parent + "." + key : key;
                         if(typeof(obj[key]) == "object"){
                         fieldAttr(obj[key], full);
                         }
                         if (obj.hasOwnProperty(key)) {
                         var hiddenField = document.createElement("input");
                         hiddenField.setAttribute("type", "hidden");
                         hiddenField.setAttribute("name", full);
                         hiddenField.setAttribute("value", obj[full]);

                         form.appendChild(hiddenField);
                         }
                         }
                         }*/

                        form.submit();
                    };

                    service.getGraph = function (modelName, graphID, cb) {
                        service.getModelConfig(modelName, function (config) {
                            var path = (config.path || modelName);
                            $http.post(prefix + '/' + path + '/graphs/' + encodeURI(graphID)).success(function (data) {
                                cb(data);
                            });
                        });
                    };

                    /**
                     * Obatins point separated field {{field}} from schema {{schema}}
                     * @param field
                     * @param schema
                     * @returns {*}
                     */
                    service.getFieldFromSchema = function (field, schema) {
                        if (schema[field]) {
                            return schema[field];
                        } else {
                            var elements = field.split('.');
                            var retElem;
                            for (var i in elements) {
                                if (retElem && retElem.properties) {
                                    retElem = retElem.properties[elements[i]];
                                } else if (retElem && retElem.ref && retElem.denormalize && retElem.denormalize.indexOf(elements[i]) > -1) {
                                    //Todo: Call api and resolve the model field
                                    var refSchema = service.getModel(retElem.ref);
                                    retElem = angular.copy(service.getFieldFromSchema(elements[i], refSchema.schema));
                                    if (retElem && retElem.title) {
                                        var index = field.lastIndexOf(".");
                                        retElem.title = common.prettifyTitle(field.substring(0, index) + '.' + retElem.title);
                                        //retElem.title = "A "+retElem.title;
                                    }
                                } else {
                                    retElem = schema[elements[i]];
                                }
                            }

                            return retElem;
                        }
                    };

                    angular.forEach(Object.keys(overrides), function (key) {
                        service[key] = overrides[key];
                    });

                    return service;
                }];
            }
        );
}());
(function () {
    'use strict';
    angular.module('injectorApp')
        .factory('selectCacheService', function () {
            return {
                TIMEOUT_MS: 750,
                timers: {},
                cache: {}
            };
        })
        .provider('selectCache', function () {
            this.$get = ['$rootScope', 'models', 'selectCacheService', function ($rootScope, models, selectCacheService) {
                var provider = {};

                $rootScope.$on('$routeChangeStart', function (event, next, current) {
                    if (next != current) {
                        selectCacheService.cache = {};
                        angular.forEach(Object.keys(selectCacheService.timers), function (m) {
                            clearTimeout(selectCacheService.timers[m]);
                            delete selectCacheService.timers[m];
                        });
                        //console.log("[SelectCache] CACHE CLEARED");
                    }
                });

                provider.search = function (modelName, b, shard, cb) {
                    var body = JSON.stringify(b);
                    //console.log("[SelectCache] POST FROM SELECT", modelName, b);

                    if (!selectCacheService.cache[modelName]) {
                        selectCacheService.cache[modelName] = {};
                    }

                    if (!selectCacheService.cache[modelName].posts) {
                        selectCacheService.cache[modelName].posts = {};
                    }

                    var cached = selectCacheService.cache[modelName].posts[body];
                    if (!cached) {//A new query
                        selectCacheService.cache[modelName].posts[body] = {}; //CALLBACKS
                        selectCacheService.cache[modelName].posts[body].cbks = [cb]; //CALLBACKS

                        //console.log("[SelectCache] >>>>>>>>>>>>>> HTTP POST", modelName, b);
                        models.search(modelName, b, shard, function (response, count) {
                            //console.log("[SelectCache] POST SELECT RESULT", modelName, b, {
                            //    count: count,
                            //    response: response
                            //});
                            selectCacheService.cache[modelName].posts[body].res = {
                                response: response,
                                count: count
                            };
                            angular.forEach(selectCacheService.cache[modelName].posts[body].cbks, function (cbk) {
                                cbk(response, count);
                            });
                            selectCacheService.cache[modelName].posts[body].cbks = [];
                        });

                    } else if (!cached.res && cached.cbks) {//Not finished query
                        cached.cbks.push(cb);
                        //console.log("[SelectCache] ADDED CB FOR POST", modelName, b);
                    } else { //Finished query
                        cached.cbks.push(cb);
                        angular.forEach(cached.cbks, function (cbk) {
                            //console.log("[SelectCache] CACHED POST", modelName, b, {
                            //    count: cached.res.count,
                            //    response: cached.res.response
                            //});
                            cbk(cached.res.response, cached.res.count);
                        });
                        cached.cbks = [];
                    }
                };

                provider.getDocument = function (modelName, id, shard, cb) {
                    //console.log("[SelectCache] GET FROM SELECT", modelName, id);

                    if (!selectCacheService.cache[modelName]) {
                        selectCacheService.cache[modelName] = {};
                    }

                    if (!selectCacheService.cache[modelName].gets) {
                        selectCacheService.cache[modelName].gets = {};
                    }

                    if (id) {
                        if (!selectCacheService.cache[modelName].gets[id]) {
                            selectCacheService.cache[modelName].gets[id] = {};
                        }

                        if (!selectCacheService.cache[modelName].gets[id].cbks) {
                            selectCacheService.cache[modelName].gets[id].cbks = [];
                        }

                        if (selectCacheService.cache[modelName].gets[id].result) {
                            //console.log("[SelectCache] CACHED VALUE", modelName, id, selectCacheService.cache[modelName].gets[id].result);
                            cb(selectCacheService.cache[modelName].gets[id].result);
                        } else if (selectCacheService.cache[modelName].gets[id].cbks.indexOf(cb) == -1) {
                            selectCacheService.cache[modelName].gets[id].cbks.push(cb);
                            //console.log("[SelectCache] ADDED CB FOR GET", modelName, id);

                            if (selectCacheService.timers[modelName]) {
                                clearTimeout(selectCacheService.timers[modelName]);
                            }

                            //TODO: Possible bug, ASYNC MODELNAME && SHARD !!!!!
                            selectCacheService.timers[modelName] = setTimeout(function(){
                                httpCall(modelName, shard);
                            }, selectCacheService.TIMEOUT_MS);
                        }
                    } else{
                        //WE HAVE TO RELEASE THE GETDOCUMENT CALLBACK!!!
                        cb();
                    }
                };

                function httpCall(model, shard) {
                    models.getModelConfig(model, function (cfg) {
                        var q = {};
                        if (shard && cfg.shard.shardKey) {
                            q[cfg.shard.shardKey] = shard;
                        }

                        var keys = Object.keys(selectCacheService.cache[model].gets);
                        if (keys.length == 1) {
                            q[cfg.id] = keys[0];
                        } else {
                            q.$or = [];
                            angular.forEach(keys, function (id) {
                                if (!selectCacheService.cache[model].gets[id].result) {
                                    var singleQ = {};
                                    singleQ[cfg.id] = id;
                                    q.$or.push(singleQ);
                                }
                            });
                        }

                        //console.log("[SelectCache] >>>>>>>>>>>>>> HTTP GETS", model, q);
                        models.search(model, {query: q}, function (result, count) {
                            //console.log("[SelectCache] GET SELECT RESULT", model, q, result);
                            angular.forEach(result, function (doc) {
                                var id = doc[cfg.id];
                                selectCacheService.cache[model].gets[id].result = doc;
                            });

                            angular.forEach(Object.keys(selectCacheService.cache[model].gets), function (idKey) {
                                var getObj = selectCacheService.cache[model].gets[idKey];
                                if (getObj.cbks) {
                                    angular.forEach(getObj.cbks, function (cb) {
                                        cb(getObj.result);
                                    });
                                    delete getObj.cbks;
                                }
                            });
                        });
                    });
                }

                return provider;
            }];
        });
}());
(function () {
    'use strict';
    angular.module('injectorApp')
        .factory('httpResponseInterceptor', ['$q', '$location', '$routeParams', 'flash', '$injector', 'configs', function ($q, $location, $routeParams, flash, $injector, configs) {

            return {
                response: function (response) {
                    //console.log(response);
                    if (response.headers("routeinjector") && (response.headers("routeinjector") !== configs.backoffice.version)) {
                        var ngDialog = $injector.get("ngDialog");
                        if (ngDialog.getOpenDialogs().length === 0) {
                            ngDialog.open({
                                template: "dialogVersionMismatch",
                                className: 'ngdialog-theme-default ngdialog-theme-custom'
                            });
                        }
                    }
                    if (response.status === 401) {
                        console.log("Response 401");
                    } else if (response.status === 201) {
                        flash.success("Done", "Document saved successfully");
                    }
                    return response || $q.when(response);
                },
                responseError: function (rejection) {

                    var models = $injector.get("models");

                    var modelName = $routeParams.schema;
                    var modelId = $routeParams.id;

                    var errorInReferencedProperty;
                    var prefix = configs.app.prefix;

                    if (modelName) {
                        models.getModelConfig(modelName, function (model) {
                            var path = "/" + model.path + "/" + modelId;
                            if (prefix) {
                                path = "/" + path;
                            }

                            errorInReferencedProperty = path !== rejection.config.url;
                            handleError(errorInReferencedProperty);

                        });
                    } else {
                        handleError(true);
                    }

                    function handleError(ignoreError) {
                        function redirectError() {
                            if ($location.url() != "/login" && $location.url() != "/logout" && $location.url() != "/") {
                                if ($routeParams.schema) {
                                    $location.path('/model/' + $routeParams.schema);
                                } else {
                                    $location.path('/');
                                }
                            }
                        }

                        if (rejection.status === 401) {
                            console.log("Response Error 401", rejection);
                            redirectError();

                            if ($location.url() != "/login") {
                                flash.error("Unauthorized", JSON.stringify(rejection.data));
                            }
                        } else if (rejection.status === 500) {
                            flash.error("Internal server error", JSON.stringify(rejection.data));
                        } else if (rejection.status === 400) {  //Client error
                            flash.error("Bad Request", JSON.stringify(rejection.data));
                        } else if (rejection.status === 404 && !ignoreError) {
                            redirectError();
                            flash.error("Not Found", JSON.stringify(rejection.data));
                        } else if (rejection.status === 404 && ignoreError) {
                            flash.warning("Property Not Found", JSON.stringify(rejection.data));
                        } else if (rejection.status === 403) {
                            if (rejection.data && rejection.data.errors) {
                                var errors = [];
                                angular.forEach(Object.keys(rejection.data.errors), function (e) {
                                    errors.push("<strong>" + e + "</strong> validation failed. Caused by: " + rejection.data.errors[e].message);
                                });
                                errors.splice(0, 0, "Validation Error " + rejection.status + "");
                                flash.error.apply(this, errors);
                            } else {
                                flash.error("Validation Error " + rejection.status + "", JSON.stringify(rejection.data));
                            }
                        } else if (Math.floor(rejection.status / 100) == 4 || Math.floor(rejection.status / 100) == 5) {
                            redirectError();
                            flash.error("Error " + rejection.status, JSON.stringify(rejection.data));
                        }
                    }

                    return $q.reject(rejection);
                }
            };
        }
        ])
        .config(['$httpProvider', function ($httpProvider) {
            //Http Interceptor to check failures
            $httpProvider.interceptors.push('httpResponseInterceptor');
        }]);
}());

//(function () {
//    'use strict';
//    angular.module('injectorApp')
//        .factory('flash', function ($rootScope) {
//            var queue = [];
//            var currentMessage = "";
//
//            $rootScope.$on("$routeChangeSuccess", function () {
//                currentMessage = queue.shift() || "";
//            });
//
//            return {
//                setMessage: function (message) {
//                    queue.push(message);
//                },
//                getMessage: function () {
//                    return currentMessage;
//                }
//            };
//        });
//}());
(function () {
    'use strict';
    angular.module('injectorApp')
        .factory('dependsOn', ['$http', 'configs', 'common', 'models', function ($http, configs, common, models) {
        var factory = {};

        factory.find = function (obj) {
            var depArr = [];
            function innerDependsOn(obj, index) {
                if (typeof obj == "object") {
                    $.each(obj, function (k, v) {
                        // k is either an array index or object key
                        if (k == 'dependsOn') {
                            depArr.push({
                                path: index,
                                field: v.field,
                                params: v.params,
                                func: v.func
                            });
                        }
                        if (!index) {
                            index = k;
                        }
                        else {
                            index = index + '.' + k;
                        }
                        innerDependsOn(v, index);
                        var indexArray = index.split('.');
                        indexArray.pop();
                        index = indexArray.join('.');
                    });
                }
                else {
                    var indexArray = index.split('.');
                    indexArray.pop();
                    index = indexArray.join('.');
                }
            }

            innerDependsOn(obj);
            return depArr;
        };

        factory.apply = function (scope, modelName, doc) {
            function updateFunc(modelConfig, dependsValue, arrayIndex) {
                return function(newVal, oldVal) {
                    if (newVal) {
                        //configs.getRoutesConfig(function (c) {
                            var url = configs.app.prefix + '/_' + modelConfig.path + '/' + dependsValue.func ;
                            var body = {};
                            angular.forEach(dependsValue.params, function (param) {
                                body[param]= safeAccess(doc, param);
                            });

                            /*if(arrayIndex !== undefined){ //TODO: I'm not sure...
                                url += '/' + arrayIndex;
                            }*/

                            $http.post(url, body).success(function (data) {
                                var replaced = dependsValue.path.replace(/properties\./g, '');

                                if(arrayIndex !== undefined){
                                    replaced = replaced.replace(/\.items/g, '[' + arrayIndex + ']');
                                }

                                common.setField(replaced, doc, data);
                            });
                        //});
                    }
                };
            }


            models.getModel(modelName, function (m) {
                var depArr = factory.find(m.schema);
                $.each(depArr, function (k, v) {
                    if ((/(this\.)/).test(v.field)) {
                        var path = v.path.replace(/properties\./g, '');
                        var root = path.split('.')[0];
                        var targetField = v.field.replace(/(this\.)/, "");

                        if ((/(items)/).test(path)) { //Is an array
                            scope.$watchCollection("model." + root, function (nV, oV) {
                                if (nV && nV instanceof Array) {
                                    for (var i in nV) {
                                        var normPath = root + "[" + i + "]." + targetField;
                                        for (var p in v.params) {
                                            v.params[p] = normPath;
                                        }
                                        scope.$watch("model." + normPath, updateFunc(m.config, angular.copy(v), angular.copy(i)));
                                    }
                                }
                            });
                        } else{ // Is an object
                            var normPath = root + "." + targetField;
                            scope.$watch('model' + '.' + normPath, updateFunc(m.config, angular.copy(v)));
                        }
                    } else {
                        scope.$watch('model' + '.' + v.field, updateFunc(m.config, v));
                    }
                });
            });
        };

        return factory;
    }]);
}());
(function () {
    'use strict';
    angular.module('injectorApp')
        .factory('common', ['$rootScope', function ($rootScope) {

            var factory = {};

            factory.hasAngularVariable = function (url) {
                return (/\{{(.*)\}}/).test(url);
            };

            factory.deAngularizeUrl = function (doc, url) {
                return url.replace(/\{{(.*)\}}/g, function (ng, matched) {

                    var f = factory.getField(matched, doc);
                    return f;
                });
            };

            factory.getAngularVariables = function (url) {
                return /\{{(.*)\}}/.exec(url)[1];
            };

            factory.prettifyTitle = function (title, separator) {
                title = title || "";
                separator = separator || ".";
                return title
                    // look for "."  user.age will be User -> Age
                    //TODO: Look for separator instead of "."
                    .replace(/(\.([a-z]|[A-Z]))/g, function (str) {
                        return " <i class='fa fa-angle-right'></i> " + str.replace(".", "").toUpperCase();
                    })
                    // insert a space before all caps
                    .replace(/([A-Z])/g, ' $1')
                    // uppercase the first character
                    .replace(/^./, function (str) {
                        return str.toUpperCase();
                    });
            };

            /**
             * Gets field value in point separated {{field}} from the model {{element}}. Also accepts [] notation.
             * @param field
             * @param element
             * @returns {*}
             */
            factory.getField = function (field, element) {
                if (element) {
                    var splitted = field.split('.');
                    if (splitted instanceof Array && splitted.length > 0) {
                        var ret = element;
                        var returnArray;
                        var parentArr;
                        for (var path in splitted) {

                            //Method for extrat array[].a fields or array[0].a fields.
                            if ((/(\[\d*\])/).test(splitted[path])) {
                                //Is an array !!!
                                var rootElem = splitted[path].replace(/(\[\d*\])/, "");
                                var index = splitted[path].match(/(\d*)(?=\])/)[0];

                                if (ret) {
                                    if (index) {
                                        ret = ret[rootElem][index];
                                    }
                                    else {
                                        parentArr = rootElem;
                                    }
                                }
                            } else {
                                if (parentArr) {
                                    var tmp = ret;
                                    returnArray = [];
                                    for (var elem in tmp[parentArr]) {
                                        returnArray.push(tmp[parentArr][elem][splitted[path]]);
                                    }
                                } else {
                                    if (ret) {
                                        ret = ret[splitted[path]];
                                    }
                                }
                            }
                        }
                        if (returnArray) {
                            return returnArray;
                        }
                        return ret;
                    } else {
                        return element[field];
                    }
                }
            };

            /**
             * Sets value {{value}} to model {{model}} in the point sepparated field {{field}}
             * @param field
             * @param model
             * @param value
             */
            factory.setField = function (field, model, value) {
                if (model) {
                    var splitted = field.split('.');
                    if (splitted instanceof Array && splitted.length > 0) {
                        var ref = model;
                        for (var i = 0; i < splitted.length; i++) {
                            var path = splitted[i];
                            if ((/(\[\d*\])/).test(path)) {
                                var rootElem = path.replace(/(\[\d*\])/, "");
                                var index = path.match(/(\d*)(?=\])/)[0];

                                var newPath;
                                if (index === undefined) {
                                    for (var arrInd in ref[rootElem]) {
                                        newPath = splitted[i + 1];
                                        factory.setField(newPath, ref[rootElem][arrInd], value);
                                    }
                                } else {
                                    newPath = splitted[i + 1];
                                    factory.setField(newPath, ref[rootElem][index], value);
                                }
                            } else {
                                if (i < splitted.length - 1) {
                                    if (!ref[path]) {
                                        ref[path] = {};
                                    }
                                    ref = ref[path];
                                } else {
                                    ref[path] = value;
                                }
                            }
                        }
                    }
                }
            };


            /**
             * Obatins point separated field {{field}} from schema {{schema}}
             * @param field
             * @param schema
             * @returns {*}
             */
            /*factory.getFieldFromSchema = function (field, schema) {
             if (schema[field]) {
             return schema[field];
             } else {
             var elements = field.split('.');
             var retElem;
             for (var i in elements) {
             if (retElem && retElem.properties) {
             retElem = retElem.properties[elements[i]];
             } else if (retElem && retElem.denormalize && retElem.denormalize.indexOf(elements[i]) > -1) {
             //Todo: Call api and resolve the model field
             var refSchema = models.getModel(retElem.ref);
             retElem = getFieldFromSchema(elements[i], refSchema.schema);
             } else {
             retElem = schema[elements[i]];
             }
             }
             return retElem;
             }
             };*/

            /**
             * Obtains all the keys of an schema (using {{separator}} as nested level indicator)
             * @param schema
             * @param separator
             * @returns {Array}
             */
            factory.getAllSchemaFields = function (schema, separator) {
                separator = separator || ".";
                var fields = [];

                function searchFields(obj, parent) {
                    var keys = Object.keys(obj);
                    angular.forEach(keys, function (k) {
                        if (obj[k].properties) {
                            searchFields(obj[k].properties, parent ? (parent + separator + k) : k);
                        } else if (obj[k].denormalize) {
                            angular.forEach(obj[k].denormalize, function (field) {
                                fields.push((parent ? (parent + separator) : "") + k + separator + field);
                            });
                        } else {
                            fields.push(parent ? (parent + separator + k) : k);
                        }
                    });
                }

                searchFields(schema);

                return fields;
            };

            /**
             * Process the form and returns the schema form for the schemaForm module
             * @param form
             * @param submitButtons
             * @returns {*|string[]}
             */
            factory.processForm = function (form, submitButtons) {
                var showSubmitButtons = (submitButtons === undefined || submitButtons);
                var innerForm;

                if (form && form.tabs) {
                    innerForm = innerForm || [];
                    innerForm.push({
                        "type": "tabs",
                        "tabs": form.tabs
                    });
                } else if (form && form.items) {
                    innerForm = form.items;
                }

                innerForm = innerForm || ["*"];

                //TODO: Keep this comment out to wait if someone complains of missing feature
                //if (showSubmitButtons) {
                //    var hasSubmitButton = false;
                //    angular.forEach(innerForm, function (item) {
                //        if (item.type == "submit") {
                //            hasSubmitButton = true;
                //        }
                //    });
                //
                //    if (!hasSubmitButton) {
                //        innerForm.push({
                //            type: "submit",
                //            title: "Save"
                //        });
                //    }
                //
                //}

                return innerForm;
            };

            factory.randomNumber = function () {
                return (new Date()).getTime();
            };

            factory.getRandomQuery = function () {
                return '?r=' + factory.randomNumber();
            };

            return factory;
        }]);
}());
(function () {
    'use strict';
    angular.module('injectorApp')
        .factory('search', ['$rootScope', 'models', function ($rootScope, models) {
            var query = {};

            return {
                setQuery: function (q) {
                    query.query = q;
                },
                clearQuery: function() {
                    this.setQuery({});
                },
                getQuery: function () {
                    return query.query;
                },
                setSortBy: function (sort) {
                    query.sortBy = sort;
                },
                addSortBy: function(field, asc) {
                    query.sortBy = {};
                    query.sortBy[field] = asc ? 1 : -1;
                },
                getSort: function(field) {
                    if(query.sortBy) {
                        return query.sortBy[field];
                    } else {
                        return undefined;
                    }
                },
                setSkip: function(skip){
                    query.skip = skip;
                },
                setLimit: function(limit){
                    query.limit = limit;
                },
                search: function (schema,  callback) {
                    models.search(schema, query, function (elements, count) {
                        callback(elements, count, null);
                    });
                },
                searchAndGroup: function(schema, callback) {
                    //TODO: Montar la query con grupos
                    //TODO: Volver al modelController y añadir una columna de grupo (p.ej. count)
                    //TODO: Pintar !!
                }
            };

        }]);
}());

(function () {
    'use strict';
    angular.module('injectorApp')
        .directive('sideMenu', function () {
            return {
                restrict: 'E',
                scope: false,
                templateUrl: 'html/side-menu.html',
                controller: ['$scope', '$routeParams', '$location', 'common', 'models', 'customMenu', '$window', '$rootScope', function ($scope, $routeParams, $location, common, models, customMenu, $window, $rootScope) {
                    $scope.common = common;

                    $scope.$on("$routeChangeStart", function (event, next, current) {
                        if (next.params.schema) {
                            $scope.actualSchema = next.params.schema;
                        }
                    });
                    $scope.isDisabled = false;
                    $scope.isOpen = false;

                    var render = function () {
                        $scope.sections = new Sections();

                        angular.forEach(customMenu, function (elem) {
                            $scope.sections.add(elem.section, elem.title, elem);
                        });

                        models.getModels(function (m) {
                            angular.forEach(m, function (schema) {
                                models.getModelConfig(schema, function (config) {
                                    if (config.isSingle) {
                                        models.getSingleModel(schema, function (doc) {
                                            if (doc) {
                                                config.clickTo = "model/" + schema + "/update/" + doc[config.id];
                                            } else {
                                                config.clickTo = "model/" + schema + "/new";
                                            }
                                        });
                                    } else {
                                        config.clickTo = "model/" + schema;
                                    }
                                    $scope.sections.add(config.section, schema, config);
                                });
                            });
                        });
                    };


                    render();
                    $rootScope.$on('invalidate', function () {
                        render();
                    });

                    $scope.openSection = function (section) {
                        $scope.actualSection = section;
                    };

                    $scope.click = function (section, name, conf) {
                        $scope.parentSchema = section;
                        $scope.actualSchema = name;
                        $scope.actualSection = section;
                        if (conf.clickTo) {
                            $location.path(conf.clickTo);
                        } else if (conf.url) {
                            $window.location.href = conf.url;
                        }
                    };

                    $scope.isInstanceOf = function (obj) {
                        return (obj instanceof Section);
                    };

                    $scope.debug = function (a, b) {
                        console.log(a, b);
                    };
                }]
            };
        });
}());

var Section = function () {
};
var Sections = function () {


    var menu = {};

    this.get = function () {
        return menu;
    };


    this.add = function (key, schema, config) {
        /**
         * Dot notation loop: http://stackoverflow.com/a/10253459/607354
         */
        var levels = key.split(".");
        var curLevel = menu;
        var i = 0;
        while (i < levels.length - 1) {
            if (typeof curLevel[levels[i]] === 'undefined') {
                curLevel[levels[i]] = new Section();
            }

            curLevel = curLevel[levels[i]];
            i++;
        }

        curLevel[levels[levels.length - 1]] = curLevel[levels[levels.length - 1]] || new Section();
        curLevel[levels[levels.length - 1]][schema] = config;
    };
};

(function () {
    'use strict';
    angular.module('injectorApp')
        .directive('scrollToItem', function () {
            return {
                restrict: 'A',
                scope: {
                    scrollTo: "@"
                },
                link: function (scope, $elm, attr) {

                    $elm.on('click', function () {
                        $('html,body').animate({scrollTop: $(scope.scrollTo).offset().top}, "slow");
                    });
                }
            };
        });
}());
(function () {
    'use strict';
    angular.module('injectorApp')
        .directive('compile', ['$compile', function($compile) {
        // directive factory creates a link function
        return function(scope, element, attrs) {
            scope.$watch(
                function(scope) {
                    // watch the 'compile' expression for changes
                    return scope.$eval(attrs.compile);
                },
                function(value) {
                    // when the 'compile' expression changes
                    // assign it into the current DOM
                    element.html(value);

                    // compile the new DOM and link it to the current
                    // scope.
                    // NOTE: we only compile .childNodes so that
                    // we don't get into infinite loop compiling ourselves
                    $compile(element.contents())(scope);
                }
            );
        };
    }]);
}());
(function () {
    'use strict';

    angular.module('injectorApp').directive('injectorPunchcard', ['$routeParams', 'models', function ($routeParams, models) {
        return {
            restrict: 'AE',
            scope: true,
            templateUrl: 'js/directives/injector-punchcard/injector-punchcard.html',
            link: function (scope, element, attrs, ngModel) {
                var modelName = $routeParams.schema;
                models.getGraph(modelName, attrs.graph, function(data){
                    scope.elements = Object.keys(data);
                    scope.selected = scope.elements[0];
                    scope.punchCardData = data[scope.selected];
                    scope.$watch('selected', function(selected){
                       scope.punchCardData = data[selected];
                    });
                });
            }
        };
    }]);
}());

(function () {
    'use strict';

    angular.module('injectorApp').directive('injectorBargraph', ['$routeParams', 'models', function ($routeParams, models) {
        return {
            restrict: 'AE',
            scope: true,
            templateUrl: 'js/directives/injector-bargraph/injector-bargraph.html',
            link: function (scope, element, attrs, ngModel) {

                var modelName = $routeParams.schema;
                models.getModelConfig(modelName, function (config) {
                    models.getGraph(modelName, attrs.graph, function (data) {

                        var graph = {};
                        for(var i in config.graphs){
                            var g = config.graphs[i];

                            if(g.title == attrs.graph){
                                graph = g;
                            }
                        }

                        scope.elements = Object.keys(data);
                        scope.selected = scope.elements[0];

                        if(graph.groupMode == "series"){
                            scope.selectEnabled = false;

                        } else if(graph.groupMode == "select"){
                            scope.selectEnabled = true;
                        } else{
                            console.error("Invalid configuration at bargraph group Mode:", graph.groupMode);
                        }

                        if (scope.selectEnabled === true) {
                            //GroupedBy with select2 !!
                            scope.barsData = [
                                {
                                    key: scope.selected,
                                    values: data[scope.selected]
                                }
                            ];

                            scope.$watch('selected', function (selected) {
                                if (scope.selectEnabled === true) {
                                    scope.barsData = [
                                        {
                                            key: selected,
                                            values: data[selected]
                                        }
                                    ];
                                }
                            });

                        } else {
                            //Grouped by in legend !
                            scope.barsData = [];
                            for (var key in data) {
                                scope.barsData.push(
                                    {
                                        key: key,
                                        values: data[key]
                                    });
                            }
                        }
                    });
                });
            }
        };
    }]);
}());

(function () {
    'use strict';
    angular.module('injectorApp').directive('modelButtons', ['$routeParams', '$http', '$q', '$route', 'models', '$location', function ($routeParams, $http, $q, $route, models, $location) {
        return {
            restrict: 'AE',
            scope: false, //Use the parent scope, in this case the modelController (this directive always will be loaded in the model page!)
            //If not, we should set scope to true and implement here all the functions
            templateUrl: 'js/directives/model-buttons/model-buttons.html',
            link: function (scope, element, attrs, ngModel) {
                scope.performAction = function (action) {
                    if (action.type && action.type == "form") {
                        //post as form
                        models.postAsForm(action.path, action.data, 'post');
                    } else if (action.type && action.type == "location") {
                        $location.path(action.location);
                    } else {
                        var req = {
                            method: action.method,
                            url: action.path,
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            data: action.data
                        };

                        $http(req);
                    }
                };

                function exportElements() {
                    var checked = scope.elements.filter(function (x) {
                        return x.checked;
                    });

                    if (checked && checked.length > 0) {
                        var query = {$or: []};
                        angular.forEach(checked, function (elem) {
                            query.$or.push({_id: elem._id});//We search by id
                        });
                        return query;
                    } else {
                        return scope.query;
                    }
                }

                scope.export = function exportModels(format) {
                    models.export(scope.schema, format, exportElements(), function (doc) {
                    });
                };


                scope.import = function importModels(format) {
                    console.log("IMPORT", format, scope.schema);
                    var file = "";
                    models.import(scope.schema, format, file, function (doc) {
                    });
                };

                scope.enableDelete = function () {
                    if (!scope.elements) {
                        return false;
                    }
                    var checkedValues = scope.elements.filter(function (val) {
                        return val.checked;
                    });

                    return checkedValues.length > 0;
                };

                scope.removeSelected = function removeSelected() {
                    var checkedValues = scope.elements.filter(function (val) {
                        return val.checked;
                    });

                    if (checkedValues.length > 0) {
                        scope.promptAlert(function (del) {
                            if (del) {
                                var deletions = [];
                                angular.forEach(checkedValues, function (element) {
                                    var deferred = $q.defer();
                                    deletions.push(deferred.promise);

                                    models.getModelConfig(scope.schema, function (cfg) {
                                        var shard;

                                        if (cfg.shard && cfg.shard.shardKey) {
                                            shard = element[cfg.shard.shardKey];
                                        }

                                        if (scope.isDisabled(element)) {
                                            models.removeDocumentByMongoId(scope.schema, element._id, shard, function (doc) {
                                                deferred.resolve();
                                            });
                                        } else {
                                            models.removeDocument(scope.schema, scope.id(element), shard, function (doc) {
                                                deferred.resolve();
                                            });
                                        }
                                    });
                                });
                                $q.all(deletions).then(function () {
                                    $route.reload();
                                });
                            }
                        });
                    }
                };
            }
        };
    }]);
}());

(function () {
    'use strict';

    angular.module('injectorApp')
        .directive('searchInModel', ['$routeParams', 'models', 'common', 'search', function ($routeParams, models, common, search) {
            return {
                restrict: 'AE',
                scope: false,
                templateUrl: 'js/directives/search-model/search-model.html',
                link: function (scope, element, attrs, ngModel) {
                    scope.searches = [];
                    scope.models = models;
                    var modelName = $routeParams.schema;


                    scope.buildPath = function (field, schema) {
                        var sc = models.getFieldFromSchema(field, schema);
                        var title;
                        if (sc && sc.title) {
                            var i = field.lastIndexOf(".");
                            if (i > -1 && sc.title.indexOf("<i") == -1) {//TODO: ÑAPA DE LAS GUAPAS, ESTO HAY QUE CAMBIARLO
                                title = common.prettifyTitle(field.substring(0, i) + '.' + sc.title);
                            } else {
                                title = sc.title;
                            }

                        } else {
                            title = common.prettifyTitle(field);
                        }

                        return title;
                    };

                    scope.updateSearch = function (elemSearch, field, noSearch) {
                        var index;
                        if (elemSearch.field) {
                            index = scope.availableFields.indexOf(elemSearch.field);
                            if (index == -1) {
                                scope.availableFields.push(elemSearch.field);
                            }
                        }

                        var fieldFromSchema = models.getFieldFromSchema(field, scope.schema);

                        elemSearch.title = fieldFromSchema.title;
                        elemSearch.field = field;
                        //elemSearch.placeholder = "Search in " + modelName + " by " + elemSearch.field;
                        elemSearch.placeholder = {modelName: modelName, field: elemSearch.field};
                        elemSearch.ref = (fieldFromSchema.ref && !fieldFromSchema.denormalize) ? fieldFromSchema.ref : undefined;

                        //console.log(elemSearch);

                        index = scope.availableFields.indexOf(field);
                        if (index > -1) {
                            scope.availableFields.splice(index, 1);
                        }

                        if (!noSearch) {
                            scope.search();
                        }
                    };

                    scope.addSearch = function (field) {
                        var s = {};
                        field = field || scope.availableFields[0];

                        s.clear = function () {
                            s.value = "";
                            scope.search();
                        };

                        s.remove = function () {

                            var index = scope.searches.indexOf(s);
                            if (index > -1) {
                                scope.searches.splice(index, 1);
                            }

                            index = scope.availableFields.indexOf(s.field);
                            if (index == -1) {
                                scope.availableFields.push(s.field);
                            }
                            scope.search();
                        };

                        scope.updateSearch(s, field, true);
                        scope.searches.push(s);
                    };

                    models.getModelSchema(modelName, function (schema) {
                        if (schema) {
                            scope.schema = schema;
                            scope.allFields = common.getAllSchemaFields(schema);
                            scope.availableFields = scope.allFields.filter(function (val) {
                                var f = models.getFieldFromSchema(val, schema);
                                return (f && f.format != "image" && f.format != "mixed");
                            });
                        }
                    });
                    models.getModelConfig(modelName, function (config) {
                        scope.addSearch(config.displayField);
                    });

                    /*scope.$on('$routeChangeSuccess', function (event, current, previous) {
                     searchFunc(current.params.schema);
                     });*/

                    //scope.newSearch = function () {
                    //    scope.addSearch(scope.availableFields[0]);
                    //};

                    scope.search = function () {
                        var query = {};

                        models.getModelSchema(modelName, function (schema) {
                            angular.forEach(scope.searches, function (s) {
                                var singleQuery = {};
                                if (s.value) {
                                    var sfield = models.getFieldFromSchema(s.field, schema);
                                    if (sfield) {
                                        if (sfield.type == "string" && !sfield.format && !sfield.ref) {
                                            if (s.value !== "") {
                                                singleQuery[s.field] = {$regex: s.value, $options: 'i'};
                                            }
                                        } else if (sfield.type == "string" && sfield.format == "date") {
                                            if (s.value !== "") {
                                                singleQuery[s.field] = s.value;
                                            }
                                        } else if (sfield.ref && !sfield.denormalize) {
                                            singleQuery[s.field] = s.value;
                                            //References may be we should load before some useful information for querying references
                                        } else if (sfield.ref && sfield.denormalize) {
                                            singleQuery[s.field] = {$regex: s.value, $options: 'i'};
                                        } else {
                                            singleQuery[s.field] = s.value;
                                        }
                                    }
                                }
                                angular.extend(query, singleQuery);
                            });
                        });

                        search.setQuery(query);
                        search.setSkip(0);
                        scope.$parent.search();

                    };
                }
            };
        }])
        .directive("searchRefInModel", ['models', 'common', function (models, common) {
            return {
                restrict: 'AE',
                scope: false,
                templateUrl: 'js/directives/search-model/search-ref-model.html',
                link: function (scope, element, attrs, ngModel) {
                    scope.elemsearch = scope.$eval(attrs.elemsearch);
                    var ref = scope.elemsearch.ref;

                    if (!element.select) {
                        return;
                    }

                    var displayField = "";
                    var idSelect = "";

                    function getDocumentById(modelId) {
                        return function (query, skip) {
                            return models.getModel(ref, function (m) {
                                var config = m.config;
                                var elem = "";
                                if (modelId instanceof Object) {
                                    elem = modelId[config.id];
                                } else {
                                    elem = modelId;
                                }
                                models.getDocument(ref, elem, function (doc) {
                                    displayField = config.displayField;
                                    idSelect = config.id;

                                    var q = {};
                                    q.query = {};
                                    var regex = query.search;
                                    q.query.$or = [];

                                    var forDisplay = {};
                                    forDisplay[displayField] = {$regex: regex, $options: 'i'};
                                    q.query.$or.push(forDisplay);


                                    if (config.id != "_id" && m.schema[config.id] && m.schema[config.id].type == "string") {
                                        var forID = {};
                                        forID[idSelect] = {$regex: regex, $options: 'i'};
                                        q.query.$or.push(forID);
                                    }

                                    q.limit = 20;
                                    q.skip = skip;

                                    //SHARDING
                                    if (models.getShard(ref)) {
                                        q[models.getShard(ref).key] = models.getShard(ref).value;
                                    }

                                    models.search(ref, q, function (response, count) {
                                        if (skip) {
                                            scope.searchRes = scope.searchRes.concat(response);
                                        } else {
                                            scope.searchRes = response;
                                        }

                                        if (doc) {
                                            var present = scope.searchRes.some(function (element) {
                                                return element[config.id] == doc[config.id];
                                            });

                                            if (!present) {
                                                scope.searchRes.splice(0, 0, doc);
                                            }
                                        }
                                    });
                                });
                            });
                        };
                    }

                    var elements = getDocumentById(scope.$eval(attrs.ngModel));

                    scope.disabled = false;
                    scope.searchEnabled = true;
                    scope.searchRes = [];
                    scope.search = elements;

                    scope.printSelectedElement = function (document) {
                        if (document) {
                            var f = common.getField(displayField, document);
                            if (f && f !== "" && f.length > 0) {
                                return f + " <" + document[idSelect] + ">";
                            } else {
                                return "No display field. ID: <" + document[idSelect] + ">";
                            }
                        }
                    };

                    scope.selectDisplayField = function (document) {
                        if (document) {
                            var f = common.getField(displayField, document);
                            if (f && f !== "" && f.length > 0) {
                                return f;
                            } else {
                                return "<empty>";
                            }
                        }
                    };

                    scope.selectIdField = function (document) {
                        if (document !== undefined) {
                            return document[idSelect] || "No ID";
                        }
                    };

                    scope.$on('refreshSelect2' + ref, function () {
                        console.log("REFRESH SELECT2");
                        elements();
                    });

                    element.find('ul').bind('scroll', function () {
                        var raw = arguments[0].target;
                        if (raw.scrollTop + raw.offsetHeight > raw.scrollHeight) {
                            elements(scope.$select, (raw.children[0].children.length - 2));
                        }
                    });

                }
            };
        }]);
}());

(function () {
    'use strict';
    angular.module('injectorApp').directive('ellipsis', function () {
        return {
            restrict: 'A',
            scope: true,
            link: function (scope, element, attrs, ngModel) {
                var width = element.width();
                element.css("width", width);
                element.css("text-overflow", 'ellipsis');
                element.css("overflow", 'hidden');
                element.css("white-space", 'nowrap');
                // Do calculation
                //var model = scope.$eval(attrs.ngModel);
                //console.log("Model", model);
                //console.log("Model > Length", model.width());
            }
        };
    });
}());
(function () {
    'use strict';
    angular.module('injectorApp')
        .directive(
            "mAppLoading",
            ['$animate', function ($animate) {
                // Return the directive configuration.
                return ({
                    link: link,
                    restrict: "C"
                });
                // I bind the JavaScript events to the scope.
                function link(scope, element, attributes) {
                    // Due to the way AngularJS prevents animation during the bootstrap
                    // of the application, we can't animate the top-level container; but,
                    // since we added "ngAnimateChildren", we can animated the inner
                    // container during this phase.
                    // --
                    // NOTE: Am using .eq(1) so that we don't animate the Style block.
                    $animate.leave(element.children().eq(1)).then(
                        function cleanupAfterAnimation() {
                            // Remove the root directive element.
                            element.remove();
                            // Clear the closed-over variable references.
                            scope = element = attributes = null;
                        }
                    );
                }
            }]
        );
}());
(function () {
    'use strict';

    angular.module('injectorApp')
        .controller('CreateController', ['$scope', '$http', '$location', '$routeParams', 'models', '$controller', function ($scope, $http, $location, $routeParams, models, $controller) {
            var modelName = $routeParams.schema;
            $scope.action = "create";
            models.getModel(modelName, function (m) {
                if (!m.config.post) {
                    $location.path('/model/' + modelName);
                } else {
                    $scope.model = {};
                    var m_copy = angular.copy(m);
                    $scope.m = m;
                    $scope.m_copy = m_copy;
                    $scope.action = "create";
                    $controller('FormController', {$scope: $scope}); //This works
                }
            });
        }]);
}());
(function () {
    'use strict';

    angular.module('injectorApp')
        .controller('GraphsController', ['$scope', '$routeParams', '$sce', '$compile', 'models', function ($scope, $routeParams, $sce, $compile, models) {
        $scope.schema = $routeParams.schema;

        models.getModelConfig($scope.schema, function (config) {
            $scope.config = config;
            $scope.graphs = config.graphs;
        });

        $scope.getTag = function (graph) {
            var tag = graph.type;
            return '<injector-'+ tag +' graph="' + graph.title + '"></injector-'+ tag +'>';
        };
    }]);
}());
(function () {
    'use strict';

    angular.module('injectorApp')
        .controller('UpdateController', ['$scope', '$http', '$routeParams', '$location', 'models', '$controller', function ($scope, $http, $routeParams, $location, models, $controller) {
            var modelName = $routeParams.schema;
            var id = $routeParams.id;
            var shard = $routeParams.shard;

            models.getModel(modelName, function (m) {
                models.getDocument(modelName, id, shard, function (document) {
                    $scope.prune(document);
                    $scope.action = "update";
                    $scope.model = document || {};
                    var m_copy = angular.copy(m);
                    $scope.m = m;
                    $scope.m_copy = m_copy;
                    $controller('FormController', {$scope: $scope}); //This works
                });
            });

            //We made this in client because is an specific management of angular-schema-form
            $scope.prune = function (document) {
                for (var key in document) {
                    var elem = document[key];
                    if (elem && (typeof elem === 'object' || elem instanceof Array)) {
                        $scope.prune(elem);
                    }
                    if (elem == null) {//Angular schema form does not allow null elements. Undefined is better
                        document[key] = undefined;
                    }
                }
            };
        }]);
}());

(function () {
    'use strict';

    angular.module('injectorApp')
        .controller('FormController', ['$rootScope', '$scope', '$http', '$location', '$routeParams', '$anchorScroll', '$timeout', '$modal', 'models', 'configs', 'dependsOn', 'common', '$window', 'flash', '$translate', function ($rootScope, $scope, $http, $location, $routeParams, $anchorScroll, $timeout, $modal, models, configs, dependsOn, common, $window, flash, $translate) {
            var modelName = $routeParams.schema;
            var id = $routeParams.id;
            var modified = false;

            $scope.buttonsPosition = configs.backoffice.buttonsPosition || 'bottom';

            function walkThroughSchema(schema) {
                var keys = Object.keys(schema);
                for (var i in keys) {
                    if(schema[keys[i]]) {
                        if (schema[keys[i]].editOnCreate) {
                            var action = $scope.action.toLowerCase();
                            schema[keys[i]].readonly = !(action === "create");
                        }

                        if (schema[keys[i]].i18nTitle) {
                            schema[keys[i]].title = $translate.instant(schema[keys[i]].i18nTitle);
                        }

                        var type = schema[keys[i]].type;
                        if ((type === 'array' || type === 'object') && schema[keys[i]].properties) {
                            walkThroughSchema(schema[keys[i]].properties);
                        }
                    }
                }
            }

            $scope.m = angular.copy($scope.m_copy);
            walkThroughSchema($scope.m.schema);

            $scope.schema = {
                "type": "object",
                "title": modelName,
                "action": $scope.action,
                "properties": $scope.m.schema
            };

            $scope.form = common.processForm($scope.m.config.form);

            if ($scope.action.toLowerCase() == "create" && models.getShard(modelName) && models.getShard(modelName).value) {
                $scope.model[models.getShard(modelName).key] = models.getShard(modelName).value;
            }

            $rootScope.$on('shardChangeEvent', function () {
                if ($scope.action.toLowerCase() == "create" && models.getShard(modelName) && models.getShard(modelName).value) {
                    $scope.model[models.getShard(modelName).key] = models.getShard(modelName).value;
                }
            });


            dependsOn.apply($scope, modelName, $scope.model);

            $timeout(function () {
                $scope.$watch('model', function (newVal, oldVal) {
                    if (!angular.equals(newVal, oldVal)) {
                        modified = true;
                    }
                }, true);
            }, 0);

            $scope.schemaHREF = function () {
                $location.path("/model/" + modelName);
                $location.hash('');
            };

            $scope.submitForm = function (form, model, isApply) {
                $scope.$broadcast('schemaFormValidate');
                if (form.$valid) {
                    if ($scope.action.toLowerCase() == 'update' && $scope.m.config.put) {
                        models.putDocument(modelName, id, model, function (response) {
                            if (response.status == '200') {
                                modified = false;
                                flash.success("Done", "Document saved successfully");
                                $scope.$broadcast('postedDocument', response.data);
                                $scope.$broadcast('puttedDocument', response.data);
                                if (!isApply) {
                                    $location.path('/model/' + modelName);
                                    $location.hash('');
                                }
                            }
                        });
                    } else if ($scope.action.toLowerCase() == 'create' && $scope.m.config.post) {
                        models.postDocument(modelName, model, function (response) {
                            if (response.status == '201') {
                                modified = false;
                                flash.success("Done", "Document saved successfully");
                                $scope.$broadcast('postedDocument', response.data);
                                if (!isApply) {
                                    $location.path('/model/' + modelName);
                                    $location.hash('');
                                } else {
                                    $location.path('/model/' + modelName + '/update/' + response.data[Object.keys(response.data)[0]]);
                                    $location.hash('');
                                }
                            }
                        });
                    }

                } else {
                    $scope.validation = !form.$valid;
                    $scope.validationErrors = form.$error;
                    $location.hash('error');
                    $anchorScroll.yOffset = 100;
                    $anchorScroll();

                }
            };

            $scope.cancel = function () {
                $window.history.back();
            };

            $scope.$on('$locationChangeStart', function (event, next, current) {
                if ($scope.ngForm.$valid && modified) {
                    event.preventDefault();

                    var modalInstance = $modal.open({
                        templateUrl: 'changedDocument.html',
                        controller: 'ModalChangedCtrl',
                        size: 'sm',
                        resolve: {
                            items: function () {
                                return $scope.items;
                            }
                        }
                    });

                    modalInstance.result.then(function () { //CLOSE CALLBACK
                        $scope.submitForm($scope.ngForm, $scope.model);
                    }, function () { //DISMISS CALLBACK
                        modified = false;
                        var basePathLength = $location.absUrl().length - $location.url().length;
                        $location.path(next.substring(basePathLength));
                    });

                }
            });


            $scope.$on('bkButton', function (event, form) {
                if (form.action == 'api') {
                    var http;
                    var url = form.url;

                    var getUrl = function (path) {
                        return path.replace(/[^/]*:([^/]*)+/g, function (s, m) {
                            return safeAccess($scope.model, m);
                        });
                    };

                    url = getUrl(url);

                    switch (form.method.toUpperCase()) {
                        case 'GET':
                            http = $http.get(url);
                            break;
                        case 'PUT':
                            http = $http.put(url, $scope.model);
                            break;
                        case 'POST':
                            var body = {};
                            if (form.body) {
                                angular.extend(body, form.body);
                            } else {
                                body = $scope.model;
                            }
                            http = $http.post(url, body);
                            break;
                        case 'DELETE':
                            http = $http.delete(url);
                            break;
                        default :
                            throw new Error('Method not configured properly');
                    }
                    if (http) {
                        http.success(function (res) {
                            angular.forEach(Object.keys(res), function (key) {
                                $scope.model[key] = res[key];
                            });
                        }).error(function (err) {
                            console.error(err);
                        });
                    }
                } else if (form.action == 'function') {
                    window[form.func]($scope.model, $scope.m.schema);
                }
            });

            $rootScope.$on('$translateChangeSuccess', function () {
                walkThroughSchema($scope.schema.properties);
                $scope.$broadcast('schemaFormRedraw');
            });
        }])
        // It is not the same as the $modal service used above.
        .controller('ModalChangedCtrl', ['$scope', '$modalInstance', 'items', function ($scope, $modalInstance, items) {

            $scope.ok = function () {
                $modalInstance.close('ok');
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }]);
}());

(function () {
    'use strict';
    angular.module('injectorApp')
        .controller('LoginController', ['$http', '$scope', '$document', '$location', 'loginProvider', function ($http, $scope, $document, $location, loginProvider) {
        $scope.update = function (user) {
            loginProvider.login(user, function (res) {
                if (!res) {
                    $scope.loginError = 'Incorrect username of password';
                } else{
                    $location.path('/');
                }
            });
        };
    }]);
}());
(function () {
    'use strict';
    angular.module('injectorApp')

        .filter('encodeURIComponent', function() {
            return window.encodeURIComponent;
        })

        .controller('MainController', ['$rootScope', '$scope', '$q', 'loginProvider', 'models', function ($rootScope, $scope, $q, loginProvider, models) {
            $scope.postLoginFuncs = [];
            //console.log($rootScope.$digestTtl);
            $scope.postLoginFuncs.push(function(){
                models.getModels(function (m) {
                    $scope.schemas = {};
                    angular.forEach(m, function (schema) {
                        models.getModelConfig(schema, function (config) {
                            $scope.schemas[schema] = config;
                            
                            loginProvider.getUser(function(){}); //Force first login
                            if (config.isSingle) {
                                models.getSingleModel(schema, function (doc) {
                                    if (!doc) {
                                        $scope.schemas[schema].redirectTo = "#/model/" + schema + "/new";
                                    } else {
                                        $scope.schemas[schema].redirectTo = "#/model/" + schema + "/update/" + doc[config.id];
                                    }
                                });
                            }
                        });
                    });
                });
            });


            $scope.schemaHREF = function (name, conf) {
                return conf.redirectTo || "#/model/" + name;
            };

            angular.element('body').ready(function () {
                $rootScope.$broadcast('bodyReady', 'MainController');
            });

            $rootScope.$on('login', function (event, args) {
                angular.forEach($scope.postLoginFuncs, function(v){
                    v();
                });
                $scope.postLoginFuncs = [];
            });

            $rootScope.$on('logout', function (event, args) {
            });
    }]);
}());



(function () {
    'use strict';
    angular.module('injectorApp')

        .controller('ModelController', ['$scope', '$http', '$route', '$routeParams', '$modal', '$location', 'common', 'models', 'flash', 'configs', 'search', function ($scope, $http, $route, $routeParams, $modal, $location, common, models, flash, configs, search) {
            var defaultItemsPerPage = 20;
            $scope.flash = flash;
            $scope.common = common;
            $scope.removeDisabled = 'disabled';

            $scope.maxSize = 10;
            $scope.schema = $routeParams.schema;
            $scope.create = false;
            $scope.checkedGroupIds = {};
            search.clearQuery();

            $scope.$watch("removeAll", function (value) {
                if (value !== undefined) {
                    for (var i in $scope.elements) {
                        $scope.elements[i].checked = value;
                    }
                }
            });

            models.getModel($scope.schema, function (model) {
                $scope.config = model.config;
                $scope.schemaForm = model.schema;

                if (model.config.isSingle) { //In single documents, this page / controller should not appear anymore !
                    $location.path('/');   //Redirect to home
                    return;
                }

                //Build the array with all the displayable elements
                $scope.config.allDisplayFields = [];
                $scope.config.allDisplayFields.push($scope.config.displayField);
                if ($scope.config.extraDisplayFields) {
                    $scope.config.allDisplayFields = $scope.config.allDisplayFields.concat($scope.config.extraDisplayFields);
                }

                $scope.search = function (skip) {
                    if (skip !== undefined) {
                        search.setSkip(skip);
                    }

                    search.search($scope.schema, function (elements, count, err) {
                        if (elements) {
                            $scope.elements = elements;
                        }
                        $scope.totalElements = count;
                    });
                };

                $scope.itemsPerPage = $scope.userItemsPerPage = configs.backoffice.itemsPerPage || defaultItemsPerPage;
                search.setLimit($scope.itemsPerPage);
                search.setSkip(0);

                //Init elements
                $scope.search();

                // Init function of pageChanged
                $scope.pageChanged = function () {
                    $scope.itemsPerPage = $scope.userItemsPerPage;
                    if ($scope.currentPage > 0 && $scope.itemsPerPage > 0) {
                        var skip = (($scope.currentPage - 1) * $scope.itemsPerPage);
                        search.setSkip(skip);
                    } else {
                        search.setSkip(0);
                    }
                    search.setLimit($scope.itemsPerPage);
                    $scope.search();
                };

                $scope.id = function (element) {
                    return element[$scope.config.id];
                };

                $scope.shard = function (element) {
                    return element[$scope.config.shard.shardKey];
                };

                $scope.hasShard = function (element) {
                    var hasShard = $scope.config.shard && $scope.config.shard.shardKey;
                    return hasShard && element[$scope.config.shard.shardKey];
                };

                $scope.getUrl = function (element, schema) {
                    var model;
                    if(element.__t) {
                        model = element.__t;
                    } else {
                        model = schema;
                    }
                    var url = "#/model/" + model + "/update/" + encodeURIComponent($scope.id(element));
                    if ($scope.hasShard(element)) {
                        url += "/" + encodeURIComponent($scope.shard(element));
                    }
                    return url;
                };

                $scope.isDisabled = function (element) {
                    return !(element[$scope.config.id] && element[$scope.config.id] !== "");
                };

                $scope.displayCustomField = function (field, element) {
                    var s = common.getField(field, element);
                    return (s === undefined || s === "") ? "<empty>" : s;
                };

                $scope.sortBy = function (property, asc) {
                    search.addSortBy(property, asc);
                    $scope.search(0);
                };

                $scope.getSort = function (property) {
                    return search.getSort(property);
                };

                $scope.$on('shardChangeEvent', function (event, data) {
                    $scope.search(0);
                });
            });

            $scope.promptAlert = function (cb) {
                var del;
                if (del) {
                    cb(del);
                }
                var modalInstance = $modal.open({
                    templateUrl: 'myModalContent.html',
                    controller: 'ModalInstanceCtrl',
                    size: 'sm',
                    resolve: {
                        items: function () {
                            return $scope.items;
                        }
                    }
                });

                modalInstance.result.then(function () {
                    del = true;
                    cb(true);
                });
            };
        }])

        .filter('to_trusted', ['$sce', function ($sce) {
            return function (text) {
                if (text) {
                    return $sce.trustAsHtml(text.toString());
                } else {
                    return text;
                }
            };
        }])

        // Please note that $modalInstance represents a modal window (instance) dependency.
        // It is not the same as the $modal service used above.
        .controller('ModalInstanceCtrl', ['$scope', '$modalInstance', 'items', function ($scope, $modalInstance, items) {

            $scope.ok = function () {
                $modalInstance.close('ok');
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }])

        .controller('ImportModalInstanceCtrl', ['$scope', '$modalInstance', 'items', function ($scope, $modalInstance, items) {
        }]);
}());

(function () {
    'use strict';

    angular.module('injectorApp')
        .controller('NavbarController', ['$scope', '$location', 'loginProvider', function ($scope, $location, loginProvider) {
            var navbar = function () {
                loginProvider.getUser(function (user) {
                    $scope.user = user;
                });
            };
            navbar();
            $scope.$on('login', function (event, data) {
                navbar();
            });

            $scope.logout = function () {
                loginProvider.logout();
                $location.path('/logout');
            };
        }]);
}());
(function () {
    'use strict';
    angular.module('injectorApp')

    .controller('ShardingController', ['$scope', '$routeParams', '$rootScope', 'models', 'configs', function ($scope, $routeParams, $rootScope, models, configs) {
        var modelName;
        $scope.$on('$routeChangeSuccess', function (event, current) {
            modelName = current.params.schema;

            /* JUAN: Continue here to implement sharding selector for custom pages
             if(modelName == undefined) {
                //ÑAPA para probar
                modelName = "Ingredient";
            }
            */

            if (modelName) {
                models.getModel(modelName, function (m) {
                    if (m.config.shard) {
                        $scope.shardKey = m.config.shard.shardKey;
                        $scope.shardKeyText = 'Select ' + $scope.shardKey + ' shard';
                        $scope.shardValues = m.config.shard.shardValues;

                        if (models.getShard(modelName)) {
                            $scope.shardKeyText = 'Using ' + models.getShard(modelName).key + ' ' + models.getShard(modelName).value;
                        } else {
                            if(m.config.shard.filtered){
                                $scope.locked = true;
                                $scope.setShard($scope.shardValues[0]);
                            } else {
                                $scope.locked = false;
                            }
                        }

                    } else {
                        $scope.shardKey = undefined;
                        $scope.shardKeyText = undefined;
                        $scope.shardValues = undefined;
                    }
                });
            } else {
                $scope.shardKey = undefined;
                $scope.shardKeyText = undefined;
                $scope.shardValues = undefined;
            }
        });

        $scope.setShard = function (value) {
            $scope.shardKeyText = 'Using ' + $scope.shardKey + ' ' + value;
            models.setShard($scope.shardKey, value, modelName);

            $rootScope.$broadcast('shardChangeEvent');
        };

        $scope.removeShard = function () {
            $scope.shardKeyText = 'Select ' + $scope.shardKey + ' shard';
            //models.setShard($scope.shardKey, '', modelName);
            models.removeShard(modelName);
            $rootScope.$broadcast('shardChangeEvent');
        };
        $scope.shardKey = undefined;
    }]);
}());

(function () {
    'use strict';

    angular.module('injectorApp')
        .controller('TranslateController', ['$scope', '$translate', 'configs', function ($scope, $translate, configs) {
            //$scope.languages = $translate.getAvailableLanguageKeys();
            $scope.languages = ['en', 'es'];
            if (configs.backoffice.uniqueLanguage) {
                $scope.showLanguages = false;
                $translate.use(configs.backoffice.uniqueLanguage);
            } else {
                $scope.showLanguages = true;
                $scope.use = function (lang) {
                    $translate.use(lang);
                };
            }
        }]);
}());