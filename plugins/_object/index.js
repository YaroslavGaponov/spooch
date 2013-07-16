
var errors = require("./errors.js");

var ObjectPlugin = module.exports.Plugin = function(options) {
    if (this instanceof ObjectPlugin) {
        this.options = options;
    } else {
        return new ObjectPlugin(options);
    }    
}

ObjectPlugin.prototype.onStart = function(storage) {
    this.storage = storage;
}

ObjectPlugin.prototype.onStop = function() {
}

ObjectPlugin.prototype.onRequest = function(method, paths, params, data, cb) {
    var self = this;
    
    switch(method) {
        
        case "GET":
            if (!paths || paths.length < 2) {
                return cb(errors.BadRequest("incorrect input data"));
            }
            
            self.storage.get(paths[1], function(err, res) {
                if (err) return cb(err, null);
                var obj = JSON.parse(res);
                for(var i=2; i<paths.length; i++) {
                    if (obj)  { obj = obj[paths[i]]; }                   
                }
                return cb(null, obj) ;                        
            });
            
            break;
        
        case "POST":
            if (!paths || paths.length < 2 || !data) {
                return cb(errors.BadRequest("incorrect input data"));                        
            }
            
            self.storage.get(paths[1], function(err, res) {
                if (err) return cb(err, null);
                
                var obj = data;
                if (paths.length > 2) {
                    var ref = obj = JSON.parse(res) || {}
                    for(var i=2; i<paths.length-1;i++) {
                        if (!ref[paths[i]]) {
                            ref[paths[i]] = {};
                        } 
                        ref = ref[paths[i]];                        
                    }
                    ref[paths.pop()] = data;                    
                }

                self.storage.set(paths[1], JSON.stringify(obj), function(err, res) {
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
                
                var obj = null;
                if (paths.length > 2) {
                    var ref = obj = JSON.parse(res) || {}
                    for(var i=2; i<paths.length-1;i++) {
                        if (!ref[paths[i]]) {
                            ref[paths[i]] = {};
                        } 
                        ref = ref[paths[i]];                        
                    }
                    delete ref[paths.pop()];                    
                }

                if (obj) {
                    self.storage.set(paths[1], JSON.stringify(obj), function(err, res) {
                        return cb(err, {result: res}); 
                    })
                } else {
                    self.storage.remove(paths[0], function(err, res) {
                        return cb(err, {result: res});
                    })                    
                }
            });
                
            break;
        
        default:
            return cb(errors.NotImplemented("method is not supported"));                        
    }    
}