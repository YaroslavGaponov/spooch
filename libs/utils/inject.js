/*
 * copyright (c) 2013 Yaroslav Gaponov <yaroslav.gaponov@gmail.com>
 */

var INJECT = Object.prototype.INJECT = "@INJECT";

Object.prototype.inject = function(name, value) {    
    if (this && this.hasOwnProperty(name) && (this[name] === INJECT)) {
        this[name] = value;
    }
    return this;
}