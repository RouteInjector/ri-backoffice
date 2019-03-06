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
                    
                    scope.updateSearch = function (elemSearch, field, noSearch) {
                        var index;
                        if (elemSearch.field) {
                            index = scope.availableFields.indexOf(elemSearch.field);
                            if (index == -1) {
                                scope.availableFields.push(elemSearch.field);
                            }
                        }

                        var fieldFromSchema = models.getFieldFromSchema(field, scope.schema);                        
                        if(fieldFromSchema) {                            
                            elemSearch.ref = (fieldFromSchema.ref && !fieldFromSchema.denormalize) ? fieldFromSchema.ref : undefined;
                        } else {                                                
                            elemSearch.ref = undefined;
                        }
                        elemSearch.title = models.getFieldTitle(field, scope.schema);                        
                        elemSearch.field = field;
                        elemSearch.placeholder = {modelName: modelName, field: elemSearch.field};
                        
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

                    function isHidden(f) {
                        if(!f) {
                            return true;
                        }
                        if(!f.class) {
                            return false;
                        }
                        if(f.class.split(' ').indexOf('hidden') < 0) {
                            return false
                        } else {
                            return true;
                        }
                    }

                    function hasToGenerateSearchField(f) {
                        if(isHidden(f)) {
                            return false;
                        }

                        if(f.type == 'array') {
                            if(f.items && f.items.type == 'string' && !f.items.format) {
                                return true;
                            }
                            if(f.items && f.items.type == 'object' && f.items.format=="available-search") {
                                return true;
                            }
                            else {
                                return false;
                            }
                        } if(f.type == 'object') {
                            if(f.format) {
                                return false;
                            } else {
                                return true;
                            }
                        } else {
                            return f.format != "image" && f.format != "mixed";
                        }

                    }

                    models.getModelSchema(modelName, function (schema) {
                        if (schema) {
                            scope.schema = schema;
                            scope.allFields = common.getAllSchemaFields(schema);
                            scope.availableFields = scope.allFields.filter(function (val) {
                                var f = models.getFieldFromSchema(val, schema);

                                if (!f) {
                                    console.log("WARNING: FIELD NOT FOUND WHEN GENERATING SEARCH FIELDS: ", val)
                                }

                                return hasToGenerateSearchField(f);
                            });
                        }

                        models.getModelConfig(modelName, function (config) {
                            scope.addSearch(config.displayField);

                            /* OLD BEHAVIOUR: filters available with searchable fields...
                            scope.availableFields = scope.availableFields.filter(function(val) {
                                if(config.searchableFields) {
                                    return !(config.searchableFields.indexOf(val) == -1);
                                } else {
                                    return true;
                                }
                            });
                            */
                            if(config.searchableFields) {
                                scope.availableFields = config.searchableFields;
                            }
                        });
                    });

                    /*scope.$on('$routeChangeSuccess', function (event, current, previous) {
                     searchFunc(current.params.schema);
                     });*/

                    //scope.newSearch = function () {
                    //    scope.addSearch(scope.availableFields[0]);
                    //};

                    /*** MONGO DATE PARSING **/
                    function parseMongoDate(txt) {
                        var result = {};
                        var dt = parseDateTimeRange(txt);

                        if(dt.err) {
                            return dt;
                        }

                        if(!dt.end) {
                            //CASE 0 1/12/15 convert year
                            updateYear(dt.start);
                            var d = dt.start;

                            if(d.day == undefined && d.month != undefined && d.year != undefined && d.hour == undefined) {
                                //CASE 4 12/2015 -> gte 1/12/2015 0:00:00 .. lt 1/1/2016 0:00:00
                                result["$gte"] = new Date(d.year,d.month-1,1,0,0,0,0);
                                result["$lt"]  = new Date(d.year,d.month,1,0,0,0,0);
                            } else if(d.day != undefined && d.month != undefined && d.year != undefined && d.hour == undefined) {
                                //CASE 1 1/12/2015 -> 1/12/2015 0:00:00 .. lt 2/12/2015 0:00:00
                                result["$gte"] = new Date(d.year,d.month-1,d.day,0,0,0,0);
                                result["$lt"] =  new Date(d.year,d.month-1,d.day+1,0,0,0,0);
                            } else if(d.day != undefined && d.month != undefined && d.year != undefined && d.hour != undefined) {
                                //CASE 2 1/12/2015 HH:MM -> gte 1/12/2015 HH:MM:00 .. lte 1/12/2015 HH:MM:59
                                //CASE 3 1/12/2015 HH:MM:SS
                                var sec1 = 0;
                                var sec2 = 59;
                                if(!isNaN(d.second)) {
                                    sec1 = d.second;
                                    sec2 = d.second;
                                }
                                result["$gte"] = new Date(d.year,d.month-1,d.day,d.hour,d.minute,sec1,0);
                                result["$lte"] = new Date(d.year,d.month-1,d.day,d.hour,d.minute,sec2,999);
                            } else {
                                result = {err: "format invalid"};
                            }
                        } else {
                            //CASE 0 1/12/15 convert year
                            updateYear(dt.start);
                            updateYear(dt.end);
                            var d1 = dt.start;
                            var d2 = dt.end;
                            var sec1 = 0;
                            var sec2 = 0;

                            if(d1.second != undefined) {
                                sec1 = d1.second;
                            }

                            if(d2.second != undefined) {
                                sec2 = d2.second;
                            }

                            if(d1.hour == undefined && d2.hour == undefined && d1.year != undefined && d2.year != undefined) {
                                // 1/2/90 - 2/2/90
                                result["$gte"] = new Date(d1.year,d1.month-1,d1.day,0,0,0,0);
                                result["$lte"] = new Date(d2.year,d2.month-1,d2.day,23,59,59,999);
                            } else if(d1.hour != undefined && d2.hour != undefined && d1.year != undefined && d2.year != undefined) {
                                // 1/2/90 H:M - 2/2/90 H:M
                                result["$gte"] = new Date(d1.year,d1.month-1,d1.day,d1.hour,d1.minute,sec1,0);
                                result["$lte"] = new Date(d2.year,d2.month-1,d2.day,d2.hour,d2.minute,sec2,999);
                            } else if(d1.hour != undefined && d2.hour != undefined && d1.year != undefined && d2.year == undefined) {
                                // 1/2/90 H:M - H:M
                                result["$gte"] = new Date(d1.year,d1.month-1,d1.day,d1.hour,d1.minute,sec1,0);
                                result["$lte"] = new Date(d1.year,d1.month-1,d1.day,d2.hour,d2.minute,sec2,999);
                            } else if(d1.hour != undefined && d2.hour == undefined && d1.year != undefined && d2.year != undefined) {
                                // 1/2/90 H:M - 2/2/90
                                result["$gte"] = new Date(d1.year,d1.month-1,d1.day,d1.hour,d1.minute,sec1,0);
                                result["$lte"] = new Date(d2.year,d2.month-1,d2.day,d1.hour,d1.minute,sec1,999);
                            } else {
                                result = {err: "format invalid"};
                            }
                        }
                        debugParse(result);
                        return result;
                    }

                    function updateYear(dt) {
                        var year = Number(dt.year);
                        if(year<100) {
                            if(year<46) {
                                year = 2000 + year;
                            } else {
                                year = 1900 + year;
                            }
                            dt.year = String(year);
                        }
                    }

                    function parseDateTimeRange(txt) {
                        var pieces = txt.split("-");
                        switch(pieces.length) {
                            case 1:
                                var d1 = parseDateTime(pieces[0].trim());
                                if(d1) {
                                    return {start: d1};
                                } else {
                                    return {err:"format invalid"};
                                }
                            case 2:
                                var d1 = parseDateTime(pieces[0].trim());
                                var d2 = parseDateTime(pieces[1].trim());
                                if(d1 && d2) {
                                    return {start: d1, end: d2};
                                } else {
                                    return {err:"format invalid"};
                                }
                            default:
                                return {err:"format invalid"};
                        }
                    }

                    function parseDateTime(dt) {
                        var pieces = dt.split(" ");
                        switch(pieces.length) {
                            case 1:
                                return parseDateOrTime(pieces[0].trim());
                            case 2:
                                var dt1 = parseDateOrTime(pieces[0].trim());
                                var dt2 = parseDateOrTime(pieces[1].trim());
                                if(!dt1 || !dt2) {
                                    return null;
                                } else {
                                    dt1.hour = dt2.hour;
                                    dt1.minute = dt2.minute;
                                    dt1.second = dt2.second;
                                    return dt1;
                                }
                            default:
                                return null;
                        }
                    }

                    function parseDateOrTime(dt) {
                        if(dt.indexOf(':')!=-1) {
                            return parseTime(dt);
                        } else if(dt.indexOf('/')!=-1) {
                            return parseDate(dt);
                        } else {
                            return null;
                        }
                    }

                    function Num(txt) {
                        if(txt==undefined) return undefined;
                        return Number(txt);
                    }

                    function parseTime(t) {
                        var regex = /^(\d?\d):(\d\d)(:(\d\d))?$/g
                        var result = regex.exec(t);
                        if(result) {
                            return {hour: Num(result[1]) , minute: Num(result[2]), second: Num(result[4])};
                        } else {
                            return null;
                        }
                    }

                    function parseDate(d) {
                        var regex = /^((\d?\d)\/)?(\d?\d)\/(\d{2,4})$/g
                        var result = regex.exec(d);
                        if(result) {
                            var o = {day: Num(result[2]) , month: Num(result[3]), year: Num(result[4])};
                            return o;
                        } else {
                            return null;
                        }
                    }

                    function debugParse(x) {
                        if(x["$gte"]) {
                            console.log("GTE", x["$gte"].toLocaleString("es-ES"));
                        }
                        if(x["$gt"]) {
                            console.log("GT ", x["$gt"].toLocaleString("es-ES"));
                        }
                        if(x["$lte"]) {
                            console.log("LTE", x["$lte"].toLocaleString("es-ES"));
                        }
                        if(x["$lt"]) {
                            console.log("LT ", x["$lt"].toLocaleString("es-ES"));
                        }
                        console.log("----------------------------------------");
                    }

                    /** END MONGO DATE PARSING ***/

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
                                            var q = parseMongoDate(s.value);

                                            if (s.value !== "") {
                                                if(q.err == undefined) {
                                                    singleQuery[s.field] = q;
                                                } else {
                                                    alert("Format invalid in field "+s.field);
                                                }
                                            }
                                        } else if (sfield.ref && !sfield.denormalize) {
                                            singleQuery[s.field] = s.value;
                                            // References may be loaded before we have some useful information for querying references
                                        } else if (sfield.ref && sfield.denormalize) {
                                            singleQuery[s.field] = {$regex: s.value, $options: 'i'};
                                        } else if(sfield.type == "array" && sfield.items && sfield.items.ref && sfield.items.denormalize && Array.isArray(sfield.items.denormalize)) {
                                            // This case allows to search for the first denormalized field inside an array of denormalized references
                                            singleQuery[s.field+"."+sfield.items.denormalize[0]] = {$regex: s.value, $options: 'i'};
                                        } else if(sfield.type == "array" && sfield.items && sfield.items.type == "string") {
                                            // This case allows to search inside grants
                                            singleQuery[s.field] = {$regex: s.value, $options: 'i'};
                                        } else {
                                            singleQuery[s.field] = s.value;
                                        }
                                    } else {
                                        // The field is listed on searchableFields BUT it is not on the schema.
                                        // Assume a string and believe on the programmer :)
                                        singleQuery[s.field] = singleQuery[s.field] = {$regex: s.value, $options: 'i'};                                
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
