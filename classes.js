"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Item = exports.CounterSet = exports.Counter = exports.Questionnaire = void 0;
var types_1 = require("./types");
var Questionnaire = /** @class */ (function () {
    function Questionnaire(props) {
        this._data = undefined;
        this.item_history = [];
        this.items = props.items;
        this.onComplete = props.onComplete;
        this.counters = new CounterSet(this);
        if (!this.items.length)
            throw "Questionnaire requires at least one item";
        this.current_item = this.items[0];
    }
    Questionnaire.prototype.next_q = function (ans) {
        if (typeof this.current_item === "undefined") {
            throw "Cannot process next_q for undefined current_item [".concat(this.item_history.map(function (i) { return i.id; }), "]");
        }
        // Process answer
        if (typeof ans === "undefined" &&
            this.current_item.type !== types_1.ItemType.NONE) {
            console.warn("Question ".concat(this.current_item.id, " must have an answer."));
            return;
        }
        this.current_item.answer = ans;
        this.current_item.answer_utc_time = new Date().toUTCString();
        this.current_item.handleAnswer(ans, this);
        this.item_history.push(this.current_item);
        this.current_item = this.current_item.next_item(ans, this);
        if (!this.current_item)
            this.onComplete(this);
    };
    Questionnaire.prototype.last_q = function () {
        if (typeof this.current_item !== "undefined")
            this.current_item.answer = undefined;
        var q = this.item_history.pop();
        if (!q) {
            console.warn("No history to go_back to.");
            return;
        }
        this.counters.revert(q);
        this.current_item = q;
    };
    Questionnaire.prototype.getItemById = function (id) {
        var _a;
        var item = this.items.find(function (i) { return i.id === id; });
        if (!item)
            throw "[".concat((_a = this.current_item) === null || _a === void 0 ? void 0 : _a.id, "] Cannot find item with id ").concat(id);
        return item;
    };
    Object.defineProperty(Questionnaire.prototype, "data", {
        get: function () {
            return this._data;
        },
        set: function (value) {
            this._data = value;
        },
        enumerable: false,
        configurable: true
    });
    return Questionnaire;
}());
exports.Questionnaire = Questionnaire;
var Counter = /** @class */ (function () {
    function Counter(name, initial_value) {
        if (initial_value === void 0) { initial_value = 0; }
        this._operations = [];
        if (!name.length)
            throw "A Counter must have a name";
        this._name = name;
        this._initial_value = initial_value;
    }
    Object.defineProperty(Counter.prototype, "name", {
        get: function () {
            return this._name;
        },
        set: function (s) {
            this._name = s;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Register an Item's setting of the counter value
     */
    Counter.prototype.set_value = function (new_value, source) {
        this._operations.push({
            owner: source,
            operation: function () { return new_value; },
        });
    };
    Object.defineProperty(Counter.prototype, "value", {
        get: function () {
            var value = this._initial_value;
            this._operations.forEach(function (o) { return (value = o.operation(value)); });
            return value;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Register an Item's incrementing of the counter value
     */
    Counter.prototype.increment_value = function (increment, source) {
        this._operations.push({
            owner: source,
            operation: function (x) { return x + increment; },
        });
    };
    /**
     * Remove all operations associated with an Item
     */
    Counter.prototype.revert = function (source) {
        this._operations = this._operations.filter(function (o) { return o.owner !== source; });
    };
    return Counter;
}());
exports.Counter = Counter;
var CounterSet = /** @class */ (function () {
    function CounterSet(state) {
        this.counters = [];
        this._state = state;
    }
    CounterSet.prototype._find_counter = function (name) {
        var counter = this.counters.find(function (c) { return c.name === name; });
        if (!counter)
            throw "No counter found named ".concat(name);
        return counter;
    };
    CounterSet.prototype._create_counter = function (name, initial_value) {
        var counter = new Counter(name, initial_value);
        this.counters.push(counter);
        return counter;
    };
    /**
     * Return the value of a counter, or default_value if the counter
     * does not exist yet. If default_value is null and the counter
     * does not yet exist, throw an error.
     */
    CounterSet.prototype.get = function (name, default_value) {
        if (default_value === void 0) { default_value = null; }
        try {
            return this._find_counter(name).value;
        }
        catch (e) {
            if (default_value !== null)
                return default_value;
            throw e;
        }
    };
    /**
     * Register Item setting Counter to Value
     */
    CounterSet.prototype.set = function (name, value, source) {
        if (!source) {
            if (this._state.current_item)
                source = this._state.current_item;
            else
                throw "Cannot determine counter operation source";
        }
        var counter;
        try {
            counter = this._find_counter(name);
        }
        catch (e) {
            counter = this._create_counter(name, value);
        }
        counter.set_value(value, source);
    };
    /**
     * Register Item incrementing Counter by Value
     */
    CounterSet.prototype.increment = function (name, value, source) {
        if (value === void 0) { value = 1; }
        if (!source) {
            if (this._state.current_item)
                source = this._state.current_item;
            else
                throw "Cannot determine counter operation source";
        }
        var counter;
        try {
            counter = this._find_counter(name);
            counter.increment_value(value, source);
        }
        catch (e) {
            counter = this._create_counter(name, value);
        }
    };
    /**
     * Remove all Item's actions for all counters
     */
    CounterSet.prototype.revert = function (source) {
        this.counters.forEach(function (c) { return c.revert(source); });
    };
    return CounterSet;
}());
exports.CounterSet = CounterSet;
var Item = /** @class */ (function () {
    function Item(props) {
        if (!props.id)
            throw "An Item must have an id";
        this.id = props.id;
        if (!props.question)
            throw "An Item must have a question";
        this.question = props.question;
        this.answer_options = props.answer_options || [];
        this.handleAnswer = props.process_answer_fun || function () { };
        if (typeof props.next_item === "undefined" &&
            typeof props.next_item_fun === "undefined")
            throw "No next item property or function declared for item ".concat(props.id);
        if (props.next_item_fun) {
            this.getNextItemId = props.next_item_fun;
            this.conditional_routing = true;
        }
        else {
            if (props.next_item === false) {
                // End the questionnaire
                this.getNextItemId = function () { return null; };
            }
            else {
                if (props.next_item === null || props.next_item === undefined) {
                    this.getNextItemId = function (ans, state) {
                        if (!(state.current_item instanceof Item)) {
                            throw "Cannot determine next item from undefined item";
                        }
                        var i = state.items.indexOf(state.current_item);
                        if (state.items.length <= i + 1) {
                            return null;
                        }
                        return state.items[i + 1].id;
                    };
                }
                else {
                    // null, undefined, and false are already removed
                    this.getNextItemId = function () { return props.next_item; };
                }
            }
            this.conditional_routing = false;
        }
    }
    Object.defineProperty(Item.prototype, "answer", {
        get: function () {
            return this._answer;
        },
        set: function (value) {
            this._answer = value;
        },
        enumerable: false,
        configurable: true
    });
    Item.prototype.next_item = function (ans, state) {
        var item_id = this.getNextItemId(ans, state);
        if (item_id === null)
            return undefined;
        var item = state.items.find(function (i) { return i.id === item_id; });
        if (!item)
            throw "Cannot find next_item with id ".concat(item_id);
        return item;
    };
    Object.defineProperty(Item.prototype, "type", {
        get: function () {
            if (!this.answer_options.length)
                return types_1.ItemType.NONE;
            var typesToStr = function (a) {
                if (typeof a === "undefined")
                    return "";
                if ("answer_type" in a)
                    return a.answer_type.toString();
                return "|".concat(a.map(function (x) { return typesToStr(x); }).join(','));
            };
            var types = typesToStr(this.answer_options[0]);
            for (var i = 1; i < this.answer_options.length; i++) {
                if (typesToStr(this.answer_options[i]) !== types)
                    return types_1.ItemType.COMPLEX;
            }
            if (!/\d/.test(types))
                throw "No types found in type scan of answer_options";
            // Check whether all entries are arrays/objects with same length and type
            var okay = true;
            var value = types_1.AnswerType.UNKNOWN;
            var length;
            types
                .replace(/^\|/, '')
                .split('|')
                .map(function (x) {
                return x.split(',').map(function (y) { return parseInt(y); });
            })
                .forEach(function (lst) {
                if (!okay)
                    return;
                var s = new Set(lst);
                if (typeof length === "undefined")
                    length = lst.length;
                if (value === types_1.AnswerType.UNKNOWN)
                    value = lst[0];
                okay = s.size === 1 && length === lst.length && value === lst[0];
            });
            if (okay)
                return value;
            return types_1.ItemType.COMPOSITE;
        },
        enumerable: false,
        configurable: true
    });
    return Item;
}());
exports.Item = Item;
