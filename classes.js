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
exports.get_type_name = exports.as_items = exports.as_options = exports.as_answers = exports.Option = exports.Answer = exports.AnswerValidatorsWithProps = exports.AnswerValidators = exports.answer_validator = exports.ItemValidators = exports.ItemValidatorsWithProps = exports.item_validator = exports.Item = exports.CounterSet = exports.Counter = exports.Questionnaire = void 0;
var types_1 = require("./types");
var Questionnaire = /** @class */ (function () {
    function Questionnaire(props) {
        this._data = undefined;
        this.item_history = [];
        this.validation_issues = [];
        if (!props.name)
            throw "Questionnaire must have a name";
        this.name = props.name;
        if (!props.introduction)
            throw "Questionnaire must have a description";
        this.introduction = props.introduction;
        this.citation = typeof props.citation === "string" ? props.citation : "";
        this.version = typeof props.version === "string" ? props.version : "";
        this.items = (0, exports.as_items)(props.items);
        this.onComplete = props.onComplete;
        this.counters = new CounterSet(this);
        this.reset_items_on_back = !!props.reset_items_on_back;
        if (!this.items.length)
            throw "Questionnaire requires at least one item";
        this.current_item = this.items[0];
    }
    Questionnaire.prototype.next_q = function () {
        if (typeof this.current_item === "undefined") {
            throw "Cannot process next_q for undefined current_item [".concat(this.item_history.map(function (i) { return i.id; }), "]");
        }
        // Process answer
        this.current_item.handleAnswer(this.current_item.last_changed_answer, this.current_item, this);
        this.item_history.push(this.current_item);
        var fails = this.current_item.check_validation(this);
        if (fails.length) {
            console.warn.apply(console, __spreadArray(["Cannot proceed for the following reasons:"], fails, false));
            return;
        }
        this.current_item = this.current_item.next_item(this.current_item.last_changed_answer, this.current_item, this);
        if (!this.current_item)
            this.onComplete(this);
    };
    Questionnaire.prototype.last_q = function () {
        if (this.reset_items_on_back && typeof this.current_item !== "undefined")
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
    Object.defineProperty(Questionnaire.prototype, "next_item_in_sequence_id", {
        get: function () {
            if (!(this.current_item instanceof Item)) {
                throw "Cannot determine next item from undefined item";
            }
            var i = this.items.indexOf(this.current_item);
            if (this.items.length <= i + 1) {
                return null;
            }
            return this.items[i + 1].id;
        },
        enumerable: false,
        configurable: true
    });
    ;
    Questionnaire.prototype.check_validation = function () {
        var _this = this;
        var errors = [];
        this.items.forEach(function (i) { return errors.push.apply(errors, i.check_validation(_this)); });
        this.validation_issues = errors;
        return this.validation_issues;
    };
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
        this.validators = [];
        this.own_validation_issues = [];
        this.validation_issues = [];
        if (!props.id)
            throw "An Item must have an id";
        this.id = props.id;
        if (!props.question)
            throw "An Item must have a question";
        this.question = props.question;
        this.validators = props.validators || [];
        this.handleAnswer = props.process_answer_fun || function () { };
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
                    this.getNextItemId = function (last_changed_answer, current_item, state) { return state.next_item_in_sequence_id; };
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
            var last = null;
            var date = new Date(0);
            this.answers.forEach(function (a) {
                if (a.last_answer_utc_time && new Date(a.last_answer_utc_time) > date) {
                    last = a;
                    date = new Date(a.last_answer_utc_time);
                }
            });
            if (last)
                return last;
            return undefined;
        },
        enumerable: false,
        configurable: true
    });
    ;
    Item.prototype.check_validation = function (state, include_children) {
        var _this = this;
        if (include_children === void 0) { include_children = true; }
        state.validation_issues = state.validation_issues.filter(function (e) { return !("item_id" in e) || e.item_id !== _this.id; });
        this.validation_issues = this.validation_issues.filter(function (e) { return !("item_id" in e) || e.item_id !== _this.id; });
        this.own_validation_issues = [];
        this.validators.forEach(function (v) {
            var issue = v(_this, state);
            if (issue)
                _this.own_validation_issues.push(issue);
        });
        if (!include_children)
            return this.own_validation_issues;
        var errors = __spreadArray([], this.own_validation_issues, true);
        this.answers.forEach(function (a) { return errors.push.apply(errors, a.check_validation(_this, state, true)); });
        this.validation_issues = errors;
        return this.validation_issues;
    };
    Object.defineProperty(Item.prototype, "as_rows", {
        get: function () {
            var rows = [];
            this.answers.forEach(function (a) {
                var r = a.to_row(true);
                if (r instanceof Array)
                    rows.push.apply(rows, r);
                else
                    rows.push(r);
            });
            return rows;
        },
        enumerable: false,
        configurable: true
    });
    ;
    return Item;
}());
exports.Item = Item;
var item_validator = function (fn, level) {
    if (level === void 0) { level = types_1.ValidationIssueLevel.ERROR; }
    return function (item, state) {
        var s = fn(item, state);
        if (typeof s === "string")
            return {
                item_id: item.id,
                level: level,
                issue: s,
                validator: fn,
                last_checked_utc_time: new Date().toUTCString(),
            };
        return null;
    };
};
exports.item_validator = item_validator;
exports.ItemValidatorsWithProps = {
    REQUIRED: function (include_extra_answers) { return (0, exports.item_validator)(function (item) {
        var extras = function (ans) {
            for (var e = 0; e < ans.extra_answers.length; e++) {
                if (typeof ans.extra_answers[e].raw_content !== "undefined")
                    return true;
                if (extras(ans.extra_answers[e]))
                    return true;
            }
            return false;
        };
        for (var i = 0; i < item.answers.length; i++) {
            var ans = item.answers[i];
            if (typeof ans.raw_content !== "undefined")
                return null;
            if (include_extra_answers && extras(ans))
                return null;
        }
        return "At least one answer is required";
    }); }
};
exports.ItemValidators = {
    REQUIRED: exports.ItemValidatorsWithProps.REQUIRED(false),
};
var answer_validator = function (fn, level) {
    if (level === void 0) { level = types_1.ValidationIssueLevel.ERROR; }
    return function (ans, item, state) {
        var s = fn(ans, item, state);
        if (typeof s === "string")
            return {
                answer_id: ans.id,
                level: level,
                issue: s,
                validator: fn,
                last_checked_utc_time: new Date().toUTCString(),
            };
        return null;
    };
};
exports.answer_validator = answer_validator;
exports.AnswerValidators = {
    REQUIRED: (0, exports.answer_validator)(function (ans) {
        if (!ans.content_changed)
            return "An answer is required";
        if (typeof ans.content === "undefined")
            return "Answer cannot be blank";
        return null;
    }),
    NOT_BLANK: (0, exports.answer_validator)(function (ans) {
        if (typeof ans.content === "undefined")
            return "Answer cannot be blank";
        return null;
    })
};
exports.AnswerValidatorsWithProps = {
    OF_TYPE: function (t) { return (0, exports.answer_validator)(function (ans) {
        if (typeof ans.content !== t)
            return "Answer must be a ".concat(t);
        return null;
    }); },
    GT: function (x) { return (0, exports.answer_validator)(function (ans) {
        try {
            if (ans.content > x)
                return null;
        }
        catch (e) {
            console.error({ validation_error: "Validation error [GT]", x: x, error: e });
        }
        return "Answer must be greater than ".concat(x);
    }); },
    GTE: function (x) { return (0, exports.answer_validator)(function (ans) {
        try {
            if (ans.content >= x)
                return null;
        }
        catch (e) {
            console.error({ validation_error: "Validation error [GTE]", x: x, error: e });
        }
        return "Answer must be ".concat(x, " or larger");
    }); },
    LT: function (x) { return (0, exports.answer_validator)(function (ans) {
        try {
            if (ans.content < x)
                return null;
        }
        catch (e) {
            console.error({ validation_error: "Validation error [LT]", x: x, error: e });
        }
        return "Answer must be less than ".concat(x);
    }); },
    LTE: function (x) { return (0, exports.answer_validator)(function (ans) {
        try {
            if (ans.content <= x)
                return null;
        }
        catch (e) {
            console.error({ validation_error: "Validation error [LTE]", x: x, error: e });
        }
        return "Answer must be ".concat(x, " or smaller");
    }); },
};
var Answer = /** @class */ (function () {
    function Answer(props, id) {
        var _this = this;
        this.content_history = [];
        this.validation_issues = [];
        this.own_validation_issues = [];
        this.to_row = function (include_children) {
            if (include_children === void 0) { include_children = true; }
            if (_this.to_row_fun)
                return _this.to_row_fun(_this, include_children);
            var out = {
                id: _this.id,
                data_id: _this.data_id || _this.id,
                type: (0, exports.get_type_name)(_this.type),
                content: undefined,
                label: undefined,
                answer_utc_time: undefined,
            };
            var rows = [out];
            if (include_children) {
                _this.extra_answers.forEach(function (a) { return rows.push.apply(rows, a.to_row(include_children)); });
                if (_this.options)
                    _this.options.forEach(function (o) { return o.extra_answers.forEach(function (a) { return rows.push.apply(rows, a.to_row(include_children)); }); });
            }
            if ([types_1.AnswerType.UNKNOWN, types_1.AnswerType.NONE].findIndex(function (t) { return t === _this.type; }) !== -1)
                return include_children ? rows : out;
            if (_this.last_answer_utc_time)
                out.answer_utc_time = _this.last_answer_utc_time;
            if ([types_1.AnswerType.RADIO, types_1.AnswerType.SELECT].findIndex(function (t) { return t === _this.type; }) !== -1) {
                var selected = _this.options[_this.content];
                out.label = selected.label;
                out.content = selected.content;
                return include_children ? rows : out;
            }
            if (_this.type === types_1.AnswerType.CHECKBOX) {
                out.content = JSON.stringify(_this.content);
                var labels_1 = [];
                _this.options.forEach(function (o, i) {
                    if (_this.content.findIndex(function (x) { return x === i; }) !== -1)
                        labels_1.push(o.label || o.content);
                });
                out.label = JSON.stringify(labels_1);
                return include_children ? rows : out;
            }
            out.label = _this.label;
            out.content = _this.content;
            return include_children ? rows : out;
        };
        for (var k in props) {
            if (!(k in ["content"]))
                this[k] = props[k];
        }
        if (!(typeof id === "string") || id === "")
            throw "An Answer must have an id";
        this.id = id;
        if (props.id)
            this.data_id = props.id;
        if (typeof props.type === "undefined")
            throw "An Answer must specify a type";
        this.type = props.type;
        if (props.extra_answers)
            this.extra_answers = (0, exports.as_answers)(props.extra_answers, this.id);
        else
            this.extra_answers = [];
        if (props.options)
            this.options = (0, exports.as_options)(props.options, this.id);
        this.default_content = props.default_content;
        if (props.validators)
            this.validators = props.validators;
        else
            this.validators = [];
        if (props.to_row_fun)
            this.to_row_fun = props.to_row_fun;
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
        this.extra_answers.forEach(function (a) { return a.reset_content(); });
        if (this.options)
            this.options.forEach(function (o) { return o.extra_answers.forEach(function (a) { return a.reset_content(); }); });
    };
    Object.defineProperty(Answer.prototype, "content_changed", {
        get: function () {
            return this.content_history.length > 0;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Answer.prototype, "selected_option", {
        get: function () {
            if (this.type !== types_1.AnswerType.RADIO)
                console.warn("selected_option is always undefined for Answers of type ".concat((0, exports.get_type_name)(this.type)));
            if (typeof this.content !== "undefined") {
                return this.options[this.content];
            }
            return undefined;
        },
        enumerable: false,
        configurable: true
    });
    Answer.prototype.check_validation = function (current_item, state, include_children) {
        var _a, _b;
        var _this = this;
        var errors = [];
        current_item.validation_issues = current_item.validation_issues
            .filter(function (e) { return !("answer_id" in e) || e.answer_id !== _this.id; });
        state.validation_issues = state.validation_issues
            .filter(function (e) { return !("answer_id" in e) || e.answer_id !== _this.id; });
        this.validators.forEach(function (v) {
            var s = v(_this, current_item, state);
            if (s !== null)
                errors.push(s);
        });
        this.own_validation_issues = __spreadArray([], errors, true);
        (_a = current_item.validation_issues).push.apply(_a, errors);
        (_b = state.validation_issues).push.apply(_b, errors);
        this.extra_answers.forEach(function (a) { return errors.push.apply(errors, a.check_validation(current_item, state, include_children)); });
        if (this.options)
            this.options.forEach(function (o) { return o.extra_answers.forEach(function (a) { return errors.push.apply(errors, a.check_validation(current_item, state, include_children)); }); });
        this.validation_issues = errors;
        return include_children ? this.validation_issues : this.own_validation_issues;
    };
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
        else
            this.extra_answers = [];
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
var get_type_name = function (t) {
    switch (t) {
        case types_1.AnswerType.NONE: return "none";
        case types_1.AnswerType.TEXT: return "text";
        case types_1.AnswerType.NUMBER: return "number";
        case types_1.AnswerType.RADIO: return "radio";
        case types_1.AnswerType.SELECT: return "select";
        case types_1.AnswerType.CHECKBOX: return "checkbox";
        case types_1.AnswerType.DATE: return "date";
        case types_1.AnswerType.TIME: return "time";
    }
    return "unknown";
};
exports.get_type_name = get_type_name;
