"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.as_items = exports.as_options = exports.as_answers = exports.Option = exports.Answer = exports.Item = exports.CounterSet = exports.Counter = exports.Questionnaire = void 0;
var types_1 = require("./types");
var Questionnaire = /** @class */ (function () {
    function Questionnaire(props) {
        this._data = undefined;
        this.item_history = [];
        this.items = (0, exports.as_items)(props.items);
        this.onComplete = props.onComplete;
        this.counters = new CounterSet(this);
        if (!this.items.length)
            throw "Questionnaire requires at least one item";
        this.current_item = this.items[0];
    }
    Questionnaire.prototype.next_q = function () {
        var _a;
        if (typeof this.current_item === "undefined") {
            throw "Cannot process next_q for undefined current_item [".concat(this.item_history.map(function (i) { return i.id; }), "]");
        }
        // Process answer
        this.current_item.handleAnswer(this.current_item.last_changed_answer, this.current_item, this);
        this.item_history.push(this.current_item);
        var fails = this.current_item.find_issues(this);
        if (fails) {
            console.warn.apply(console, __spreadArray(["Cannot proceed for the following reasons:"], fails, false));
            return;
        }
        this.current_item = this.current_item.next_item((_a = this.current_item.last_changed_answer) === null || _a === void 0 ? void 0 : _a.content, this.current_item, this);
        if (!this.current_item)
            this.onComplete(this);
    };
    Questionnaire.prototype.last_q = function () {
        if (typeof this.current_item !== "undefined")
            this.current_item.answers.forEach(function (a) { return a.reset_content(); });
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
        set: function (content) {
            this._data = content;
        },
        enumerable: false,
        configurable: true
    });
    return Questionnaire;
}());
exports.Questionnaire = Questionnaire;
var Counter = /** @class */ (function () {
    function Counter(name, initial_content) {
        if (initial_content === void 0) { initial_content = 0; }
        this._operations = [];
        if (!name.length)
            throw "A Counter must have a name";
        this._name = name;
        this._initial_content = initial_content;
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
     * Register an Item's setting of the counter content
     */
    Counter.prototype.set_content = function (new_content, source) {
        this._operations.push({
            owner: source,
            operation: function () { return new_content; },
        });
    };
    Object.defineProperty(Counter.prototype, "content", {
        get: function () {
            var content = this._initial_content;
            this._operations.forEach(function (o) { return (content = o.operation(content)); });
            return content;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Register an Item's incrementing of the counter content
     */
    Counter.prototype.increment_content = function (increment, source) {
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
    CounterSet.prototype._create_counter = function (name, initial_content) {
        var counter = new Counter(name, initial_content);
        this.counters.push(counter);
        return counter;
    };
    /**
     * Return the content of a counter, or default_content if the counter
     * does not exist yet. If default_content is null and the counter
     * does not yet exist, throw an error.
     */
    CounterSet.prototype.get = function (name, default_content) {
        if (default_content === void 0) { default_content = null; }
        try {
            return this._find_counter(name).content;
        }
        catch (e) {
            if (default_content !== null)
                return default_content;
            throw e;
        }
    };
    /**
     * Register Item setting Counter to content
     */
    CounterSet.prototype.set = function (name, content, source) {
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
            counter = this._create_counter(name, content);
        }
        counter.set_content(content, source);
    };
    /**
     * Register Item incrementing Counter by content
     */
    CounterSet.prototype.increment = function (name, content, source) {
        if (content === void 0) { content = 1; }
        if (!source) {
            if (this._state.current_item)
                source = this._state.current_item;
            else
                throw "Cannot determine counter operation source";
        }
        var counter;
        try {
            counter = this._find_counter(name);
            counter.increment_content(content, source);
        }
        catch (e) {
            counter = this._create_counter(name, content);
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
        var _this = this;
        this.find_issues = function (state) {
            var fails = _this.answers
                .map(function (a) { return a.find_issues(_this, state); })
                .filter(function (s) { return typeof s === "string"; });
            return fails.length ? fails : false;
        };
        if (!props.id)
            throw "An Item must have an id";
        this.id = props.id;
        if (!props.question)
            throw "An Item must have a question";
        this.question = props.question;
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
                    this.getNextItemId = function (last_answer_content, current_item, state) {
                        if (!(current_item instanceof Item)) {
                            throw "Cannot determine next item from undefined item";
                        }
                        var i = state.items.indexOf(current_item);
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
        var answers = props.answers ? (0, exports.as_answers)(props.answers, this.id) : [];
        this.answers = answers instanceof Array ? answers : [answers];
    }
    Item.prototype.next_item = function (last_changed_answer, current_item, state) {
        var item_id = this.getNextItemId(last_changed_answer, current_item, state);
        if (item_id === null)
            return undefined;
        var item = state.items.find(function (i) { return i.id === item_id; });
        if (!item)
            throw "Cannot find next_item with id ".concat(item_id);
        return item;
    };
    Object.defineProperty(Item.prototype, "answer", {
        get: function () {
            if (this.answers.length !== 1)
                throw "Property 'answer' can only be used where answers.length === 1";
            return this.answers[0];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Item.prototype, "last_changed_answer", {
        get: function () {
            var first = null;
            var date = new Date(0);
            this.answers.forEach(function (a) {
                if (a.last_answer_utc_time && new Date(a.last_answer_utc_time) > date) {
                    first = a;
                    date = new Date(a.last_answer_utc_time);
                }
            });
            if (first)
                return first;
            return undefined;
        },
        enumerable: false,
        configurable: true
    });
    ;
    return Item;
}());
exports.Item = Item;
var Answer = /** @class */ (function () {
    function Answer(props, id) {
        var _this = this;
        this.content_history = [];
        this.find_issues = function (current_item, state) {
            return _this.check_answer_fun(_this, current_item, state);
        };
        for (var k in props) {
            if (!(k in ["content"]))
                this[k] = props[k];
        }
        if (!(typeof id === "string") || id === "")
            throw "An Answer must have an id";
        this.id = id;
        if (!props.type)
            throw "An Answer must specify a type";
        this.type = props.type;
        this._content = props.content || props.starting_content || undefined;
        if (props.extra_answers) {
            this.extra_answers = (0, exports.as_answers)(props.extra_answers, this.id);
        }
        if (props.options) {
            this.options = (0, exports.as_options)(props.options, this.id);
        }
        if (typeof props.default_content === "undefined")
            this.default_content = undefined;
        if (typeof props.check_answer_fun === "undefined")
            this.check_answer_fun = function () { return false; };
    }
    Object.defineProperty(Answer.prototype, "raw_content", {
        get: function () {
            if (this.content_changed)
                return this.content_history[this.content_history.length - 1].content;
            return undefined;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Answer.prototype, "content", {
        get: function () {
            if (!this.content_changed)
                return this.default_content;
            return this.content_history[this.content_history.length - 1].content;
        },
        set: function (v) {
            this.content_history.push({
                utc_time: new Date().toUTCString(),
                content: v,
                source: types_1.ContentChangeSource.User
            });
        },
        enumerable: false,
        configurable: true
    });
    Answer.prototype.reset_content = function () {
        this.content_history.push({
            utc_time: new Date().toUTCString(),
            content: this.default_content,
            source: types_1.ContentChangeSource.Reset
        });
    };
    Object.defineProperty(Answer.prototype, "content_changed", {
        get: function () {
            return this.content_history.length > 0;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Answer.prototype, "last_answer_utc_time", {
        get: function () {
            if (this.content_history.length)
                return this.content_history[this.content_history.length - 1].utc_time;
            return undefined;
        },
        enumerable: false,
        configurable: true
    });
    ;
    return Answer;
}());
exports.Answer = Answer;
var Option = /** @class */ (function () {
    function Option(props, id) {
        for (var k in props) {
            if (!(k in ["content"]))
                this[k] = props[k];
        }
        if (!(typeof id === "string") || id === "")
            throw "An Option must have an id";
        this.id = id;
        if (typeof props.content === "undefined") {
            if (typeof props.label !== "undefined")
                this.content = props.label;
            else
                throw "Cannot make unlabelled Option without specifying content.";
        }
        else
            this.content = props.content;
        if (props.extra_answers) {
            this.extra_answers = (0, exports.as_answers)(props.extra_answers, this.id);
        }
    }
    return Option;
}());
exports.Option = Option;
/**
 * Props should be Answer, AnswerProperties, or arrays with those contents.
 */
var as_answers = function (props, parent_id) {
    if (props instanceof Array) {
        return props.map(function (p, i) { return p instanceof Answer ? p : new Answer(p, "".concat(parent_id, "_a").concat(i)); });
    }
    else
        return [props instanceof Answer ? props : new Answer(props, "".concat(parent_id, "_a0"))];
};
exports.as_answers = as_answers;
/**
 * Props should be Option, OptionProperties, or arrays with those contents.
 */
var as_options = function (props, parent_id) {
    if (props instanceof Array) {
        return props.map(function (p, i) { return p instanceof Option ? p : new Option(p, "".concat(parent_id, "_o").concat(i)); });
    }
    else
        return [props instanceof Option ? props : new Option(props, "".concat(parent_id, "_o0"))];
};
exports.as_options = as_options;
/**
 * Props should be Item, ItemProperties, or arrays with those contents.
 */
var as_items = function (props) {
    if (props instanceof Array) {
        return props.map(function (p) { return p instanceof Item ? p : new Item(p); });
    }
    else
        return [props instanceof Item ? props : new Item(props)];
};
exports.as_items = as_items;
