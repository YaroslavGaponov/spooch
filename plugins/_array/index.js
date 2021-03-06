/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var util = require("util");
var errors = require("./errors.js");

var ArrayPlugin = module.exports.Plugin = function(options) {
    if (this instanceof ArrayPlugin) {
        this.options = options;
        this.logger = Object.INJECT;
    } else {
        return new ArrayPlugin(options);
    }    
}

ArrayPlugin.prototype.onStart = function(storage) {
    this.storage = storage;
    this.logger.info("spooch plugin [_array] is started.");
}

ArrayPlugin.prototype.onStop = function() {
    this.logger.info("spooch plugin [_array] is stoped.");
}

ArrayPlugin.prototype.onRequest = function(method, paths, params, data, cb) {
    var method = method.toLowerCase();
    if (this[method] && (typeof this[method] === "function")) {
        this[method](paths, params, data, cb);
    } else {
        var err = util.format("spooch plugin [_array]: method %s is not supported", method);
        this.logger.error(err);
        cb(errors.NotImplemented(err));
    }
}

ArrayPlugin.prototype.get = function(paths, params, data, cb) {
    var self = this;
    
    if (!paths || paths.length < 1) {
        return cb(errors.BadRequest("incorrect input data"));
    }
    
    self.storage.get(paths[0], function(err, res) {
        if (err) return cb(err, null);
        
        var arr = JSON.parse(res);
        if (!arr) {
            return cb(null, null);                        
        }
        if (!util.isArray(arr)) {
            return cb(errors.InternalError("incorrect data type"));
        }
        
        switch (paths.length) {
            case 1: return cb(null, arr);
            case 2: return cb(null, arr[parseInt(paths.pop())]);
            default: return cb(errors.BadRequest("incorrect input data"));
        }
        
    });    
}

ArrayPlugin.prototype.post = function(paths, params, data, cb) {
    var self = this;
    
    if (!paths || paths.length < 1 || !data) {
        return cb(errors.BadRequest("incorrect input data"));                        
    }
    
    self.storage.get(paths[0], function(err, res) {
        if (err) return cb(err, null);
        
        var arr = res ? JSON.parse(res) : [];
        if (!util.isArray(arr)) {
            return cb(errors.InternalError("incorrect data type"))
        }
        
        arr.push(data);
        
        self.storage.set(paths[0], JSON.stringify(arr), function(err, res) {
            return cb(err, {result: res}); 
        })
    });    
}

ArrayPlugin.prototype.delete = function(paths, params, data, cb) {
    var self = this;
    
    if (!paths || paths.length < 1) {
        return cb(errors.BadRequest("incorrect input data"));                        
    }
    
    self.storage.get(paths[0], function(err, res) {
        if (err) return cb(err, null);
        
        var arr = JSON.parse(res);
        if (!arr) {
            return cb(errors.BadRequest("data is not found"));
        }
        if (!util.isArray(arr)) {
            return cb(errors.InternalError("incorrect data type"))
        }
        
        switch(paths.length) {
            case 1:
                self.storage.remove(paths[0], function(err, res) {
                    return cb(err, {result: res});
                });
                break;                        
            case 2:
                arr = arr.splice(parseInt(paths.pop()), 1);
                self.storage.set(paths[0], JSON.stringify(arr), function(err, res) {
                    return cb(err, {result: res}); 
                });
                break;
        }                
    });
}
