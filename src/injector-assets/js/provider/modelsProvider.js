(function () {
  'use strict';

  angular.module('injectorApp').provider('models', function () {
    var overrides = {};
    var service = {};

    this.override = function (_method, _function) {
      overrides[_method] = _function;
    };

    this.getService = function () {
      return service;
    };

    this.$get = function (
      $rootScope,
      $http,
      $httpParamSerializer,
      Upload,
      configs,
      common
    ) {
      var modelsConfig = {};
      var singlesCache = {};
      var shards = {};
      var prefix = '';

      $rootScope.$on('logout', function () {
        service.invalidate();
      });

      $rootScope.$on('invalidate', function () {
        console.log('invalidate models provider');
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
            $http
              .get('/schema/' + modelName + '/formconfig')
              .then(function (config) {
                modelsConfig[modelName] = {};
                modelsConfig[modelName].schema = schema.data;
                modelsConfig[modelName].config = config.data;
                cb(modelsConfig[modelName]);
              });
          });
        } else if (!modelsConfig[modelName] && !cb) {
          var schema = JSON.parse(
            $.ajax({
              type: 'GET',
              url: '/schema/' + modelName,
              async: false,
            }).responseText
          );

          var config = JSON.parse(
            $.ajax({
              type: 'GET',
              url: '/schema/' + modelName + '/formconfig',
              async: false,
            }).responseText
          );

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
          var plural =
            data.config.plural || data.config.path + 's' || modelName + 's';
          var body = {
            skip: skip,
            limit: limit,
          };
          if (service.getShard(modelName)) {
            body[service.getShard(modelName).key] = service.getShard(
              modelName
            ).value;
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
          var path = data.config.path || modelName;
          $http
            .post(prefix + '/' + path, JSON.stringify(model))
            .then(function (response) {
              return cb(response);
            });
        });
      };

      service.getUrl = function (modelName, cb) {
        throw new Error('Not implemented');
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
          var path = data.config.path || modelName;
          var qParams = {
            params: {
              type: 'back',
            },
          };

          service.getModelConfig(modelName, function (cfg) {
            if (shard && cfg.shard && cfg.shard.shardKey) {
              qParams.params[cfg.shard.shardKey] = shard;
            } else if (service.getShard(modelName)) {
              qParams.params[
                service.getShard(modelName).key
              ] = service.getShard(modelName).value;
            }

            $http
              .get(prefix + '/' + path + '/' + id, qParams)
              .success(function (document) {
                return cb(document, null);
              })
              .error(function (data) {
                return cb(null, data);
              });
          });
        });
      };

      service.putDocument = function (modelName, id, model, cb) {
        service.getModel(modelName, function (data) {
          var path = data.config.path || modelName;
          $http
            .put(prefix + '/' + path + '/' + id, JSON.stringify(model))
            .then(function (document) {
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
          var path = cfg.path || modelName;

          var opts = { params: {} };

          if (shard && cfg.shard && cfg.shard.shardKey) {
            opts.params[cfg.shard.shardKey] = shard;
          } else if (service.getShard(modelName)) {
            opts.params[service.getShard(modelName).key] = service.getShard(
              modelName
            ).value;
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
          var path = data.config.path || modelName;

          var opts = {
            params: {
              type: 'raw',
            },
          };

          if (shard && cfg.shard && cfg.shard.shardKey) {
            opts.params[cfg.shard.shardKey] = shard;
          } else if (service.getShard(modelName)) {
            opts.params[service.getShard(modelName).key] = service.getShard(
              modelName
            ).value;
          }
          $http.delete(prefix + '/' + path + '/' + id, opts).then(cb);
        });
      };

      service.uploadToGallery = function (file, cb) {
        var path = service.getGalleryPath();
        Upload.upload({
          url: path,
          file: file,
          fileFormDataName: ['file[]'],
        })
          .progress(function (evt) {
            console.log(
              'percent: ' + parseInt((100.0 * evt.loaded) / evt.total)
            );
          })
          .success(function (data, status, headers, config) {
            cb(data);
          });
      };

      service.uploadImage = function (
        modelName,
        id,
        fieldName,
        index,
        image,
        cb
      ) {
        service.getModel(modelName, function (data) {
          var path = data.config.path || modelName;
          Upload.upload({
            url: prefix + '/' + path + '/' + id + '/' + fieldName, //upload.php script, node.js route, or servlet url
            data: { index: index },
            file: image,
            fileFormDataName: ['image'],
          })
            .progress(function (evt) {
              console.log(
                'percent: ' + parseInt((100.0 * evt.loaded) / evt.total)
              );
            })
            .success(function (data, status, headers, config) {
              cb(data);
            });
        });
      };

      service.uploadFile = function (
        modelName,
        id,
        fieldName,
        index,
        file,
        cb
      ) {
        service.getModel(modelName, function (data) {
          var path = data.config.path || modelName;
          Upload.upload({
            url: prefix + '/' + path + '/' + id + '/' + fieldName, //upload.php script, node.js route, or servlet url
            data: { index: index },
            file: file,
            fileFormDataName: ['file'],
          })
            .progress(function (evt) {
              console.log(
                'percent: ' + parseInt((100.0 * evt.loaded) / evt.total)
              );
            })
            .success(function (data, status, headers, config) {
              cb(data);
            });
        });
      };

      service.deleteImage = function (modelName, id, index, image, cb) {
        service.getModel(modelName, function (data) {
          var path = data.config.path || modelName;
          $http
            .delete(prefix + '/' + path + '/' + id + '/image/' + image)
            .then(cb);
        });
      };

      service.deleteFile = function (modelName, id, index, file, cb) {
        service.getModel(modelName, function (data) {
          var path = data.config.path || modelName;
          $http
            .delete(prefix + '/' + path + '/' + id + '/file/' + file)
            .then(cb);
        });
      };

      service.getImageUrl = function (modelName, id, imageName, cb) {
        service.getModel(modelName, function (data) {
          var path = data.config.path || modelName;
          var url =
            prefix +
            '/' +
            path +
            '/image/' +
            imageName +
            common.getRandomQuery();
          cb(url);
        });
      };

      service.getFileUrl = function (modelName, id, fileName, cb) {
        service.getModel(modelName, function (data) {
          var path = data.config.path || modelName;
          var url =
            prefix + '/' + path + '/file/' + fileName + common.getRandomQuery();
          cb(url);
        });
      };

      service.getSingleModel = function (modelName, cb) {
        if (singlesCache[modelName]) {
          cb(singlesCache[modelName]);
        } else {
          service.search(modelName, { skip: 0, limit: 1 }, function (
            elements,
            count
          ) {
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
          var path = config.plural || modelName;
          if (shard && config.shard && config.shard.shardKey) {
            query[config.shard.shardKey] = shard;
          } else if (service.getShard(modelName)) {
            query[service.getShard(modelName).key] = service.getShard(
              modelName
            ).value;
          }
          $http
            .post(prefix + '/' + path, JSON.stringify(query))
            .success(function (documents) {
              if (documents.status.search_count !== undefined) {
                cb(documents.result, documents.status.search_count);
              } else {
                cb(documents.result, documents.status.count);
              }
            });
        });
      };

      service.export = function (modelName, format, searchQuery, cb) {
        service.getModelConfig(modelName, function (config) {
          var query = {};
          var path = config.plural || modelName;
          if (service.getShard(modelName)) {
            query[service.getShard(modelName).key] = service.getShard(
              modelName
            ).value;
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
          var path = config.plural || modelName;
          if (service.getShard(modelName)) {
            query[service.getShard(modelName).key] = service.getShard(
              modelName
            ).value;
          }

          query.format = format;

          service.postAsForm(
            prefix + '/' + path + '/import',
            query,
            'POST',
            file
          );
          cb();
        });
      };

      service.postAsForm = function (path, params, method, file) {
        method = method || 'post'; // Set method to post by default if not specified.

        console.log('POST AS FORM', path, params, method, file);

        var info = common.parsePathParams(path);
        info.vars.token = $http.defaults.headers.common.Authorization.replace(
          'BEARER ',
          ''
        );

        // The rest of this code assumes you are not using a library.
        // It can be made less wordy if you use one.
        var form = document.createElement('form');
        form.setAttribute('method', method);
        form.setAttribute(
          'action',
          info.path + '?' + $httpParamSerializer(info.vars)
        );

        // Open result into a new tab/window:
        form.setAttribute('target', '_blank');

        for (var key in params) {
          if (params.hasOwnProperty(key)) {
            var hiddenField = document.createElement('input');
            hiddenField.setAttribute('type', 'hidden');
            hiddenField.setAttribute('name', key);
            if (typeof params[key] == 'object') {
              hiddenField.setAttribute('value', JSON.stringify(params[key]));
            } else {
              hiddenField.setAttribute('value', params[key]);
            }

            form.appendChild(hiddenField);
          }
        }

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
      };

      service.getGraph = function (modelName, graphID, cb) {
        service.getModelConfig(modelName, function (config) {
          var path = config.path || modelName;
          $http
            .post(prefix + '/' + path + '/graphs/' + encodeURI(graphID))
            .success(function (data) {
              cb(data);
            });
        });
      };

      service.galleryGetByPath = function (path, cb) {
        if (!service.isGalleryEnabled()) return;
        $http.get(service.getGalleryPath() + path).success(function (data) {
          cb(data);
        });
      };

      service.galleryDelete = function (path, cb) {
        if (!service.isGalleryEnabled()) return;
        $http.delete(path).success(function (data) {
          cb(data);
        });
      };

      service.galleryDeleteByPath = function (path, cb) {
        if (!service.isGalleryEnabled()) return;
        $http.delete(service.getGalleryPath() + path).success(function (data) {
          cb(data);
        });
      };

      service.galleryPostByPath = function (path, cb) {
        Upload.upload({
          url: service.getGalleryPath() + path,
          file: '',
          fileFormDataName: ['file[]'],
        }).success(function (data, status, headers, config) {
          cb(data);
        });
      };

      service.isGalleryEnabled = function (role) {

        if (role) {

          if (configs.images && configs.images.gallery && configs.images.gallery.menu && Array.isArray(configs.images.gallery.menu)) {

            return (
              configs.images &&
              configs.images.gallery &&
              configs.images.gallery.endpoint &&
              configs.images.gallery.menu.includes(role)
            );

          } else {

            return (
              configs.images &&
              configs.images.gallery &&
              configs.images.gallery.endpoint
            );

          };

        } else {

          return (
            configs.images &&
            configs.images.gallery &&
            configs.images.gallery.endpoint &&
            (!configs.images.gallery.menu || !configs.images.gallery.menu.length)
          );

        }
        
      };

      service.getGalleryPath = function () {
        var path = configs.images.gallery.endpoint;
        if (path[0] !== '/') path = '/' + path;
        if (path[path.length - 1] !== '/') path += '/';
        return prefix + path;
      };

      function fieldIsDenormalized(retElem, element) {
        var ret = null;

        // There is no denormalize field list
        if (!retElem || !retElem.denormalize) {
          return null;
        }

        // Look for the element as a string and return the position if found
        var i = retElem.denormalize.indexOf(element);
        if (i > -1) {
          return i;
        }

        // Look for the element as an object with target and source, return the position if found
        for (i = 0; i < retElem.denormalize.length; i++) {
          if (
            typeof retElem.denormalize[i] === 'object' &&
            retElem.denormalize[i].target == element
          ) {
            ret = i;
          }
        }
        return ret;
      }

      service.getFieldTitle = function (field, schema) {
        var i = field.indexOf('.');
        if (i == -1) {
          var sch = service.getFieldFromSchema(field, schema);
          if (sch && sch.title) {
            return sch.title;
          } else {
            return common.prettifyTitle(field);
          }
        } else {
          var f = field.substring(0, i);
          var sch = service.getFieldFromSchema(f, schema);
          var part1;
          var part2;

          if (sch && sch.title) {
            part1 = sch.title;
          } else {
            part1 = common.prettifyTitle(field);
          }

          var sch = service.getFieldFromSchema(field, schema);
          if (sch && sch.title) {
            part2 = sch.title;
          } else {
            part2 = common.prettifyTitle(field.substring(i + 1));
          }

          return part1 + ' > ' + part2;
        }
      };

      /**
       * Obtains point separated field {{field}} from schema {{schema}}
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
            var denormalizedFieldPosition = fieldIsDenormalized(
              retElem,
              elements[i]
            );

            if (retElem && retElem.properties) {
              retElem = retElem.properties[elements[i]];
            } else if (
              retElem &&
              retElem.ref &&
              denormalizedFieldPosition != null
            ) {
              var source;
              var target;

              var denormalizedField =
                retElem.denormalize[denormalizedFieldPosition];
              if (typeof denormalizedField === 'string') {
                source = denormalizedField;
                target = denormalizedField;
              } else {
                source = denormalizedField.source;
                target = denormalizedField.target;
              }

              var refSchema = service.getModel(retElem.ref);
              retElem = angular.copy(
                service.getFieldFromSchema(source, refSchema.schema)
              );
              if (retElem && retElem.title) {
                var index = field.lastIndexOf('.');
                retElem.title = common.prettifyTitle(
                  field.substring(0, index) + '.' + retElem.title
                );
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
    };
  });
})();
