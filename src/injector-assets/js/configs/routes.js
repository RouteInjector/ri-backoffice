(function () {
  'use strict';

  angular
    .module('injectorApp')
    .config(function ($routeProvider, configs, extensions, customMenuProvider) {
      var authCheck = function (
        $q,
        $rootScope,
        $location,
        $http,
        loginProvider,
        configs
      ) {
        var defer = $q.defer();
        if (configs.auth) {
          loginProvider.getUser(function (user) {
            if (!user) {
              $location.path('/login');
            } else {
              $http.defaults.headers.common.Authorization =
                'BEARER ' + user.token;
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

      var homePage = 'html/models.html';
      if (configs.backoffice.home) {
        homePage = configs.backoffice.home;
      }

      $routeProvider
        .when('/', {
          templateUrl: homePage,
          controller: 'MainController',
          resolve: {
            app: authCheck,
          },
        })
        .when('/model/:schema', {
          templateUrl: 'html/model.html',
          controller: 'ModelController',
          resolve: {
            app: authCheck,
          },
        })
        .when('/model/:schema/new', {
          templateUrl: 'html/create-and-update.html',
          controller: 'CreateController',
          resolve: {
            app: authCheck,
          },
          reloadOnSearch: false,
        })
        .when('/model/:schema/update/:id', {
          templateUrl: 'html/create-and-update.html',
          controller: 'UpdateController',
          resolve: {
            app: authCheck,
          },
          reloadOnSearch: false,
        })
        .when('/model/:schema/update/:id/:shard', {
          templateUrl: 'html/create-and-update.html',
          controller: 'UpdateController',
          resolve: {
            app: authCheck,
          },
          reloadOnSearch: false,
        })
        .when('/model/:schema/graphs', {
          templateUrl: 'html/graphs.html',
          controller: 'GraphsController',
          resolve: {
            app: authCheck,
          },
        })
        .when('/login', {
          // login / password
          templateUrl: 'html/login.html',
          controller: 'LoginController',
          resolve: {
            app: function ($q, $rootScope, $location, loginProvider) {
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
            },
          },
        })
        .when('/logout', {
          resolve: {
            app: function ($q, $rootScope, $location, loginProvider) {
              var defer = $q.defer();
              loginProvider.logout();
              $location.path('/');
              defer.resolve();
              return defer.promise;
            },
          },
        })
        .when('/settings', {
          templateUrl: 'html/settings.html',
          controller: 'SettingsController',
        });

      if (configs.images && configs.images.gallery) {
        $routeProvider.when('/gallery', {
          templateUrl: 'html/gallery.html',
          resolve: {
            app: authCheck,
          },
        });
      }

      if (extensions && extensions.pages) {
        var menu = [];
        for (var i in extensions.pages) {
          var page = extensions.pages[i];

          //Add the route for the custom page. modelName controls the sharding selector if given
          if (page.backoffice) {
            $routeProvider.when('/' + page.url, {
              templateUrl: page.template,
              controller: page.controller,
              resolve: {
                app: authCheck,
              },
              modelName: page.modelName,
            });
          }

          //TO-DO: 20-04-2021 -> hide custom pages from menu (user.role)
          if (page.menu) {
            if (page.menu.roles && Array.isArray(page.menu.roles)) {
              loginProvider.getUser(function (user) {
                if (user && user.role && page.menu.roles.includes(user.role)) {
                  menu.push(page.menu);
                }
              });
            } else {
              menu.push(page.menu);
            }
          }
        }
        customMenuProvider.setCustomMenu(menu);
      }

      $routeProvider.otherwise({ redirectTo: '/' });
    });
})();
