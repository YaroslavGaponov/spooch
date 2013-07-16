
var util = require("util");
var errors = require("./errors.js");

var ArrayPlugin = module.exports.Plugin = function(options) {
    if (this instanceof ArrayPlugin) {
        this.options = options;
    } else {
        return new ArrayPlugin(options);
    }    
}

ArrayPlugin.prototype.onStart = function(storage) {
    this.storage = storage;
}

ArrayPlugin.prototype.onStop = function() {
}

ArrayPlugin.prototype.onRequest = function(method, paths, params, data, cb) {
    var self = this;
    
    switch(method) {
        
        case "GET":
            if (!paths || paths.length < 2) {
                return cb(errors.BadRequest("incorrect input data"));
            }
            
            self.storage.get(paths[1], function(err, res) {
                if (err) return cb(err, null);
                
                var arr = JSON.parse(res);
                if (!arr) {
                    return cb(null, null);                        
                }
                if (!util.isArray(arr)) {
                    return cb(errors.InternalError("incorrect data type"))
                }
                
                if (paths.length == 3) {
                    var index  = parseInt(paths.pop());
                    return cb(null, arr[index]);
                }
                return cb(null, arr);                        
            });
            
            break;
        
        case "POST":
            if (!paths || paths.length < 2 || !data) {
                return cb(errors.BadRequest("incorrect input data"));                        
            }
            
            self.storage.get(paths[1], function(err, res) {
                if (err) return cb(err, null);
                
                var arr = res ? JSON.parse(res) : [];
                if (!util.isArray(arr)) {
                    return cb(errors.InternalError("incorrect data type"))
                }
                
                arr.push(data);
                
                self.storage.set(paths[1], JSON.stringify(arr), function(err, res) {
                    return cb(err, {result: res}); 
                })
            });
            
            break;
        
        case "DELETE":
            if (!paths || paths.length < 2) {
                return cb(errors.BadRequest("incorrect input data"));                        
            }
            
            self.storage.get(paths[1], function(err, res) {
                if (err) return cb(err, null);
                
                var arr = JSON.parse(res);
                console.log(arr);
                if (!arr) {
                    return cb(errors.BadRequest("data is not found"));
                }
                if (!util.isArray(arr)) {
                    return cb(errors.InternalError("incorrect data type"))
                }
                
                if (paths.length > 2) {
                    var index  = parseInt(paths.pop());
                    var count = 1;
                    if (paths.length > 3) {
                        count  = index;
                        index = parseInt(paths.pop());
                    }
                    
                    arr.splice(index, count);
                    
                    self.storage.set(paths[1], JSON.stringify(arr), function(err, res) {
                        return cb(err, {result: res}); 
                    })
                } else {
                    self.storage.remove(paths[1], function(err, res) {
                        return cb(err, {result: res});
                    })                    
                }
            });
                
            break;
        
        default:
            return cb(errors.NotImplemented("method is not supported"));                        
    }    
}