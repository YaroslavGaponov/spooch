/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var util = require("util");
var fs = require("fs");

var LEVEL = module.exports.LEVEL = {
    ERROR: 1<<0, WARN: 1<<1, INFO: 1<<2, DEBUG: 1<<3, TRACE: 1<<4,    
    toString: function(level) {
        switch (level) {
            case this.ERROR:    return "ERROR";
            case this.WARN:     return "WARN ";
            case this.INFO:     return "INFO ";
            case this.DEBUG:    return "DEBUG";
            case this.TRACE:    return "TRACE";
        }        
    }
};

var Logger = module.exports.Logger = function(path, levels) {
    
    if (!(this instanceof Logger)) {
        return new Logger(path, levels);
    }
 
    this.levels = levels || (LEVEL.INFO | LEVEL.ERROR);    
    this.logfile = util.format("%s/log_%s.txt", path, new Date().toJSON());    
}


Logger.prototype.log = function(level, message) {
    if ((this.levels & level) === level) {
        var line = util.format("%s - [%s]   %s\n", new Date().toJSON(), LEVEL.toString(level), message);
        fs.appendFile(this.logfile, line);
    }
}

Logger.prototype.error = function(message) {
    this.log(LEVEL.ERROR, message);
}

Logger.prototype.warn = function(message) {
    this.log(LEVEL.WARN, message);
}

Logger.prototype.info = function(message) {
    this.log(LEVEL.INFO, message);
}

Logger.prototype.trace = function(message) {
    this.log(LEVEL.TRACE, message);
}

