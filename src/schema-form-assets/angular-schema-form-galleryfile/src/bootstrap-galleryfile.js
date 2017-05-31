angular.module('schemaForm').config(
    ['schemaFormProvider', 'schemaFormDecoratorsProvider', 'sfPathProvider',
        function (schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {

            var file = function (name, schema, options) {
                if (schema.type === 'gallery' && schema.format === 'file') {
                    var f = schemaFormProvider.stdFormObj(name, schema, options);
                    f.key = options.path;
                    f.type = 'file';
                    f.index = 'arrayIndex';
                    f.path = schema.path;
                    options.lookup[sfPathProvider.stringify(options.path)] = f;
                    return f;
                }
            };

            if (!schemaFormProvider.defaults.gallery)
                schemaFormProvider.defaults.gallery = [];

            schemaFormProvider.defaults.gallery.unshift(file);

            //Add to the bootstrap directive
            schemaFormDecoratorsProvider.addMapping(
                'bootstrapDecorator',
                'file',
                'directives/decorators/bootstrap/galleryfile/galleryfile.html'
            );
            schemaFormDecoratorsProvider.createDirective(
                'file',
                'directives/decorators/bootstrap/galleryfile/galleryfile.html'
            );
        }
    ]);
