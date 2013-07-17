/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var Class = {
    Simple: "Simple",
    Array: "Array",    
    Object: "Object",    
    getClass : function(v) {
        if (typeof v !== "object") {
            return this.Simple;
        }
        if (Object.prototype.toString.call(v) === "[object Array]") {
            return this.Array;
        }
        return this.Object;
    }
}

var flatter = module.exports = function(delimiter) {
    delimiter = delimiter || ".";
    return function(paths, value, cb) {
            switch(Class.getClass(value)) {        
                case Class.Simple: 
                    cb(paths, value);
                    break;
                
                case Class.Object:
                    for(var name in value) {
                        obj2plain(paths + delimiter + name, value[name], cb);
                    }
                    break;
                case Class.Array:
                    for(var i=0; i<value.length; i++) {
                        obj2plain(paths, value[i], cb);
                    }
                    break;
            }    
        }
}
