(function () {
  'use strict';
  angular.module('injectorApp').provider('customMenu', function () {
    var menuElements;

    this.setCustomMenu = function (value) {
      menuElements = value;
    };

    this.$get = function (loginProvider) {
      return {
        getSections: function (cb) {
          loginProvider.getUser(function (user) {
            var filtered = [];

            if (user) {
              filtered = menuElements.filter(function (elem) {
                if (elem.roles && Array.isArray(elem.roles))
                  return elem.roles.includes(user.role);
                else return elem;
              });
            } else {
              filtered = menuElements.filter(function (elem) {
                return !!elem.roles;
              });
            }

            return cb(filtered);
          });
        },
      };
    };
  });
})();
