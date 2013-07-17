/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var util = require("util");

var createErrorClasses = function(source, errors) {
    var errorClasses = {};
    
    for(var i=0; i<errors.length; i++) {
        
        var code = errors[i][0];
        var name = errors[i][1];
        var details = errors[i][2];
        
        var Err = function(source, code, name, details) {
            Error.call(this);
            this.source = source;
            this.code = code;
            this.name = name;
            this.details = details;
            this.cause = null;
        }
        
        util.inherits(Err, Error);
        
        var err = new Err(source, code, name, details);
        
        errorClasses[err.name] = function(cause) {
            err.cause = cause;
            return err;
        }
    }

    return errorClasses;
}

module.exports = function(source, errors) {
    return createErrorClasses(source, errors);
}