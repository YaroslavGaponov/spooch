
var util = require("util");

var ERRORS = [
    [1, 'BadRequest',       'The request cannot be fulfilled due to bad syntax.'],
    [2, 'InternalError',    'The server encountered an error.'],
    [3, 'NotImplemented',   'The method you are using to access the document can not be performed by the server.'],    
];


var createErrorClasses = function(e) {
    var errorClasses = {};
    
    for(var i=0; i<e.length; i++) {

        var code = e[i][0];
        var name = e[i][1];
        var details = e[i][2];
        
        var Err = function(code, name, details) {
            Error.call(this);
            this.code = code;
            this.name = name;
            this.details = details;
            this.cause = null;
        }
        
        util.inherits(Err, Error);
        
        var err = new Err(code, name, details);
        
        errorClasses[err.name] = function(cause) {
            err.cause = cause;
            return err;
        }
    }

    return errorClasses;
}

module.exports = createErrorClasses(ERRORS);