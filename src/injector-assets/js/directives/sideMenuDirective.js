(function () {
  'use strict';
  angular.module('injectorApp').directive('sideMenu', function () {
    return {
      restrict: 'E',
      scope: false,
      templateUrl: 'html/side-menu.html',
      controller: function (
        $scope,
        $routeParams,
        $location,
        common,
        models,
        customMenu,
        $window,
        $rootScope
      ) {
        $scope.common = common;
        $scope.$on('$routeChangeStart', function (event, next, current) {
          if (next.params.schema) {
            $scope.actualSchema = next.params.schema;
          }
        });
        $scope.isDisabled = false;
        $scope.isOpen = false;

        var render = function () {
          $scope.sections = new Sections();

          customMenu.getSections(function (sections) {
            angular.forEach(sections, function (elem) {
              $scope.sections.add(elem.section, elem.title, elem);
            });
          });

          if (models.isGalleryEnabled()) {
            $scope.sections.add('Gallery', 'Gallery', {
              clickTo: 'gallery',
            });
          }

          models.getModels(function (m) {
            angular.forEach(m, function (schema) {
              models.getModelConfig(schema, function (config) {
                if (!config.hideMenu) {
                  if (config.isSingle) {
                    models.getSingleModel(schema, function (doc) {
                      if (doc) {
                        config.clickTo =
                          'model/' + schema + '/update/' + doc[config.id];
                      } else {
                        config.clickTo = 'model/' + schema + '/new';
                      }
                    });
                  } else {
                    config.clickTo = 'model/' + schema;
                  }
                  var menuTitle = config.title || schema;
                  $scope.sections.add(config.section, menuTitle, config);
                }
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
          $scope.actualSection = conf.section || section;
          if (conf.clickTo) {
            $location.path(conf.clickTo);
          } else if (conf.url) {
            $window.location.href = conf.url;
          }

          $scope.isMenuCollapsed = true;
        };

        $scope.isInstanceOf = function (obj) {
          return obj instanceof Section;
        };

        $scope.debug = function (a, b) {
          console.log(a, b);
        };
      },
    };
  });
})();

var Section = function () {};
var Sections = function () {
  var menu = {};

  this.get = function () {
    return orderKeys(menu);
  };

  this.add = function (key, schema, config) {
    /**
     * Dot notation loop: http://stackoverflow.com/a/10253459/607354
     */
    var levels = key.split('.');
    var curLevel = menu;
    var i = 0;
    while (i < levels.length - 1) {
      if (typeof curLevel[levels[i]] === 'undefined') {
        curLevel[levels[i]] = new Section();
      }

      curLevel = curLevel[levels[i]];
      i++;
    }

    curLevel[levels[levels.length - 1]] =
      curLevel[levels[levels.length - 1]] || new Section();
    curLevel[levels[levels.length - 1]][schema] = config;
  };
};
function orderKeys(obj) {
  var keys = Object.keys(obj).sort(function keyOrder(k1, k2) {
    if (k1 < k2) return -1;
    else if (k1 > k2) return +1;
    else return 0;
  });

  var i,
    after = {};
  for (i = 0; i < keys.length; i++) {
    after[keys[i]] = obj[keys[i]];
    delete obj[keys[i]];
  }

  for (i = 0; i < keys.length; i++) {
    if (Object.keys(after[keys[i]]).length > 1) {
      obj[keys[i]] = orderKeys(after[keys[i]]);
    } else {
      obj[keys[i]] = after[keys[i]];
    }
  }
  return obj;
}
