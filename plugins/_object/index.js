/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var errors = require("./errors.js");
var util = require("util");

var ObjectPlugin = module.exports.Plugin = function(options) {
    if (this instanceof ObjectPlugin) {
        this.options = options;
        this.logger = Object.INJECT;
    } else {
        return new ObjectPlugin(options);
    }    
}

ObjectPlugin.prototype.onStart = function(storage) {
    this.storage = storage;
    this.logger.info("spooch plugin [_object] is started.");
}

ObjectPlugin.prototype.onStop = function() {
    this.logger.info("spooch plugin [_object] is stoped.");
}

ObjectPlugin.prototype.onRequest = function(method, paths, params, data, cb) {
    var method = method.toLowerCase();
    if (this[method] && (typeof this[method] === "function")) {
        this[method](paths, params, data, cb);
    } else {    
        var err = util.format("spooch plugin [_object]: method %s is not supported", method);
        this.logger.error(err);
        cb(errors.NotImplemented(err));
    }
}


ObjectPlugin.prototype.get = function(paths, params, data, cb) {
    var self = this;
    
    if (!paths || paths.length < 1) {
        return cb(errors.BadRequest("incorrect input data"));
    }
    
    self.storage.get(paths[0], function(err, res) {
        if (err) return cb(err, null);
        
        var obj = JSON.parse(res);
        for(var i=1; i<paths.length; i++) {
            if (obj)  {
                obj = obj[paths[i]];
            } else {
                return cb(null, null);
            }
        }
        return cb(null, obj) ;                        
    });
    
}

ObjectPlugin.prototype.post = function(paths, params, data, cb) {
    var self = this;
    
    if (!paths || paths.length < 1 || !data) {
        return cb(errors.BadRequest("incorrect input data"));                        
    }
            
    self.storage.get(paths[0], function(err, res) {
        if (err) return cb(err, null);
        
        var obj = data;
        if (paths.length > 1) {
            var ref = obj = JSON.parse(res) || {}
            for(var i=1; i<paths.length-1;i++) {
                if (!ref[paths[i]]) {
                    ref[paths[i]] = {};
                } 
                ref = ref[paths[i]];                        
            }
            ref[paths.pop()] = data;                    
        }

        self.storage.set(paths[0], JSON.stringify(obj), function(err, res) {
            return cb(err, {result: res}); 
        })
    });
    
}

ObjectPlugin.prototype.delete = function(paths, params, data, cb) {
    var self = this;
    
    if (!paths || paths.length < 1) {
        return cb(errors.BadRequest("incorrect input data"));                        
    }
    
    self.storage.get(paths[0], function(err, res) {
        if (err) return cb(err, null);
        
        var obj = null;
        if (paths.length > 1) {
            var ref = obj = JSON.parse(res) || {}
            for(var i=1; i<paths.length-1; i++) {
                if (!ref[paths[i]]) {
                    ref[paths[i]] = {};
                } 
                ref = ref[paths[i]];                        
            }
            delete ref[paths.pop()];                    
        }

        if (obj) {
            self.storage.set(paths[0], JSON.stringify(obj), function(err, res) {
                return cb(err, {result: res}); 
            })
        } else {
            self.storage.remove(paths[0], function(err, res) {
                return cb(err, {result: res});
            })                    
        }
    });
}