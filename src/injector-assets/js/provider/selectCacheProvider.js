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
            this.$get = function ($rootScope, models, selectCacheService) {
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
                    var mainKey = shard ? modelName + "_" + shard : modelName;

                    //console.log("[SelectCache] POST FROM SELECT", modelName, b);

                    if (!selectCacheService.cache[mainKey]) {
                        selectCacheService.cache[mainKey] = {};
                    }

                    if (!selectCacheService.cache[mainKey].posts) {
                        selectCacheService.cache[mainKey].posts = {};
                    }

                    var cached = selectCacheService.cache[mainKey].posts[body];
                    if (!cached) {//A new query
                        selectCacheService.cache[mainKey].posts[body] = {}; //CALLBACKS
                        selectCacheService.cache[mainKey].posts[body].cbks = [cb]; //CALLBACKS

                        //console.log("[SelectCache] >>>>>>>>>>>>>> HTTP POST", modelName, b);
                        models.search(modelName, b, shard, function (response, count) {
                            //console.log("[SelectCache] POST SELECT RESULT", modelName, b, {
                            //    count: count,
                            //    response: response
                            //});
                            selectCacheService.cache[mainKey].posts[body].res = {
                                response: response,
                                count: count
                            };
                            angular.forEach(selectCacheService.cache[mainKey].posts[body].cbks, function (cbk) {
                                cbk(response, count);
                            });
                            selectCacheService.cache[mainKey].posts[body].cbks = [];
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
                    var mainKey = shard ? modelName + "_" + shard : modelName;

                    if (!selectCacheService.cache[mainKey]) {
                        selectCacheService.cache[mainKey] = {};
                    }

                    if (!selectCacheService.cache[mainKey].gets) {
                        selectCacheService.cache[mainKey].gets = {};
                    }

                    if (id) {
                        if (!selectCacheService.cache[mainKey].gets[id]) {
                            selectCacheService.cache[mainKey].gets[id] = {};
                        }

                        if (!selectCacheService.cache[mainKey].gets[id].cbks) {
                            selectCacheService.cache[mainKey].gets[id].cbks = [];
                        }

                        if (selectCacheService.cache[mainKey].gets[id].result) {
                            //console.log("[SelectCache] CACHED VALUE", modelName, id, selectCacheService.cache[modelName].gets[id].result);
                            cb(selectCacheService.cache[mainKey].gets[id].result);
                        } else if (selectCacheService.cache[mainKey].gets[id].cbks.indexOf(cb) == -1) {
                            selectCacheService.cache[mainKey].gets[id].cbks.push(cb);
                            //console.log("[SelectCache] ADDED CB FOR GET", modelName, id);

                            if (selectCacheService.timers[mainKey]) {
                                clearTimeout(selectCacheService.timers[mainKey]);
                            }

                            //TODO: Possible bug, ASYNC MODELNAME && SHARD !!!!!
                            selectCacheService.timers[mainKey] = setTimeout(function(){
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
                        var mainKey = shard ? model + "_" + shard : model;

                        var q = {};
                        if (shard && cfg.shard && cfg.shard.shardKey) {
                            q[cfg.shard.shardKey] = shard;
                        }

                        var keys = Object.keys(selectCacheService.cache[mainKey].gets);
                        if (keys.length == 1) {
                            q[cfg.id] = keys[0];
                        } else {
                            q.$or = [];
                            angular.forEach(keys, function (id) {
                                if (!selectCacheService.cache[mainKey].gets[id].result) {
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

                                if (!selectCacheService.cache[mainKey].gets[id])
                                    selectCacheService.cache[mainKey].gets[id] = {};

                                selectCacheService.cache[mainKey].gets[id].result = doc;
                            });

                            angular.forEach(Object.keys(selectCacheService.cache[mainKey].gets), function (idKey) {
                                var getObj = selectCacheService.cache[mainKey].gets[idKey];
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
            };
        });
}());