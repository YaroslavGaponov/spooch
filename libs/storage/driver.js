/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var CONFIG = {
    CACHE: {
        SIZE: 1024,
        TYPE: "lru"
    },
    DRIVER: {
        TYPE: "htable"
    }
}

module.exports.create = function(filename) {
    
    var Cache = require("./cache/" + CONFIG.CACHE.TYPE);        
    var Driver = require("./drivers/" + CONFIG.DRIVER.TYPE);
    
    return new Driver(filename, new Cache(CONFIG.CACHE.SIZE));
}