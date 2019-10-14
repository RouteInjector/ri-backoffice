(function () {
    'use strict';
    angular.module('injectorApp').directive('modelButtons', ['$routeParams', '$http', '$q', '$route', 'models', '$location', '$rootScope', function ($routeParams, $http, $q, $route, models, $location, $rootScope) {
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

                        if (action.elements) {

                            var data = {
                                action: action.data, elements: scope.elements.filter(function (x) {
                                    return x.checked;
                                })
                            };

                        } else {
                            data = action.data;
                        }
                        console.log("Faig request!");
                        var req = {
                            method: action.method,
                            url: action.path,
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            data: data
                        };

                        $http(req).then(function (res) {

                            if (action.reload) {

                                window.location.reload();

                            }
                        });
                    }
                };

                function exportElements() {
                    var checked = scope.elements.filter(function (x) {
                        return x.checked;
                    });

                    if (checked && checked.length > 0) {
                        var query = { $or: [] };
                        angular.forEach(checked, function (elem) {
                            query.$or.push({ _id: elem._id });//We search by id
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
