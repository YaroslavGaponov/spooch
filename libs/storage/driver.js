/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

module.exports.CONFIGS = {
    FILE_LRU: {
        CACHE: {
            SIZE: 1024,
            TYPE: "lru"
        },
        DRIVER: {
            TYPE: "htable"
        }
    },
    FILE_SLOT: {
        CACHE: {
            SIZE: 1024,
            TYPE: "slot"
        },
        DRIVER: {
            TYPE: "htable"
        }
    },
    MEMORY: {
        DRIVER: {
            TYPE: "memory"
        }
    }
};

module.exports.create = function(config, filename) {
    
    var Driver = require("./drivers/" + config.DRIVER.TYPE);
        
    if (config.CACHE) {    
        var Cache = require("./cache/" + config.CACHE.TYPE);                
        return new Driver(filename, new Cache(config.CACHE.SIZE));
    }
    
    return new Driver(filename);
}
